import React, { useEffect, useState } from "react";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getMarketType } from "@/lib/market";
import { fmtDate } from "@/lib/format";

const BIASES = ["bullish", "bearish", "neutral"];

const cleanSymbol = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const safeFileName = (name) =>
  String(name || "position.png")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80) || "position.png";

export default function SocialPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    symbol: "BTCUSDT",
    timeframe: "1h",
    bias: "neutral",
    confidence: "",
    summary: "",
  });

  const reload = async () => {
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const createPost = async (event) => {
    event.preventDefault();
    setError("");
    const symbol = cleanSymbol(form.symbol);
    if (!symbol || !file) {
      setError("Symbol and image are required.");
      return;
    }

    setSaving(true);
    const imagePath = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
    const upload = await supabase.storage.from("social-images").upload(imagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (upload.error) {
      setSaving(false);
      setError(upload.error.message);
      return;
    }

    const { data: publicData } = supabase.storage.from("social-images").getPublicUrl(imagePath);
    const { error: insertError } = await supabase.from("social_posts").insert({
      user_id: user.id,
      author_email: user.email,
      symbol,
      market: getMarketType(symbol),
      timeframe: form.timeframe.trim() || "1h",
      bias: form.bias,
      confidence: form.confidence === "" ? null : Number(form.confidence),
      summary: form.summary.trim(),
      image_url: publicData.publicUrl,
      image_path: imagePath,
    });

    if (insertError) {
      await supabase.storage.from("social-images").remove([imagePath]);
      setError(insertError.message);
    } else {
      setFile(null);
      setForm({ symbol: "BTCUSDT", timeframe: "1h", bias: "neutral", confidence: "", summary: "" });
      await reload();
    }
    setSaving(false);
  };

  const deletePost = async (post) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("social_posts").delete().eq("id", post.id);
    if (post.image_path) await supabase.storage.from("social-images").remove([post.image_path]);
    setPosts((items) => items.filter((item) => item.id !== post.id));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-[0.1em] uppercase font-semibold text-zinc-500">Community</div>
        <h1 className="text-4xl font-heading font-extrabold tracking-tight text-zinc-950 mt-1">Social</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Shared position snapshots from PBM traders.</p>
      </div>

      <div className="grid xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 text-[11px] tracking-[0.1em] uppercase font-semibold text-zinc-500">
            New post
          </div>
          <form onSubmit={createPost} className="p-5 space-y-3" data-testid="social-post-form">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.symbol}
                onChange={(event) => setForm({ ...form, symbol: event.target.value })}
                placeholder="Symbol"
                className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <input
                value={form.timeframe}
                onChange={(event) => setForm({ ...form, timeframe: event.target.value })}
                placeholder="Timeframe"
                className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.bias}
                onChange={(event) => setForm({ ...form, bias: event.target.value })}
                className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                {BIASES.map((bias) => (
                  <option key={bias} value={bias}>{bias}</option>
                ))}
              </select>
              <input
                value={form.confidence}
                onChange={(event) => setForm({ ...form, confidence: event.target.value })}
                type="number"
                step="any"
                min="-100"
                max="100"
                placeholder="Score"
                className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <textarea
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              rows={4}
              placeholder="Summary"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
            />
            <label className="flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-zinc-300 rounded-md text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer">
              <ImagePlus className="w-4 h-4" strokeWidth={1.75} />
              <span className="truncate">{file ? file.name : "Add position image"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            {error && <div className="text-xs text-rose-600">{error}</div>}
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-zinc-950 text-white rounded-md text-sm font-medium h-10 hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" strokeWidth={1.75} />
              Share
            </button>
          </form>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 text-[11px] tracking-[0.1em] uppercase font-semibold text-zinc-500">
            Feed
          </div>
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-400">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-400">No posts yet.</div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4 p-5">
              {posts.map((post) => (
                <article key={post.id} className="border border-zinc-200 rounded-lg overflow-hidden bg-white" data-testid={`social-post-${post.symbol}`}>
                  <div className="aspect-video bg-zinc-50 border-b border-zinc-100 overflow-hidden">
                    <img src={post.image_url} alt={post.symbol} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold tabular-nums text-zinc-950">{post.symbol}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {post.timeframe} / {post.author_email || "Trader"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${biasClass(post.bias)}`}>
                          {post.bias}
                        </span>
                        {post.user_id === user.id && (
                          <button onClick={() => deletePost(post)} className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors" aria-label="Delete post">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {post.confidence != null && (
                      <div className="mt-3 text-sm tabular-nums text-zinc-700">
                        Score: <span className="font-semibold text-zinc-950">{Number(post.confidence).toFixed(0)}</span>
                      </div>
                    )}
                    {post.summary && <p className="text-sm text-zinc-700 leading-relaxed mt-3">{post.summary}</p>}
                    <div className="text-xs text-zinc-400 tabular-nums mt-4">{fmtDate(post.created_at)}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function biasClass(bias) {
  if (bias === "bullish") return "bg-emerald-100 text-emerald-700";
  if (bias === "bearish") return "bg-rose-100 text-rose-700";
  return "bg-zinc-100 text-zinc-700";
}
