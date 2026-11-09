import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const BUCKET = "ota-admin";
const enc = new TextEncoder();

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = req.headers.get("x-ota-publish-token") || "";
  if (token.length < 64 || token.length > 256) return json({ error: "unauthorized" }, 401);

  try {
    const db = serviceClient();
    const { data: keyRow, error: keyError } = await db
      .from("ota_publish_keys")
      .select("token_hash")
      .eq("id", "admin")
      .single();
    if (keyError || !keyRow || !safeEqual(await sha256(token), String(keyRow.token_hash))) {
      return json({ error: "unauthorized" }, 401);
    }

    const appId = req.headers.get("x-ota-app-id") || "";
    const bundleId = req.headers.get("x-ota-bundle-id") || "";
    const checksum = req.headers.get("x-ota-checksum") || "";
    const signature = req.headers.get("x-ota-signature") || "";
    const releaseNotes = (req.headers.get("x-ota-release-notes") || "تحديث جديد للوحة المشرف").slice(0, 240);
    const sourceCommit = (req.headers.get("x-ota-source-commit") || "").slice(0, 64);

    if (appId !== "com.ruknalgharb.admin") return json({ error: "invalid_app_id" }, 400);
    if (!/^[a-f0-9]{64}$/i.test(bundleId) || !/^[a-f0-9]{64}$/i.test(checksum)) {
      return json({ error: "invalid_bundle_metadata" }, 400);
    }
    if (!/^[A-Za-z0-9+/]+=*$/.test(signature) || signature.length < 100) {
      return json({ error: "invalid_bundle_signature" }, 400);
    }
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > 50 * 1024 * 1024) return json({ error: "bundle_too_large" }, 413);

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length < 100 || bytes.length > 50 * 1024 * 1024) return json({ error: "invalid_bundle_size" }, 400);

    const objectPath = "admin/" + bundleId + ".zip";
    const { error: uploadError } = await db.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: "application/zip",
      cacheControl: "0",
      upsert: true
    });
    if (uploadError) {
      console.error("admin_ota_upload_failed", uploadError.message);
      return json({ error: "storage_upload_failed" }, 500);
    }

    const latest = {
      schemaVersion: 1,
      appId,
      bundleId,
      artifactType: "zip",
      checksum,
      signature,
      releaseNotes,
      sourceCommit,
      publishedAt: new Date().toISOString()
    };
    const { error: manifestError } = await db.storage.from(BUCKET).upload(
      "admin/latest.json",
      new Blob([JSON.stringify(latest)], { type: "application/json" }),
      { contentType: "application/json", cacheControl: "0", upsert: true }
    );
    if (manifestError) {
      console.error("admin_ota_manifest_write_failed", manifestError.message);
      return json({ error: "manifest_write_failed" }, 500);
    }

    return json({ ok: true, appId, bundleId, uploadedBytes: bytes.length });
  } catch (error) {
    console.error("admin_ota_publish_error", error instanceof Error ? error.message : "unknown");
    return json({ error: "publish_failed" }, 500);
  }
});
