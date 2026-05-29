const OKX = "https://www.okx.com";
const BINANCE = "https://api.binance.com";
const COINPAPRIKA = "https://api.coinpaprika.com/v1";
const COINGECKO = "https://api.coingecko.com/api/v3";
const TWELVE = "https://api.twelvedata.com";
const YAHOO = "https://query1.finance.yahoo.com";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const POPULAR_CRYPTO = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "LINKUSDT", "MATICUSDT",
  "DOTUSDT", "ARBUSDT", "OPUSDT", "INJUSDT", "SUIUSDT",
];
const POPULAR_FOREX = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURJPY"];
const POPULAR_INDICES = ["SPX", "NDX", "DJI", "IXIC", "RUT", "DAX", "FTSE", "N225"];
const FOREX_CODES = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "TRY", "CNH", "SEK", "NOK", "DKK", "MXN", "ZAR"]);
const INDEX_ALIASES = new Map([
  ["SPX", "SPX"],
  ["SP500", "SPX"],
  ["NDX", "NDX"],
  ["NASDAQ100", "NDX"],
  ["DJI", "DJI"],
  ["DOW", "DJI"],
  ["IXIC", "IXIC"],
  ["RUT", "RUT"],
  ["DAX", "DAX"],
  ["FTSE", "FTSE"],
  ["N225", "N225"],
]);

const getEnv = (name) => {
  if (globalThis.Netlify?.env?.get) {
    return globalThis.Netlify.env.get(name);
  }
  return process.env[name];
};

const json = (body, status = 200, request) => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
  if (request) {
    Object.assign(headers, corsHeaders(request));
  }
  return new Response(JSON.stringify(body), { status, headers });
};

const corsHeaders = (request) => ({
  "access-control-allow-origin": request.headers.get("origin") || "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": request.headers.get("access-control-request-headers") || "content-type,authorization",
  "access-control-max-age": "86400",
});

const withCors = (response, request) => {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const routePath = (request) => {
  const url = new URL(request.url);
  const path = url.pathname
    .replace(/^\/\.netlify\/functions\/api\/?/, "/")
    .replace(/^\/api\/?/, "/");
  return path === "" ? "/" : path;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const requestJson = async (request) => {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Invalid JSON body");
  }
};

const httpError = (status, detail) => {
  const error = new Error(detail);
  error.status = status;
  return error;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": "PBM/1.0",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw httpError(response.status, typeof body === "string" ? body : JSON.stringify(body));
  }
  return body;
};

const twelveKey = () => getEnv("TWELVE_DATA_API_KEY") || getEnv("TWELVEDATA_API_KEY");

const requireTwelveKey = () => {
  const key = twelveKey();
  if (!key) throw httpError(502, "TWELVE_DATA_API_KEY is missing from Netlify environment variables");
  return key;
};

const QUOTES = ["USDT", "USDC", "USD", "BTC", "ETH", "BNB", "EUR", "TRY", "BRL"];

const toOkxSymbol = (symbol) => {
  const clean = String(symbol || "").toUpperCase().replace(/-/g, "");
  for (const quote of QUOTES) {
    if (clean.endsWith(quote) && clean.length > quote.length) {
      return `${clean.slice(0, -quote.length)}-${quote}`;
    }
  }
  return clean;
};

const fromOkxSymbol = (instId) => String(instId || "").replace(/-/g, "");

const isForexSymbol = (symbol) => {
  const clean = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  return clean.length === 6 && FOREX_CODES.has(clean.slice(0, 3)) && FOREX_CODES.has(clean.slice(3, 6));
};

const isIndexSymbol = (symbol) => INDEX_ALIASES.has(String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));

const marketForSymbol = (symbol) => {
  if (isForexSymbol(symbol)) return "forex";
  if (isIndexSymbol(symbol)) return "index";
  return "crypto";
};

const marketList = (market) => {
  if (market === "forex") return POPULAR_FOREX;
  if (market === "index") return POPULAR_INDICES;
  return POPULAR_CRYPTO;
};

const toTwelveSymbol = (symbol) => {
  const raw = String(symbol || "").trim().toUpperCase();
  if (raw.includes("/")) return raw;
  const compact = raw.replace(/[^A-Z0-9]/g, "");
  if (INDEX_ALIASES.has(compact)) return INDEX_ALIASES.get(compact);
  if (isForexSymbol(compact)) return `${compact.slice(0, 3)}/${compact.slice(3, 6)}`;

  for (const quote of ["USDT", "USDC", "USD"]) {
    if (compact.endsWith(quote) && compact.length > quote.length) {
      return `${compact.slice(0, -quote.length)}/USD`;
    }
  }
  return compact;
};

const fromTwelveSymbol = (symbol, fallback) => {
  if (fallback) return String(fallback).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const YAHOO_INDEX_SYMBOLS = new Map([
  ["SPX", "^GSPC"],
  ["SP500", "^GSPC"],
  ["NDX", "^NDX"],
  ["NASDAQ100", "^NDX"],
  ["DJI", "^DJI"],
  ["DOW", "^DJI"],
  ["IXIC", "^IXIC"],
  ["RUT", "^RUT"],
  ["DAX", "^GDAXI"],
  ["FTSE", "^FTSE"],
  ["N225", "^N225"],
]);

const toYahooSymbol = (symbol) => {
  const compact = String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (YAHOO_INDEX_SYMBOLS.has(compact)) return YAHOO_INDEX_SYMBOLS.get(compact);
  if (isForexSymbol(compact)) return `${compact}=X`;
  for (const quote of ["USDT", "USDC", "USD"]) {
    if (compact.endsWith(quote) && compact.length > quote.length) {
      return `${compact.slice(0, -quote.length)}-USD`;
    }
  }
  return compact;
};

const fromYahooSymbol = (symbol, fallback) => {
  if (fallback) return String(fallback).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const raw = String(symbol || "").toUpperCase();
  const indexMatch = [...YAHOO_INDEX_SYMBOLS.entries()].find(([, yahoo]) => yahoo === raw);
  if (indexMatch) return indexMatch[0];
  if (raw.endsWith("=X")) return raw.replace("=X", "");
  return raw.replace("-USD", "USDT").replace(/[^A-Z0-9]/g, "");
};

const yahooQuoteToBinanceShape = (quote, fallbackSymbol) => {
  const last = Number(quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? 0);
  const open = Number(quote.regularMarketOpen ?? quote.regularMarketPreviousClose ?? last);
  const high = Number(quote.regularMarketDayHigh ?? last);
  const low = Number(quote.regularMarketDayLow ?? last);
  const volume = Number(quote.regularMarketVolume ?? 0);
  const changePct = Number(quote.regularMarketChangePercent ?? 0);
  return {
    symbol: fromYahooSymbol(quote.symbol, fallbackSymbol),
    lastPrice: String(last),
    openPrice: String(open),
    highPrice: String(high),
    lowPrice: String(low),
    volume: String(volume),
    quoteVolume: String(volume * last || volume || 0),
    priceChangePercent: String(changePct),
  };
};

const fetchYahooQuotes = async (symbols) => {
  const yahooSymbols = symbols.map(toYahooSymbol);
  const params = new URLSearchParams({ symbols: yahooSymbols.join(",") });
  let results = [];
  try {
    const body = await fetchJson(`${YAHOO}/v7/finance/quote?${params}`);
    results = body.quoteResponse?.result || [];
  } catch {
    results = [];
  }
  const primaryRows = symbols.map((symbol) => {
    const yahoo = toYahooSymbol(symbol);
    const quote = results.find((row) => row.symbol === yahoo);
    return quote ? yahooQuoteToBinanceShape(quote, symbol) : null;
  });
  const fallbackRows = await Promise.all(
    symbols.map((symbol, index) => primaryRows[index] ? null : fetchYahooChartQuote(symbol).catch(() => null))
  );
  return symbols.map((symbol, index) => primaryRows[index] || fallbackRows[index]).filter(Boolean);
};

const fetchYahooQuote = async (symbol) => {
  const rows = await fetchYahooQuotes([symbol]);
  if (!rows.length) throw httpError(404, "Yahoo symbol not found");
  return rows[0];
};

const yahooChartQuoteToBinanceShape = (body, fallbackSymbol) => {
  const result = body.chart?.result?.[0];
  if (!result) throw httpError(502, body.chart?.error?.description || "Yahoo chart error");
  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const closes = (quote.close || []).filter((value) => value != null && !Number.isNaN(Number(value))).map(Number);
  const highs = (quote.high || []).filter((value) => value != null && !Number.isNaN(Number(value))).map(Number);
  const lows = (quote.low || []).filter((value) => value != null && !Number.isNaN(Number(value))).map(Number);
  const volumes = (quote.volume || []).filter((value) => value != null && !Number.isNaN(Number(value))).map(Number);
  const last = Number(meta.regularMarketPrice ?? closes.at(-1) ?? 0);
  const open = Number(meta.chartPreviousClose ?? closes.at(-2) ?? last);
  const high = Number(meta.regularMarketDayHigh ?? highs.at(-1) ?? Math.max(last, open));
  const low = Number(meta.regularMarketDayLow ?? lows.at(-1) ?? Math.min(last, open));
  const volume = Number(meta.regularMarketVolume ?? volumes.at(-1) ?? 0);
  const changePct = open ? ((last - open) / open) * 100 : 0;
  return {
    symbol: fromYahooSymbol(meta.symbol, fallbackSymbol),
    lastPrice: String(last),
    openPrice: String(open),
    highPrice: String(high),
    lowPrice: String(low),
    volume: String(volume),
    quoteVolume: String(volume * last || volume || 0),
    priceChangePercent: String(changePct),
  };
};

const fetchYahooChartQuote = async (symbol) => {
  const params = new URLSearchParams({ range: "5d", interval: "1d" });
  const body = await fetchJson(`${YAHOO}/v8/finance/chart/${encodeURIComponent(toYahooSymbol(symbol))}?${params}`);
  return yahooChartQuoteToBinanceShape(body, symbol);
};

const yahooRangeForInterval = (interval) => {
  const tf = String(interval || "1h").toLowerCase();
  if (tf === "1m") return "7d";
  if (tf.endsWith("m")) return "60d";
  if (tf.endsWith("h")) return "730d";
  if (tf === "1w") return "5y";
  if (tf === "1mo") return "5y";
  return "5y";
};

const mapYahooInterval = (interval) => {
  const tf = String(interval || "1h").toLowerCase();
  return (
    {
      "1m": "1m",
      "3m": "5m",
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "1h",
      "2h": "1h",
      "4h": "1h",
      "1d": "1d",
      "1w": "1wk",
      "1mo": "1mo",
    }[tf] || "1h"
  );
};

const fetchYahooKlines = async (symbol, interval, limit) => {
  const params = new URLSearchParams({
    range: yahooRangeForInterval(interval),
    interval: mapYahooInterval(interval),
  });
  const body = await fetchJson(`${YAHOO}/v8/finance/chart/${encodeURIComponent(toYahooSymbol(symbol))}?${params}`);
  const result = body.chart?.result?.[0];
  if (!result) throw httpError(502, body.chart?.error?.description || "Yahoo chart error");
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const rows = timestamps.map((ts, idx) => {
    const open = quote.open?.[idx];
    const high = quote.high?.[idx];
    const low = quote.low?.[idx];
    const close = quote.close?.[idx];
    if ([open, high, low, close].some((value) => value == null || Number.isNaN(Number(value)))) return null;
    const t = Number(ts) * 1000;
    const volume = quote.volume?.[idx] || 0;
    return [t, String(open), String(high), String(low), String(close), String(volume), t, String(volume * close || 0), 0];
  }).filter(Boolean);
  return rows.slice(-clamp(Number(limit || 300), 1, 300));
};

const mapOkxInterval = (timeframe) => {
  const tf = String(timeframe || "1h").toLowerCase();
  return (
    {
      "1m": "1m",
      "3m": "3m",
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "1H",
      "2h": "2H",
      "4h": "4H",
      "6h": "6H",
      "12h": "12H",
      "1d": "1D",
      "1w": "1W",
      "1mo": "1M",
    }[tf] || "1H"
  );
};

const mapTwelveInterval = (timeframe) => {
  const tf = String(timeframe || "1h").toLowerCase();
  return (
    {
      "1m": "1min",
      "3m": "5min",
      "5m": "5min",
      "15m": "15min",
      "30m": "30min",
      "1h": "1h",
      "2h": "2h",
      "4h": "4h",
      "1d": "1day",
      "1w": "1week",
      "1mo": "1month",
    }[tf] || "1h"
  );
};

const okxTickerToBinanceShape = (ticker) => {
  const last = Number(ticker.last || 0);
  const open24 = Number(ticker.open24h || 0);
  const changePct = open24 ? ((last - open24) / open24) * 100 : 0;
  return {
    symbol: fromOkxSymbol(ticker.instId),
    lastPrice: String(last),
    openPrice: String(open24),
    highPrice: String(ticker.high24h || 0),
    lowPrice: String(ticker.low24h || 0),
    volume: String(ticker.vol24h || 0),
    quoteVolume: String(ticker.volCcy24h || 0),
    priceChangePercent: changePct.toFixed(4),
  };
};

const binanceTickerToBinanceShape = (ticker) => ({
  symbol: ticker.symbol,
  lastPrice: String(ticker.lastPrice || 0),
  openPrice: String(ticker.openPrice || 0),
  highPrice: String(ticker.highPrice || 0),
  lowPrice: String(ticker.lowPrice || 0),
  volume: String(ticker.volume || 0),
  quoteVolume: String(ticker.quoteVolume || 0),
  priceChangePercent: String(ticker.priceChangePercent || 0),
});

const twelveQuoteToBinanceShape = (quote, fallbackSymbol) => {
  if (!quote || quote.status === "error") {
    throw httpError(502, quote?.message || "Twelve Data quote error");
  }
  const close = Number(quote.close ?? quote.price ?? 0);
  const open = Number(quote.open ?? quote.previous_close ?? close);
  const volume = Number(quote.volume ?? quote.average_volume ?? 0);
  return {
    symbol: fromTwelveSymbol(quote.symbol, fallbackSymbol),
    lastPrice: String(close),
    openPrice: String(open),
    highPrice: String(quote.high ?? close),
    lowPrice: String(quote.low ?? close),
    volume: String(volume),
    quoteVolume: String(volume * close || volume || 0),
    priceChangePercent: String(quote.percent_change ?? 0),
  };
};

const fetchTwelveQuote = async (symbol) => {
  const params = new URLSearchParams({
    symbol: toTwelveSymbol(symbol),
    apikey: requireTwelveKey(),
  });
  return twelveQuoteToBinanceShape(await fetchJson(`${TWELVE}/quote?${params}`), symbol);
};

const fetchTwelvePopularTickers = async () => {
  const params = new URLSearchParams({
    symbol: POPULAR_CRYPTO.map(toTwelveSymbol).join(","),
    apikey: requireTwelveKey(),
  });
  const body = await fetchJson(`${TWELVE}/quote?${params}`);
  if (!body || body.status === "error") throw httpError(502, body?.message || "Twelve Data quote error");
  return POPULAR_CRYPTO.map((symbol) => {
    const quote = body[toTwelveSymbol(symbol)];
    return quote ? twelveQuoteToBinanceShape(quote, symbol) : null;
  }).filter(Boolean);
};

const fetchTwelveKlines = async (symbol, interval, limit) => {
  const params = new URLSearchParams({
    symbol: toTwelveSymbol(symbol),
    interval: mapTwelveInterval(interval),
    outputsize: String(clamp(Number(limit || 300), 1, 5000)),
    apikey: requireTwelveKey(),
  });
  const body = await fetchJson(`${TWELVE}/time_series?${params}`);
  if (!body || body.status === "error") throw httpError(502, body?.message || "Twelve Data time_series error");
  return [...(body.values || [])].reverse().map((row) => {
    const t = new Date(`${row.datetime}Z`).getTime();
    return [t, row.open, row.high, row.low, row.close, row.volume || "0", t, "0", 0];
  });
};

const marketKlines = async (url) => {
  const symbol = url.searchParams.get("symbol");
  if (!symbol) throw httpError(400, "symbol is required");
  const interval = url.searchParams.get("interval") || "1h";
  const limit = clamp(Number(url.searchParams.get("limit") || 300), 1, 300);
  try {
    return await fetchYahooKlines(symbol, interval, limit);
  } catch {
    // Keep exchange/API fallbacks so the chart still has a route if Yahoo is unavailable.
  }
  if (marketForSymbol(symbol) !== "crypto") {
    return fetchTwelveKlines(symbol, interval, limit);
  }
  const params = new URLSearchParams({
    instId: toOkxSymbol(symbol),
    bar: mapOkxInterval(interval),
    limit: String(limit),
  });
  try {
    const body = await fetchJson(`${OKX}/api/v5/market/candles?${params}`);
    if (String(body.code) !== "0") {
      throw httpError(400, body.msg || "OKX error");
    }
    return [...(body.data || [])].reverse().map((k) => {
      const t = Number(k[0]);
      return [t, k[1], k[2], k[3], k[4], k[5], t, k[7] || "0", 0];
    });
  } catch (okxError) {
    try {
      const binanceParams = new URLSearchParams({
        symbol: String(symbol).toUpperCase(),
        interval,
        limit: String(limit),
      });
      return await fetchJson(`${BINANCE}/api/v3/klines?${binanceParams}`);
    } catch {
      try {
        return await fetchYahooKlines(symbol, interval, limit);
      } catch {
        return fetchTwelveKlines(symbol, interval, limit);
      }
    }
  }
};

const marketTicker24h = async (url) => {
  const symbol = url.searchParams.get("symbol");
  const market = url.searchParams.get("market") || "crypto";
  if (symbol) {
    try {
      return await fetchYahooQuote(symbol);
    } catch {
      // Fall through to exchange/Twelve fallbacks.
    }
    if (marketForSymbol(symbol) !== "crypto") {
      return fetchTwelveQuote(symbol);
    }
    try {
      const params = new URLSearchParams({ instId: toOkxSymbol(symbol) });
      const body = await fetchJson(`${OKX}/api/v5/market/ticker?${params}`);
      const data = body.data || [];
      if (!data.length) throw httpError(404, "Symbol not found");
      return okxTickerToBinanceShape(data[0]);
    } catch {
      try {
        const data = await fetchJson(`${BINANCE}/api/v3/ticker/24hr?${new URLSearchParams({ symbol: String(symbol).toUpperCase() })}`);
        return binanceTickerToBinanceShape(data);
      } catch {
        try {
          return await fetchYahooQuote(symbol);
        } catch {
          return fetchTwelveQuote(symbol);
        }
      }
    }
  }
  const preferredSymbols = marketList(market);
  try {
    const rows = await fetchYahooQuotes(preferredSymbols);
    if (rows.length) return rows;
  } catch {
    // Keep the selected market cards populated through the fallbacks below.
  }
  if (market === "forex" || market === "index") {
    const rows = await Promise.all(preferredSymbols.map((item) => fetchTwelveQuote(item).catch(() => null)));
    return rows.filter(Boolean);
  }
  try {
    const body = await fetchJson(`${OKX}/api/v5/market/tickers?instType=SPOT`);
    const rows = (body.data || [])
      .map(okxTickerToBinanceShape)
      .filter((row) => preferredSymbols.includes(row.symbol));
    if (rows.length) return rows;
    return await fetchYahooQuotes(preferredSymbols);
  } catch {
    try {
      const rows = await Promise.all(preferredSymbols.map(async (item) => {
        const data = await fetchJson(`${BINANCE}/api/v3/ticker/24hr?${new URLSearchParams({ symbol: item })}`);
        return binanceTickerToBinanceShape(data);
      }));
      return rows.filter(Boolean);
    } catch {
      try {
        return await fetchYahooQuotes(preferredSymbols);
      } catch {
        return fetchTwelvePopularTickers();
      }
    }
  }
};

const marketGlobal = async () => {
  try {
    const data = await fetchJson(`${COINPAPRIKA}/global`);
    return {
      total_market_cap: { usd: data.market_cap_usd },
      total_volume: { usd: data.volume_24h_usd },
      market_cap_percentage: {
        btc: data.bitcoin_dominance_percentage,
        eth: data.ethereum_dominance_percentage,
      },
      market_cap_change_percentage_24h_usd: data.market_cap_change_24h,
      active_cryptocurrencies: data.cryptocurrencies_number,
      markets: data.markets_number,
    };
  } catch {
    const data = await fetchJson(`${COINGECKO}/global`);
    const global = data.data || {};
    return {
      total_market_cap: { usd: global.total_market_cap?.usd },
      total_volume: { usd: global.total_volume?.usd },
      market_cap_percentage: {
        btc: global.market_cap_percentage?.btc,
        eth: global.market_cap_percentage?.eth,
      },
      market_cap_change_percentage_24h_usd: global.market_cap_change_percentage_24h_usd,
      active_cryptocurrencies: global.active_cryptocurrencies,
      markets: global.markets,
    };
  }
};

const marketSearch = async (url) => {
  const q = url.searchParams.get("q");
  if (!q) throw httpError(400, "q is required");
  try {
    return await fetchJson(`${COINGECKO}/search?${new URLSearchParams({ query: q })}`);
  } catch {
    return { coins: [] };
  }
};

const technicalScoreFromIndicators = (ind = {}, price = 0) => {
  let score = 0;
  let weight = 0;

  if (ind.rsi != null) {
    weight += 1;
    if (ind.rsi < 30) score += 80;
    else if (ind.rsi > 70) score -= 80;
    else score += (50 - Number(ind.rsi)) * -2;
  }

  if (ind.macd != null && ind.macd_signal != null) {
    weight += 1;
    score += clamp((Number(ind.macd) - Number(ind.macd_signal)) * 200, -60, 60);
  }

  if (ind.ema20 != null && ind.ema50 != null) {
    weight += 1;
    score += Number(ind.ema20) > Number(ind.ema50) ? 40 : -40;
  }

  if (ind.ema50 != null && ind.ema200 != null) {
    weight += 1;
    score += Number(ind.ema50) > Number(ind.ema200) ? 30 : -30;
  }

  if (ind.bb_upper != null && ind.bb_lower != null) {
    weight += 1;
    if (price > Number(ind.bb_upper)) score -= 30;
    else if (price < Number(ind.bb_lower)) score += 30;
  }

  if (ind.adx != null && Number(ind.adx) > 25) {
    score *= 1.1;
  }

  return weight === 0 ? 0 : clamp((score / Math.max(weight, 1)) * 1.2, -100, 100);
};

const verdictFromScore = (score) => {
  if (score >= 60) return "strong_buy";
  if (score >= 25) return "buy";
  if (score <= -60) return "strong_sell";
  if (score <= -25) return "sell";
  return "neutral";
};

const buildSystemPrompt = (market) =>
  [
    `You are PBM AI, a senior quantitative analyst specializing in ${market} markets.`,
    "You explain technical setups crisply and never give blanket financial advice.",
    "You consider RSI, MACD, EMAs, Bollinger Bands, ADX, ATR, volume, and recent price action together.",
    "You MUST respond with ONLY valid JSON, no markdown fences, no prose outside JSON.",
    'Schema strictly: {"verdict":"strong_buy|buy|neutral|sell|strong_sell","confidence":0..1,"summary":"2-3 sentence executive summary","trend":"uptrend|downtrend|sideways","short_term_outlook":"1-2 sentences about next few hours/days","medium_term_outlook":"1-2 sentences about next 1-4 weeks","patterns":[{"name":"string","direction":"bullish|bearish|neutral","confidence":0..1,"description":"short"}],"key_levels":{"support":[num,num],"resistance":[num,num]},"risk_notes":"1-2 sentences about invalidation / risk"}',
  ].join(" ");

const buildUserPrompt = (req, techScore) => {
  const indicators = Object.fromEntries(
    Object.entries(req.indicators || {}).filter(([, value]) => value !== null && value !== undefined)
  );
  const candles = (req.candles || []).slice(-30).map((c) =>
    [
      c.t,
      Number(c.o).toFixed(4),
      Number(c.h).toFixed(4),
      Number(c.l).toFixed(4),
      Number(c.c).toFixed(4),
      Number(c.v).toFixed(2),
    ].join(",")
  );
  return [
    `Symbol: ${req.symbol} (${req.market || "crypto"}) | timeframe: ${req.timeframe || "1h"}`,
    `Current price: ${req.current_price}`,
    `24h change: ${req.change_24h ?? null}`,
    `Heuristic composite tech score (engine pre-compute, range -100..100): ${techScore.toFixed(1)}`,
    `Indicators: ${JSON.stringify(indicators)}`,
    `Last ${candles.length} candles (t,o,h,l,c,v):`,
    candles.join("\n"),
    req.user_context ? `User note: ${req.user_context}` : "",
    "Return ONLY the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
};

const parseAiJson = (raw) => {
  const text = String(raw || "").trim();
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate || !candidate.startsWith("{")) {
    throw new Error(`No JSON object in AI response: ${text.slice(0, 200)}`);
  }
  return JSON.parse(candidate);
};

const callClaude = async (systemPrompt, userText) => {
  const apiKey = getEnv("ANTHROPIC_API_KEY") || getEnv("EMERGENT_LLM_KEY");
  if (!apiKey) {
    throw httpError(502, "ANTHROPIC_API_KEY or EMERGENT_LLM_KEY is missing from Netlify environment variables");
  }

  const baseUrl = (getEnv("ANTHROPIC_BASE_URL") || "https://api.anthropic.com").replace(/\/+$/, "");
  const model = getEnv("CLAUDE_MODEL") || DEFAULT_CLAUDE_MODEL;
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, body?.error?.message || JSON.stringify(body));
  }

  const firstText = (body.content || []).find((part) => part.type === "text")?.text;
  if (!firstText) {
    throw httpError(502, "Claude returned an empty response");
  }
  return firstText;
};

const analyze = async (request) => {
  const req = await requestJson(request);
  if (!req.symbol) throw httpError(400, "symbol is required");
  if (req.current_price == null) throw httpError(400, "current_price is required");

  const techScore = technicalScoreFromIndicators(req.indicators, Number(req.current_price));
  const raw = await callClaude(buildSystemPrompt(req.market || "crypto"), buildUserPrompt(req, techScore));
  const data = parseAiJson(raw);

  const verdictMap = {
    strong_buy: 80,
    buy: 40,
    neutral: 0,
    sell: -40,
    strong_sell: -80,
  };
  const aiVerdict = data.verdict || "neutral";
  const confidence = Number(data.confidence ?? 0.65);
  const aiScore = (verdictMap[aiVerdict] ?? 0) * confidence;
  const combinedScore = techScore * 0.45 + aiScore * 0.55;

  const keyLevels = typeof data.key_levels === "object" && data.key_levels ? data.key_levels : {};
  keyLevels.support ||= [];
  keyLevels.resistance ||= [];

  return {
    id: crypto.randomUUID(),
    symbol: req.symbol,
    verdict: verdictFromScore(combinedScore),
    confidence,
    summary: String(data.summary || "").slice(0, 600),
    trend: data.trend || "sideways",
    short_term_outlook: String(data.short_term_outlook || "").slice(0, 400),
    medium_term_outlook: String(data.medium_term_outlook || "").slice(0, 400),
    patterns: (data.patterns || []).slice(0, 6).map((pattern) => ({
      name: String(pattern.name || "pattern").slice(0, 80),
      direction: pattern.direction || "neutral",
      confidence: Number(pattern.confidence ?? 0.5),
      description: String(pattern.description || "").slice(0, 300),
    })),
    key_levels: keyLevels,
    risk_notes: String(data.risk_notes || "").slice(0, 400),
    technical_score: Number(techScore.toFixed(2)),
    ai_score: Number(aiScore.toFixed(2)),
    combined_score: Number(combinedScore.toFixed(2)),
  };
};

const chat = async (request) => {
  const req = await requestJson(request);
  if (!req.session_id) throw httpError(400, "session_id is required");
  if (!req.message) throw httpError(400, "message is required");
  const system = [
    "You are PBM AI, a concise quantitative trading copilot.",
    "Answer in the user's language. Keep replies under 200 words unless a chart or list helps.",
    "Never fabricate exact prices you don't have; use the provided context.",
    "Always remind that this is not financial advice when giving directional opinions.",
  ].join(" ");
  const context = req.context ? `\nContext: ${JSON.stringify(req.context).slice(0, 1500)}` : "";
  const symbol = req.symbol ? `\nSymbol: ${req.symbol}` : "";
  const reply = await callClaude(system, `${req.message}${symbol}${context}`);
  return { session_id: req.session_id, reply: reply.trim() };
};

const routeBrainExpert = (question = "", profile = {}) => {
  const text = `${question} ${JSON.stringify(profile).slice(0, 800)}`.toLowerCase();
  if (/(payout|funded|drawdown|loss limit|risk|rr|stop|sizing)/.test(text)) {
    return { router_topic: "risk", expert: "Risk / Drawdown Expert" };
  }
  if (/(journal|mistake|psychology|discipline|fomo|revenge|habit)/.test(text)) {
    return { router_topic: "journal", expert: "Journal Coach" };
  }
  if (/(education|lesson|video|learn|course|training)/.test(text)) {
    return { router_topic: "education", expert: "Education Expert" };
  }
  if (/(social|position|screenshot|setup|entry|exit|trade)/.test(text)) {
    return { router_topic: "setup", expert: "Setup Quality Expert" };
  }
  if (/(forex|eurusd|gbpusd|usdjpy|indices|spx|nasdaq|crypto|btc|eth)/.test(text)) {
    return { router_topic: "market", expert: "Market Regime Expert" };
  }
  return { router_topic: "router", expert: "PBM Router Head" };
};

const summarizeBrainData = (req) => {
  const journal = Array.isArray(req.journal) ? req.journal : [];
  const analyses = Array.isArray(req.analyses) ? req.analyses : [];
  const socialPosts = Array.isArray(req.social_posts) ? req.social_posts : [];
  const payouts = Array.isArray(req.payout_accounts) ? req.payout_accounts : [];
  const memories = Array.isArray(req.memories) ? req.memories : [];
  const pnlRows = journal
    .map((entry) => Number(entry.pnl))
    .filter((value) => Number.isFinite(value));
  const wins = pnlRows.filter((value) => value > 0).length;
  const totalPnl = pnlRows.reduce((sum, value) => sum + value, 0);
  const losses = pnlRows.filter((value) => value < 0);
  const symbols = [...new Set(journal.map((entry) => entry.symbol).filter(Boolean))].slice(0, 8);
  return {
    journal_count: journal.length,
    analysis_count: analyses.length,
    social_post_count: socialPosts.length,
    payout_account_count: payouts.length,
    memory_count: memories.length,
    total_pnl: Number(totalPnl.toFixed(2)),
    win_rate: pnlRows.length ? Number(((wins / pnlRows.length) * 100).toFixed(1)) : null,
    average_pnl: pnlRows.length ? Number((totalPnl / pnlRows.length).toFixed(2)) : null,
    loss_count: losses.length,
    symbols,
  };
};

const scoreBrainProfile = (profile) => {
  let score = 50;
  if (profile.journal_count >= 20) score += 12;
  else if (profile.journal_count >= 5) score += 6;
  else score -= 8;
  if (profile.win_rate != null) score += clamp((profile.win_rate - 50) * 0.45, -15, 15);
  if (profile.total_pnl > 0) score += 8;
  if (profile.total_pnl < 0) score -= 8;
  if (profile.memory_count > 0) score += 4;
  if (profile.social_post_count > 0) score += 3;
  return Math.round(clamp(score, 0, 100));
};

const brainFallback = (req, profile, route) => {
  const setupScore = scoreBrainProfile(profile);
  const recommendations = [];
  const risks = [];

  if (profile.journal_count < 10) {
    recommendations.push("Feed PBM Brain with at least 10-20 journal entries before trusting pattern-level conclusions.");
  } else {
    recommendations.push("Segment your next review by symbol and session so the strongest and weakest setups become visible.");
  }
  if (profile.win_rate != null && profile.win_rate < 45) {
    recommendations.push("Tag losing trades by mistake type: early entry, no confirmation, stop too tight, or news volatility.");
    risks.push("Recent journal data suggests execution quality is not stable enough for aggressive sizing.");
  }
  if (profile.total_pnl < 0) {
    recommendations.push("Run a drawdown review before adding new risk; focus on loss clusters, not single trades.");
  }
  if (profile.social_post_count > 0) {
    recommendations.push("Use your posted position screenshots as setup examples and attach outcome labels after the trade closes.");
  }
  if (!recommendations.length) {
    recommendations.push("Keep adding structured journal records; PBM Brain will become more personal as the memory grows.");
  }
  if (profile.journal_count < 5) risks.push("Low sample size: this is a coaching read, not a statistical model yet.");
  if (!risks.length) risks.push("Model risk remains high because live market regimes can change faster than the stored sample.");

  return {
    router_topic: route.router_topic,
    expert: route.expert,
    setup_score: setupScore,
    confidence: profile.journal_count >= 20 ? 0.72 : profile.journal_count >= 5 ? 0.58 : 0.42,
    summary: `${route.expert} reviewed ${profile.journal_count} journal entries, ${profile.analysis_count} AI analyses, and ${profile.social_post_count} position posts. The current PBM Brain score is ${setupScore}/100; treat it as a learning score until more labeled outcomes are stored.`,
    recommendations: recommendations.slice(0, 5),
    risks: risks.slice(0, 4),
    next_memory: "Add entry/exit, timeframe, setup label, and final outcome to each posted position so PBM Brain can learn your real edge.",
  };
};

const brainPrompt = (req, profile, route) => [
  "You are PBM Brain: an app-level Mixture-of-Experts router for a trader workspace.",
  `Router selected: ${route.expert} (${route.router_topic}).`,
  "Use the user's journal, social position posts, payout accounts, analysis history, and memories.",
  "Do not claim to be a trained LoRA/CNN model yet; this is the first learning loop.",
  "Give practical coaching and data-quality next steps. No financial advice.",
  'Return ONLY JSON with schema: {"router_topic":"string","expert":"string","setup_score":0..100,"confidence":0..1,"summary":"short","recommendations":["string"],"risks":["string"],"next_memory":"string"}',
  `Question: ${req.question || "Review my trading profile."}`,
  `Profile: ${JSON.stringify(profile)}`,
  `Recent journal: ${JSON.stringify((req.journal || []).slice(0, 20)).slice(0, 5000)}`,
  `Recent analyses: ${JSON.stringify((req.analyses || []).slice(0, 12)).slice(0, 3000)}`,
  `Recent social posts: ${JSON.stringify((req.social_posts || []).slice(0, 12)).slice(0, 2500)}`,
  `Payout accounts: ${JSON.stringify((req.payout_accounts || []).slice(0, 12)).slice(0, 2500)}`,
  `Memories: ${JSON.stringify((req.memories || []).slice(0, 12)).slice(0, 2500)}`,
].join("\n");

const brainAnalyze = async (request) => {
  const req = await requestJson(request);
  const profile = summarizeBrainData(req);
  const route = routeBrainExpert(req.question, profile);
  const apiKey = getEnv("ANTHROPIC_API_KEY") || getEnv("EMERGENT_LLM_KEY");
  let data = brainFallback(req, profile, route);

  if (apiKey) {
    try {
      const raw = await callClaude("You are PBM Brain. Return only valid JSON.", brainPrompt(req, profile, route));
      const parsed = parseAiJson(raw);
      data = {
        ...data,
        ...parsed,
        router_topic: parsed.router_topic || route.router_topic,
        expert: parsed.expert || route.expert,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 6) : data.recommendations,
        risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : data.risks,
        setup_score: clamp(Number(parsed.setup_score ?? data.setup_score), 0, 100),
        confidence: clamp(Number(parsed.confidence ?? data.confidence), 0, 1),
      };
    } catch {
      data = brainFallback(req, profile, route);
    }
  }

  return {
    id: crypto.randomUUID(),
    mode: apiKey ? "expert-router-ai" : "expert-router-fallback",
    profile,
    ...data,
  };
};

const handle = async (request) => {
  const url = new URL(request.url);
  const path = routePath(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method === "GET" && path === "/health") {
    return json({ status: "ok", service: "pbm-ai", runtime: "netlify-functions", model: DEFAULT_CLAUDE_MODEL }, 200, request);
  }
  if (request.method === "GET" && path === "/market/klines") return json(await marketKlines(url), 200, request);
  if (request.method === "GET" && path === "/market/ticker24h") return json(await marketTicker24h(url), 200, request);
  if (request.method === "GET" && path === "/market/global") return json(await marketGlobal(), 200, request);
  if (request.method === "GET" && path === "/market/search") return json(await marketSearch(url), 200, request);
  if (request.method === "POST" && path === "/analyze") return json(await analyze(request), 200, request);
  if (request.method === "POST" && path === "/chat") return json(await chat(request), 200, request);
  if (request.method === "POST" && path === "/brain/analyze") return json(await brainAnalyze(request), 200, request);

  return json({ detail: "Not found" }, 404, request);
};

export async function handler(event) {
  const protocol = event.headers?.["x-forwarded-proto"] || "https";
  const host = event.headers?.host || "localhost";
  const rawUrl = event.rawUrl || `${protocol}://${host}${event.path || "/"}`;
  const request = new Request(rawUrl, {
    method: event.httpMethod || event.requestContext?.http?.method || "GET",
    headers: event.headers || {},
    body: event.body
      ? (event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body)
      : undefined,
  });

  const response = await (async () => {
    try {
      return withCors(await handle(request), request);
    } catch (error) {
      return json({ detail: error.message || "Internal server error" }, error.status || 500, request);
    }
  })();

  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}
