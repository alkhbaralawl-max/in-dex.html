import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGIN = Deno.env.get("APP_ORIGIN") ?? "";
const COOKIE = "rw_session";
const SESSION_SECONDS = 14 * 24 * 60 * 60;
const PBKDF2_ROUNDS = 600_000;
const enc = new TextEncoder();
type Obj = Record<string, unknown>;

function headers() {
  return { "access-control-allow-origin": ORIGIN, "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,x-csrf-token", "access-control-allow-methods": "POST,OPTIONS", "vary": "Origin",
    "cache-control": "no-store", "pragma": "no-cache", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
}
function reply(data: Obj, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers(), "content-type": "application/json; charset=utf-8", ...extra } });
}
function dbClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secrets = Deno.env.get("SUPABASE_SECRET_KEYS");
  const key = secrets ? JSON.parse(secrets).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function randomToken(size = 32) {
  const a = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...a)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
async function hashHex(value: string) {
  const a = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(a)].map(x => x.toString(16).padStart(2,"0")).join("");
}
async function secretHash(value: string) {
  const pepper = Deno.env.get("SESSION_PEPPER");
  if (!pepper || pepper.length < 32) throw new Error("session_pepper_missing");
  return hashHex(pepper + ":" + value);
}
function equal(a: string,b: string) {
  const x=enc.encode(a), y=enc.encode(b); if(x.length!==y.length) return false;
  let d=0; for(let i=0;i<x.length;i++) d|=x[i]^y[i]; return d===0;
}
function getCookie(req: Request) {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const p=part.trim(), i=p.indexOf("="); if(i>0 && p.slice(0,i)===COOKIE) return decodeURIComponent(p.slice(i+1));
  }
  return null;
}
function cookie(value: string,maxAge: number) {
  return COOKIE+"="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=None; Max-Age="+maxAge;
}
async function bodyOf(req: Request): Promise<Obj> {
  const n=Number(req.headers.get("content-length") ?? 0); if(n>12000) throw new Error("too_large");
  const b=await req.json(); if(!b || typeof b!=="object" || Array.isArray(b)) throw new Error("bad_json"); return b;
}
function usernameOf(v: unknown) { return String(v ?? "").trim().toLowerCase(); }
function validUsername(v: string) { return /^[a-z0-9_]{3,20}$/.test(v); }
async function passwordHash(password: string) {
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:PBKDF2_ROUNDS,hash:"SHA-256"},key,256);
  const hex=(a: Uint8Array)=>[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
  return "pbkdf2-sha256$"+PBKDF2_ROUNDS+"$"+hex(salt)+"$"+hex(new Uint8Array(bits));
}
async function verifyPassword(password: string, stored: string) {
  const [scheme,it,saltHex,want]=String(stored ?? "").split("$"); const rounds=Number(it);
  if(scheme!=="pbkdf2-sha256" || !Number.isSafeInteger(rounds) || rounds<300000 || rounds>1000000 || !/^[a-f0-9]{32}$/.test(saltHex ?? "") || !/^[a-f0-9]{64}$/.test(want ?? "")) return false;
  const salt=new Uint8Array((saltHex.match(/.{2}/g) ?? []).map(x=>parseInt(x,16)));
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:rounds,hash:"SHA-256"},key,256);
  const actual=[...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,"0")).join(""); return equal(actual,want);
}
async function legacyHash(user: string,password: string) { return hashHex("ws3:"+user+":"+password); }
async function newSession(db: ReturnType<typeof dbClient>,userId: string,req: Request) {
  const token=randomToken(), csrf=randomToken(24), ip=(req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const expires=new Date(Date.now()+SESSION_SECONDS*1000).toISOString();
  const {error}=await db.from("app_sessions").insert({user_id:userId,token_hash:await secretHash(token),csrf_token:csrf,
    ip_hash:await secretHash(ip),user_agent:(req.headers.get("user-agent") ?? "").slice(0,300),expires_at:expires});
  if(error) throw new Error("session_failed"); return {token,csrf,expires};
}
async function safeAccount(db: ReturnType<typeof dbClient>,userId: string) {
  const [u,w]=await Promise.all([
    db.from("app_users").select("id,username,display_name,role,profile,customer_data,created_at").eq("id",userId).single(),
    db.from("wallets").select("balance,registration_bonus,rounds,wins,losses,wagered,returned").eq("user_id",userId).single()
  ]);
  if(u.error || w.error) throw new Error("account_read_failed"); return {user:u.data,wallet:w.data};
}
async function audit(db: ReturnType<typeof dbClient>,id: string,action: string) {
  await db.from("audit_logs").insert({actor_user_id:id,target_user_id:id,action,entity_type:"authentication"});
}

Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:headers()});
  if(req.method!=="POST") return reply({error:"method_not_allowed"},405);
  if(!ORIGIN || req.headers.get("origin")!==ORIGIN) return reply({error:"origin_not_allowed"},403);
  let body: Obj; try { body=await bodyOf(req); } catch { return reply({error:"invalid_request"},400); }
  try {
    const db=dbClient(), action=String(body.action ?? "");
    if(action==="register") {
      const username=usernameOf(body.username), password=String(body.password ?? "");
      if(!validUsername(username)) return reply({error:"invalid_username"},400);
      if(password.length<10 || password.length>128) return reply({error:"password_policy"},400);
      const {data:userId,error}=await db.rpc("create_player_account",{p_username:username,p_password_hash:await passwordHash(password)});
      if(error) { if(error.message.includes("duplicate key")) return reply({error:"username_taken"},409);
        if(error.message.includes("registration_closed")) return reply({error:"registration_closed"},403); throw error; }
      const s=await newSession(db,userId,req); await audit(db,userId,"auth.registered");
      return reply({...await safeAccount(db,userId),csrfToken:s.csrf,expiresAt:s.expires},201,{"set-cookie":cookie(s.token,SESSION_SECONDS)});
    }
    if(action==="login") {
      const username=usernameOf(body.username), password=String(body.password ?? "");
      if(!validUsername(username) || password.length<1 || password.length>128) return reply({error:"invalid_credentials"},400);
      const ip=(req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim(), ipHash=await secretHash(ip);
      const {data:attemptId,error:claimError}=await db.rpc("claim_auth_attempt",{p_username:username,p_ip_hash:ipHash});
      if(claimError) throw new Error("rate_limit_failed");
      if(!attemptId) return reply({error:"too_many_attempts"},429,{"retry-after":"900"});
      const {data:user}=await db.from("app_users").select("id,status,password_hash,legacy_password_hash").eq("username_normalized",username).maybeSingle();
      let ok=false,upgrade: string|null=null;
      if(user && user.status==="active") {
        if(user.password_hash) ok=await verifyPassword(password,user.password_hash);
        else if(user.legacy_password_hash) { ok=equal(await legacyHash(username,password),user.legacy_password_hash); if(ok) upgrade=await passwordHash(password); }
      }
      const {error:attemptUpdateError}=await db.from("auth_attempts").update({succeeded:ok}).eq("id",attemptId);
      if(attemptUpdateError) throw new Error("auth_attempt_update_failed");
      if(!ok || !user) return reply({error:"invalid_credentials"},401);
      if(upgrade) {
        const {error}=await db.from("app_users").update({password_hash:upgrade,legacy_password_hash:null}).eq("id",user.id);
        if(error) throw new Error("password_upgrade_failed"); await audit(db,user.id,"auth.password_upgraded");
      }
      await db.from("app_users").update({last_login_at:new Date().toISOString()}).eq("id",user.id);
      const s=await newSession(db,user.id,req); await audit(db,user.id,"auth.login");
      return reply({...await safeAccount(db,user.id),csrfToken:s.csrf,expiresAt:s.expires},200,{"set-cookie":cookie(s.token,SESSION_SECONDS)});
    }
    const token=getCookie(req); if(!token) return reply({error:"unauthorized"},401,{"set-cookie":cookie("",0)});
    const {data:session}=await db.from("app_sessions").select("id,user_id,csrf_token,expires_at,app_users(status)")
      .eq("token_hash",await secretHash(token)).is("revoked_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
    if(!session || session.app_users?.status!=="active") return reply({error:"unauthorized"},401,{"set-cookie":cookie("",0)});
    if(action==="me") return reply({...await safeAccount(db,session.user_id),csrfToken:session.csrf_token,expiresAt:session.expires_at});
    if(action==="logout") {
      if(!equal(req.headers.get("x-csrf-token") ?? "",session.csrf_token)) return reply({error:"csrf_failed"},403);
      await db.from("app_sessions").update({revoked_at:new Date().toISOString()}).eq("id",session.id);
      await audit(db,session.user_id,"auth.logout"); return reply({ok:true},200,{"set-cookie":cookie("",0)});
    }
    return reply({error:"unknown_action"},404);
  } catch(e) {
    console.error("auth-api",e instanceof Error ? e.message : "unknown");
    return reply({error:"server_error"},500);
  }
});
