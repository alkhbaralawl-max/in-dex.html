import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const BUCKET = "ota-admin";
const COOKIE = "__Host-rw_session";
const enc = new TextEncoder();
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "https://alkhbaralawl-max.github.io",
  "https://rukn-algharb-control-private.vercel.app",
  "https://rukn-algharb-main.vercel.app",
  "https://rukn-algharb-admin.vercel.app"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin);
  return {
    "access-control-allow-origin": allowed ? origin : "null",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,apikey",
    "access-control-allow-methods": "POST,OPTIONS",
    "vary": "Origin",
    "cache-control": "no-store",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  };
}
function reply(req: Request, data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req), "content-type": "application/json; charset=utf-8" }
  });
}
function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function readCookie(req: Request) {
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const p = part.trim(), index = p.indexOf("=");
    if (index > 0 && p.slice(0, index) === COOKIE) {
      try { return decodeURIComponent(p.slice(index + 1)); } catch { return null; }
    }
  }
  return null;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
async function authenticateAdmin(db: ReturnType<typeof serviceClient>, req: Request) {
  const token = readCookie(req);
  if (!token) return false;
  const pepper = Deno.env.get("SESSION_PEPPER") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (pepper.length < 32) throw new Error("session_pepper_missing");
  const tokenHash = await sha256(pepper + ":" + token);
  const { data: session, error: sessionError } = await db.from("app_sessions")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError || !session) return false;
  const { data: user, error: userError } = await db.from("app_users")
    .select("id,role,status")
    .eq("id", session.user_id)
    .maybeSingle();
  return !userError && !!user && user.status === "active" && user.role === "admin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return reply(req, { error: "origin_not_allowed" }, 403);

  try {
    const body = await req.json();
    if (!body || body.action !== "admin_manifest") return reply(req, { error: "invalid_action" }, 400);

    const db = serviceClient();
    if (!await authenticateAdmin(db, req)) return reply(req, { error: "admin_auth_required" }, 401);

    const { data: file, error: fileError } = await db.storage.from(BUCKET).download("admin/latest.json");
    if (fileError || !file) return reply(req, { error: "no_update_available" }, 404);

    const manifest = JSON.parse(await file.text());
    if (manifest.appId !== "com.ruknalgharb.admin" ||
        !/^[a-f0-9]{64}$/i.test(String(manifest.bundleId || "")) ||
        !/^[a-f0-9]{64}$/i.test(String(manifest.checksum || "")) ||
        typeof manifest.signature !== "string") {
      return reply(req, { error: "invalid_stored_manifest" }, 500);
    }

    const path = "admin/" + manifest.bundleId + ".zip";
    const { data: signed, error: signedError } = await db.storage.from(BUCKET).createSignedUrl(path, 600);
    if (signedError || !signed?.signedUrl) return reply(req, { error: "signed_url_failed" }, 500);

    let signedUrl: string;
    try {
      signedUrl = new URL(signed.signedUrl, Deno.env.get("SUPABASE_URL")!).toString();
    } catch {
      return reply(req, { error: "signed_url_invalid" }, 500);
    }

    return reply(req, {
      appId: manifest.appId,
      bundleId: manifest.bundleId,
      artifactType: "zip",
      checksum: manifest.checksum,
      signature: manifest.signature,
      url: signedUrl,
      releaseNotes: manifest.releaseNotes || "تحديث جديد للوحة المشرف",
      publishedAt: manifest.publishedAt || null
    });
  } catch (error) {
    console.error("admin_ota_manifest_error", error instanceof Error ? error.message : "unknown");
    return reply(req, { error: "manifest_unavailable" }, 500);
  }
});
