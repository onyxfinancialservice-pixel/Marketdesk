# MarketDesk AI

Modern fintech trading dashboard with React, Supabase Auth/Postgres, a
technical indicator engine, live crypto market data, and the existing FastAPI
AI analysis engine.

## Deploy Target

This package is arranged for Netlify + Supabase without changing the UI,
charts, technical panels, or frontend behavior.

- Frontend: `frontend/`
- Netlify config: `netlify.toml`
- Netlify static redirects: `frontend/public/_redirects`
- Netlify API function: `netlify/functions/api.mjs`
- Supabase schema: `supabase/schema.sql`
- Local FastAPI backend reference: `backend/server.py`

Read `NETLIFY_SUPABASE_DEPLOY.md` before deploying.

## Netlify Environment Variables

Set these in Netlify Site settings:

```text
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

`EMERGENT_LLM_KEY` can be used instead of `ANTHROPIC_API_KEY` if it is
Anthropic-compatible in your environment. Leave `REACT_APP_BACKEND_URL` empty in
Netlify production so the app uses same-origin `/api/*`.

## Local Development

Backend:

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install --legacy-peer-deps
npm start
```

For local frontend development, set:

```text
REACT_APP_BACKEND_URL=http://localhost:8001
```

For Netlify production, no separate `BACKEND_PROXY_URL` is required.

## Supabase

Run `supabase/schema.sql` in Supabase SQL Editor. The schema creates the
settings, watchlists, alerts, and analysis history tables with RLS policies.

## Security

The anon key is public by design. Keep the LLM key server-side only. Never
prefix private keys with `REACT_APP_`. The service role key is not required for
this Netlify Functions version.
