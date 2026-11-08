const UPSTREAM_BASE = "https://qoeefydvmkdigixsbpuy.supabase.co/functions/v1";
const ALLOWED_ORIGINS = new Set([
  "https://rukn-algharb-main.vercel.app",
  "https://rukn-algharb-main-alkhbaralawl-4273.vercel.app"
]);
const PUBLIC_KEY = "sb_publishable_buyanIYkhiKL8rQPw2mZpg_J7c4bXAn";

function originOf(req) {
  const origin = String(req.headers.origin || "");
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  const referer = String(req.headers.referer || "");
  try {
    const parsed = new URL(referer);
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch {
    return "";
  }
}

function rewriteCookie(value) {
  return String(value)
    .replace(/;\s*SameSite=None/ig, "; SameSite=Lax")
    .replace(/;\s*Partitioned/ig, "");
}

async function proxy(req, res, endpoint) {
  const origin = originOf(req);
  if (!origin) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "origin_not_allowed" }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", endpoint === "app-api" ? "GET, POST, OPTIONS" : "POST, OPTIONS");
    res.setHeader("Cache-Control", "no-store");
    res.end();
    return;
  }

  let url = UPSTREAM_BASE + "/" + endpoint;
  const headers = {
    "apikey": PUBLIC_KEY,
    "origin": origin,
    "referer": origin + "/",
    "accept": req.headers.accept || "application/json"
  };
  if (req.headers["x-csrf-token"]) headers["x-csrf-token"] = String(req.headers["x-csrf-token"]);
  if (req.headers.cookie) headers.cookie = String(req.headers.cookie);
  if (req.headers["user-agent"]) headers["user-agent"] = String(req.headers["user-agent"]);

  const init = { method: req.method, headers, redirect: "manual" };

  if (req.method === "GET" && endpoint === "app-api") {
    const teamLogo = String(req.query?.team_logo || "");
    if (!/^\d{1,10}$/.test(teamLogo)) {
      res.statusCode = 400;
      res.end();
      return;
    }
    url += "?team_logo=" + encodeURIComponent(teamLogo);
  } else if (req.method === "POST") {
    let body = req.body;
    if (body && typeof body === "object" && !Buffer.isBuffer(body)) body = JSON.stringify(body);
    if (Buffer.isBuffer(body)) body = body.toString("utf8");
    if (typeof body !== "string" || body.length > 1024 * 1024) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    headers["content-type"] = "application/json";
    init.body = body;
  } else {
    res.statusCode = 405;
    res.setHeader("Allow", endpoint === "app-api" ? "GET, POST, OPTIONS" : "POST, OPTIONS");
    res.end();
    return;
  }

  try {
    const upstream = await fetch(url, init);
    res.statusCode = upstream.status;
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Origin");

    if (endpoint === "auth-api") {
      let cookies = [];
      if (typeof upstream.headers.getSetCookie === "function") {
        cookies = upstream.headers.getSetCookie();
      } else {
        const single = upstream.headers.get("set-cookie");
        if (single) cookies = [single];
      }
      if (cookies.length) res.setHeader("Set-Cookie", cookies.map(rewriteCookie));
    }

    const data = Buffer.from(await upstream.arrayBuffer());
    res.end(data);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "upstream_unavailable" }));
  }
}

module.exports = proxy;
