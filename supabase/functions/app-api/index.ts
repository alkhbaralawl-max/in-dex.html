import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const ORIGIN = "https://alkhbaralawl-max.github.io";
const ALLOWED_ORIGINS = new Set([ORIGIN, "https://rukn-algharb-preview.vercel.app", "https://rukn-algharb-control-private.vercel.app"]);
const COOKIE = "__Host-rw_session";
const SESSION_SECONDS = 14 * 24 * 60 * 60;
const enc = new TextEncoder();
type Obj = Record<string, any>;
type Client = ReturnType<typeof createClient>;

function corsHeaders() {
  return {
    "access-control-allow-origin": ORIGIN,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,apikey,x-csrf-token",
    "access-control-allow-methods": "POST,OPTIONS",
    "vary": "Origin",
    "cache-control": "no-store",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  };
}
function response(data: Obj, status=200, extra: Record<string,string>={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "content-type":"application/json; charset=utf-8", ...extra }
  });
}
function dbClient(): Client {
  const url=Deno.env.get("SUPABASE_URL");
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url || !key) throw new Error("server_not_configured");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function readCookie(req:Request) {
  for(const part of (req.headers.get("cookie")??"").split(";")) {
    const p=part.trim(),i=p.indexOf("=");
    if(i>0 && p.slice(0,i)===COOKIE) {
      try { return decodeURIComponent(p.slice(i+1)); } catch { return null; }
    }
  }
  return null;
}
async function sha(value:string) {
  const a=await crypto.subtle.digest("SHA-256",enc.encode(value));
  return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function tokenHash(token:string) {
  const pepper=Deno.env.get("SESSION_PEPPER")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(pepper.length<32) throw new Error("session_pepper_missing");
  return sha(pepper+":"+token);
}
function safeEqual(a:string,b:string) {
  const x=enc.encode(a),y=enc.encode(b); if(x.length!==y.length)return false;
  let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;
}
async function parseBody(req:Request):Promise<Obj> {
  const len=Number(req.headers.get("content-length")||0);
  if(len>3000000) throw new Error("request_too_large");
  const body=await req.json();
  if(!body || typeof body!=="object" || Array.isArray(body)) throw new Error("invalid_json");
  return body;
}
async function authenticate(db:Client,req:Request,write:boolean) {
  const token=readCookie(req);
  if(!token) throw new HttpError(401,"unauthorized");
  const {data:session,error}=await db.from("app_sessions")
    .select("id,user_id,csrf_token,expires_at")
    .eq("token_hash",await tokenHash(token))
    .is("revoked_at",null)
    .gt("expires_at",new Date().toISOString())
    .maybeSingle();
  if(error || !session) throw new HttpError(401,"unauthorized");
  const {data:user,error:userError}=await db.from("app_users")
    .select("id,username,display_name,role,status,profile,customer_data,created_at")
    .eq("id",session.user_id).maybeSingle();
  if(userError || !user || user.status!=="active") throw new HttpError(401,"unauthorized");
  if(write && !safeEqual(req.headers.get("x-csrf-token")||"",session.csrf_token))
    throw new HttpError(403,"csrf_failed");
  return {session,user};
}
class HttpError extends Error {
  status:number;
  constructor(status:number,message:string){super(message);this.status=status;}
}
function requireAdmin(user:Obj) {
  if(user.role!=="admin") throw new HttpError(403,"admin_required");
}
function cleanNumber(v:any,min:number,max:number) {
  const n=Number(v); if(!Number.isFinite(n)||n<min||n>max) throw new HttpError(400,"invalid_number"); return n;
}
function money(v:number) { return Math.round((v+Number.EPSILON)*100)/100; }
async function validatedStake(db:Client,value:any) {
  const stake=money(cleanNumber(value,.01,10000000));
  const {data,error}=await db.from("app_settings").select("min_virtual_stake,max_virtual_stake").eq("singleton",true).single();
  if(error||!data) throw new HttpError(500,"settings_unavailable");
  const min=Number(data.min_virtual_stake)||.01,max=Number(data.max_virtual_stake)||0;
  if(stake<min) throw new HttpError(400,"below_minimum_stake");
  if(max>0&&stake>max) throw new HttpError(400,"above_maximum_stake");
  return stake;
}

async function passwordHash(password:string) {
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},key,256);
  const hex=(a:Uint8Array)=>[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
  return "pbkdf2-sha256$600000$"+hex(salt)+"$"+hex(new Uint8Array(bits));
}
function makeLegacyId() {
  const n=new Uint32Array(1);crypto.getRandomValues(n);
  return String(100000000+(n[0]%900000000));
}
function secureRandom() {
  const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]/4294967296;
}
function secureInt(max:number) { return Math.floor(secureRandom()*max); }
function pickWeighted(weights:number[]) {
  let r=secureRandom()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}
  return weights.length-1;
}
function rtpOf(game:Obj,defaults:Record<string,number>) {
  const n=Number(game?.rtp); return n>=1&&n<=99.9?n:(defaults[game?.engine]??96);
}
const ENGINE_RTP:Record<string,number>={slot:96,apple:96,rocket:96,crash:96,wheel:95,plinko:96,dice:96,cards:95};
const ENGINE_CAP:Record<string,number>={slot:20,apple:8,rocket:20,crash:20,wheel:8,plinko:20,dice:20,cards:20};
function gameConfig(config:Obj,id:string) {
  const defaults:Record<string,Obj>={wwg:{id:"wwg",engine:"slot",rtp:96},apple:{id:"apple",engine:"apple",rtp:96},rocket:{id:"rocket",engine:"rocket",rtp:96},crash:{id:"crash",engine:"crash",rtp:96},wheel:{id:"wheel",engine:"wheel",rtp:95},plinko:{id:"plinko",engine:"plinko",rtp:96},dice:{id:"dice",engine:"dice",rtp:96},cards:{id:"cards",engine:"cards",rtp:95}};
  const configured=config?.games?.[id]||{};
  const base=defaults[id]||(ENGINE_RTP[configured.engine]!=null?{id,engine:configured.engine,rtp:ENGINE_RTP[configured.engine]}:null);
  if(!base) throw new HttpError(400,"unknown_game");
  if(ENGINE_RTP[configured.engine||base.engine]==null) throw new HttpError(400,"unknown_game_engine");
  return {...base,...configured,id};
}
async function appConfig(db:Client) {
  const {data,error}=await db.from("app_config").select("config").eq("singleton",true).single();
  if(error) throw new HttpError(500,"config_unavailable");
  return data.config||{};
}
async function walletFor(db:Client,userId:string) {
  const {data,error}=await db.from("wallets")
    .select("balance,registration_bonus,rounds,wins,losses,wagered,returned")
    .eq("user_id",userId).single();
  if(error) throw new HttpError(500,"wallet_unavailable");
  return data;
}
async function recordRound(db:Client,userId:string,gameId:string,stake:number,payout:number,outcome:Obj,key:string) {
  const {data,error}=await db.rpc("record_virtual_game_round",{
    p_user_id:userId,p_game_id:gameId,p_stake:stake,p_payout:payout,p_outcome:outcome,p_idempotency_key:key
  });
  if(error) throw new HttpError(400,error.message||"game_failed");
  return data;
}
async function audit(db:Client,actor:string,target:string|null,action:string,type:string,id:string,details:Obj={}) {
  const {error}=await db.from("audit_logs").insert({
    actor_user_id:actor,target_user_id:target,action,entity_type:type,entity_id:id,details
  });
  if(error) console.error("audit_write_failed",action);
}
async function userScale(user:Obj) {
  const data=user.customer_data||{};
  const n=Number(data.scale);
  return n>0&&n<=100?n/100:1;
}
function userGameCap(user:Obj,game:Obj,gameId:string) {
  const configured=Number(game?.maxMultiplier);
  const fallback=configured>=1&&configured<=100?configured:(ENGINE_CAP[game?.engine]??20);
  const personal=Number(user?.customer_data?.gameCaps?.[gameId]);
  return personal>=1&&personal<=100?personal:fallback;
}
async function getActiveRound(db:Client,userId:string,roundId?:string) {
  let q=db.from("active_game_rounds").select("*").eq("user_id",userId).eq("status","active");
  if(roundId) q=q.eq("id",roundId);
  const {data,error}=await q.maybeSingle();
  if(error) throw new HttpError(500,"active_game_read_failed");
  if(!data) throw new HttpError(404,"active_game_not_found");
  return data;
}
function publicActive(round:Obj) {
  const s=round.state||{};
  if(round.game_id==="apple") return {
    id:round.id,gameId:round.game_id,stake:Number(round.stake),level:Number(s.level)||0,
    safeN:Number(s.safeN)||4,picks:Array.isArray(s.picks)?s.picks:[],
    revealedHazards:Array.isArray(s.hazards)?s.hazards.slice(0,Number(s.level)||0):[],
    version:Number(round.version)
  };
  if(round.game_id==="crash"||round.game_id==="rocket") return {
    id:round.id,gameId:round.game_id,stake:Number(round.stake),
    startedAt:Number(s.t0),auto:Number(s.auto)||0,version:Number(round.version)
  };
  return {id:round.id,gameId:round.game_id,version:Number(round.version)};
}
async function finishActive(db:Client,userId:string,round:Obj,state:Obj,payout:number,outcome:Obj) {
  const {data,error}=await db.rpc("advance_active_virtual_game",{
    p_user_id:userId,p_round_id:round.id,p_expected_version:Number(round.version),
    p_new_state:state,p_finished:true,p_payout:money(payout),p_outcome:outcome
  });
  if(error) throw new HttpError(409,error.message||"game_finish_conflict");
  return data;
}
function appleMultiplier(rtp:number,k:number,safeN:number,cap=8) {
  return money(Math.min(Math.pow(1/0.8,k)*(rtp/100),cap));
}
function genCrashPoint(rtp:number,scale:number,cap=20) {
  const raw=Math.floor((rtp/100)/(1-secureRandom())*100)/100;
  const limit=Math.max(1,Math.min(100,cap));
  let cp=Math.max(1,Math.min(limit,raw));
  if(secureRandom()>(scale)) cp=Math.min(cp,money(1+secureRandom()*.3));
  return cp;
}
function slotRaw(a:number,b:number,c:number) {
  const pay=[0,2,4,8,16,20];
  if(a===b&&b===c)return pay[a];
  if(a===b||b===c||a===c)return 2;
  return 0;
}
function slotScale(rtp:number,cap=20) {
  const p=[.44,.26,.16,.09,.04,.01];let lo=0,hi=100;
  for(let i=0;i<52;i++){
    const s=(lo+hi)/2;let exp=0;
    for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++)
      exp+=p[a]*p[b]*p[c]*Math.min(slotRaw(a,b,c)*s,cap);
    if(exp<rtp/100)lo=s;else hi=s;
  }
  return (lo+hi)/2;
}
async function loadMatch(db:Client,id:string) {
  const {data,error}=await db.from("matches").select("id,payload,status,kickoff_at").eq("id",id).maybeSingle();
  if(error||!data) throw new HttpError(404,"match_not_found");
  return data;
}
async function main(req:Request) {
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders()});
  if(req.method!=="POST") return response({error:"method_not_allowed"},405);
  if(!ALLOWED_ORIGINS.has(req.headers.get("origin") ?? "")) return response({error:"origin_not_allowed"},403);
  let body:Obj;try{body=await parseBody(req);}catch{return response({error:"invalid_request"},400);}
  try {
    const db=dbClient(),action=String(body.action||"");
    if(action==="public_config") {
      const config=await appConfig(db);
      const {data:matchRows,error}=await db.from("matches").select("id,payload,status,kickoff_at").order("updated_at",{ascending:false}).limit(200);
      if(error) throw new HttpError(500,"matches_unavailable");
      const matches:Obj={};
      for(const m of matchRows||[]) matches[m.id]={...m.payload,id:m.id,status:m.status,kickoffAt:m.kickoff_at?new Date(m.kickoff_at).getTime():0};
      return response({...config,matches});
    }
    const writes=new Set([
      "logout","play","active_start","apple_pick","apple_cash","crash_tick","crash_cash",
      "sports_bet","chat_send","credit_request","admin_adjust","admin_status","admin_match_save",
      "admin_market_settle","admin_credit_review","admin_config_save","admin_chat_send",
      "admin_create_account","admin_update_account","admin_set_scale","admin_set_game_caps","admin_reset_stats","admin_delete_account","admin_match_delete"
    ]);
    const {session,user}=await authenticate(db,req,writes.has(action));
    if(action==="me") {
      const [wallet,hist,active,bets]=await Promise.all([
        walletFor(db,user.id),
        db.from("game_rounds").select("game_id,stake,payout,outcome,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
        db.from("active_game_rounds").select("*").eq("user_id",user.id).eq("status","active").maybeSingle(),
        db.from("sports_bets").select("id,match_id,market_id,option_id,match_snapshot,stake,odds,status,payout,created_at,settled_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100)
      ]);
      if(hist.error||bets.error) throw new HttpError(500,"account_history_unavailable");
      return response({
        user:{id:user.id,legacyUserId:user.legacy_user_id,username:user.username,displayName:user.display_name,role:user.role,status:user.status,profile:user.profile||{},scale:Number(user.customer_data?.scale)||100,gameCaps:user.customer_data?.gameCaps||{}},
        csrfToken:session.csrf_token,
        wallet,history:(hist.data||[]).map((x:any)=>({g:x.game_id,bet:Number(x.stake),win:Number(x.payout),t:new Date(x.created_at).getTime(),i:x.outcome?.multiplier??x.outcome?.level??x.outcome?.index??0})),
        active:active.data?publicActive(active.data):null,
        sportsBets:(bets.data||[]).map((x:any)=>({...x,matchTitle:x.match_snapshot?.title||"مباراة",team1:x.match_snapshot?.team1,team2:x.match_snapshot?.team2,marketTitle:x.match_snapshot?.market_title,optionLabel:x.match_snapshot?.option_label}))
      });
    }
    if(action==="config") {
      const [config,matches]=await Promise.all([
        appConfig(db),
        db.from("matches").select("id,payload,status,kickoff_at").order("updated_at",{ascending:false}).limit(200)
      ]);
      if(matches.error) throw new HttpError(500,"matches_unavailable");
      const mapped:Obj={};
      for(const m of matches.data||[]) mapped[m.id]={...m.payload,id:m.id,status:m.status,kickoffAt:m.kickoff_at?new Date(m.kickoff_at).getTime():0};
      return response({...config,matches:mapped});
    }
    if(action==="logout") {
      const {error}=await db.from("app_sessions").update({revoked_at:new Date().toISOString()}).eq("id",session.id);
      if(error) throw new HttpError(500,"logout_failed");
      await audit(db,user.id,user.id,"auth.logout","session",session.id);
      return response({ok:true},200,{"set-cookie":COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0"});
    }
    if(action==="play") {
      const gameId=String(body.gameId||""),stake=await validatedStake(db,body.stake);
      const idempotency=String(body.idempotencyKey||"");
      if(idempotency.length<12||idempotency.length>100) throw new HttpError(400,"invalid_idempotency_key");
      const cfg=await appConfig(db),games=cfg.games||{};
      const game=gameConfig(cfg,gameId),rtp=rtpOf(game,{slot:96,apple:96,rocket:96,crash:96,wheel:95,plinko:96});
      if(game.on===false) throw new HttpError(403,"game_disabled");
      const scale=await userScale(user),cap=userGameCap(user,game,gameId);
      let payout=0,outcome:Obj={};
      if(game.engine==="slot") {
        const weights=[.44,.26,.16,.09,.04,.01],factor=slotScale(rtp,cap);
        let triple=[0,0,0],raw=0;
        const forceLoss=secureRandom()>(scale);
        for(let n=0;n<120;n++){
          triple=[pickWeighted(weights),pickWeighted(weights),pickWeighted(weights)];
          raw=Math.min(slotRaw(triple[0],triple[1],triple[2])*factor,cap);
          if(!forceLoss||raw===0) break;
        }
        payout=money(stake*raw);outcome={symbols:triple,multiplier:raw};
      } else if(game.engine==="wheel") {
        const sectors=[0,0,.3,0,1,0,.5,0,2,0,0,.3,1,0,.5,8,0,0,1,.3];
        const expected=sectors.reduce((a,b)=>a+b,0)/sectors.length;
        const values=sectors.map(x=>Math.min(x*(rtp/100)/expected,cap));
        let index=secureInt(20);
        if(secureRandom()>(scale)) {
          const losing=values.map((v,i)=>v<1?i:-1).filter(i=>i>=0);
          if(losing.length) index=losing[secureInt(losing.length)];
        }
        payout=money(stake*values[index]);outcome={index,multiplier:values[index]};
      } else if(game.engine==="plinko") {
        const raw=[16,5,2,1.1,.4,1.1,2,5,16],weights=[1,8,28,56,70,56,28,8,1];
        const expected=weights.reduce((sum,w,i)=>sum+w*raw[i]/256,0);
        const values=raw.map(x=>Math.min(x*(rtp/100)/expected,cap));
        let bucket=4,path:number[]=[];
        if(secureRandom()>(scale)) {
          const losing=values.map((v,i)=>v<1?i:-1).filter(i=>i>=0);
          bucket=losing.length?losing[secureInt(losing.length)]:4;
          const pool=Array(bucket).fill(1).concat(Array(8-bucket).fill(0));
          for(let i=pool.length-1;i>0;i--){const j=secureInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
          path=pool;
        } else {
          path=Array.from({length:8},()=>secureInt(2));
          bucket=path.reduce((sum,step)=>sum+step,0);
        }
        const multiplier=values[bucket];
        payout=money(stake*multiplier);outcome={path,bucket,multiplier};
      } else if(game.engine==="dice") {
        const choice=String(body.choice||"");
        if(!["low","seven","high"].includes(choice)) throw new HttpError(400,"invalid_dice_choice");
        const wins=(sum:number)=>choice==="low"?sum>=2&&sum<=6:choice==="seven"?sum===7:sum>=8&&sum<=12;
        let die1=secureInt(6)+1,die2=secureInt(6)+1,sum=die1+die2;
        if(secureRandom()>scale&&wins(sum)) {
          for(let i=0;i<120&&wins(sum);i++){die1=secureInt(6)+1;die2=secureInt(6)+1;sum=die1+die2;}
        }
        const probability=choice==="seven"?6/36:15/36;
        const multiplier=money(Math.min(cap,(rtp/100)/probability));
        const won=wins(sum);
        payout=won?money(stake*multiplier):0;
        outcome={dice:[die1,die2],sum,choice,won,multiplier:won?multiplier:0};
      } else if(game.engine==="cards") {
        const choice=String(body.choice||"");
        if(!["red","black"].includes(choice)) throw new HttpError(400,"invalid_card_choice");
        const suits=["♥","♦","♣","♠"],red=(s:number)=>s===0||s===1;
        let suit=secureInt(4),rank=secureInt(13)+1;
        if(secureRandom()>scale&&((choice==="red")===red(suit))) {
          for(let i=0;i<120&&((choice==="red")===red(suit));i++){suit=secureInt(4);rank=secureInt(13)+1;}
        }
        const won=(choice==="red")===red(suit),multiplier=money(Math.min(cap,(rtp/100)/.5));
        payout=won?money(stake*multiplier):0;
        outcome={suit:suits[suit],rank,red:red(suit),choice,won,multiplier:won?multiplier:0};
      } else {
        throw new HttpError(400,"unsupported_one_shot_game");
      }
      const result=await recordRound(db,user.id,gameId,stake,payout,outcome,idempotency);
      return response({ok:true,gameId,stake,payout,outcome,balance:Number(result.balance),duplicate:!!result.duplicate});
    }
    if(action==="active_start") {
      const gameId=String(body.gameId||""),stake=await validatedStake(db,body.stake);
      const key=String(body.idempotencyKey||"");
      if(key.length<12||key.length>100) throw new HttpError(400,"invalid_idempotency_key");
      const cfg=await appConfig(db),game=gameConfig(cfg,gameId),rtp=rtpOf(game,ENGINE_RTP);
      if(game.on===false) throw new HttpError(403,"game_disabled");
      const scale=await userScale(user),maxMultiplier=userGameCap(user,game,gameId);
      let state:Obj={};
      if(game.engine==="apple") {
        const safeN=Math.max(1,Math.min(5,Math.round(5*.8*scale)));
        state={level:0,picks:[],safeN,rtp,maxMultiplier};
      } else if(game.engine==="crash"||game.engine==="rocket") {
        let cp=genCrashPoint(rtp,scale,maxMultiplier);
        state={cp,t0:Date.now(),auto:Number(body.auto)>=1.01&&Number(body.auto)<maxMultiplier?Number(body.auto):0,rtp,maxMultiplier};
      } else throw new HttpError(400,"not_an_active_game");
      const {data,error}=await db.rpc("start_active_virtual_game",{
        p_user_id:user.id,p_game_id:gameId,p_stake:stake,p_state:state,p_idempotency_key:key
      });
      if(error) throw new HttpError(400,error.message||"game_start_failed");
      const round=await getActiveRound(db,user.id,data.round_id);
      return response({ok:true,active:publicActive(round),balance:Number(data.balance)});
    }
    if(action==="apple_pick") {
      const round=await getActiveRound(db,user.id,String(body.roundId||""));
      if(round.game_id!=="apple") throw new HttpError(400,"wrong_game");
      const s=round.state||{},cell=Number(body.cell),level=Number(s.level)||0;
      if(!Number.isInteger(cell)||cell<0||cell>4||level<0||level>=5) throw new HttpError(400,"invalid_pick");
      const picks=Array.isArray(s.picks)?s.picks:[];
      const state={...s};
      const scale=await userScale(user);
      const lost=secureRandom()>=(0.8*scale);
      const nextPicks=[...picks,cell];
      if(lost) {
        state.picks=nextPicks;state.lastPick={row:level,cell,lost:true};
        const finished=await finishActive(db,user.id,round,state,0,{level:level+1,lost:true,picks:nextPicks});
        return response({ok:true,lost:true,active:null,balance:Number(finished.balance),stake:Number(round.stake),row:level,cell,picks:nextPicks});
      }
      state.level=level+1;state.picks=nextPicks;state.lastPick={row:level,cell,lost:false};
      if(state.level>=5) {
        const cfg=await appConfig(db),game=gameConfig(cfg,"apple"),rtp=rtpOf(game,ENGINE_RTP);
        const mult=appleMultiplier(rtp,5,Number(s.safeN),Number(s.maxMultiplier)||8);
        const payout=money(Number(round.stake)*mult);
        const finished=await finishActive(db,user.id,round,state,payout,{level:5,multiplier:mult,picks:nextPicks,completed:true});
        return response({ok:true,won:true,payout,stake:Number(round.stake),multiplier:mult,active:null,balance:Number(finished.balance),picks:nextPicks});
      }
      const {data,error}=await db.rpc("advance_active_virtual_game",{
        p_user_id:user.id,p_round_id:round.id,p_expected_version:Number(round.version),
        p_new_state:state,p_finished:false,p_payout:0,p_outcome:{}
      });
      if(error) throw new HttpError(409,error.message||"game_state_conflict");
      const fresh=await getActiveRound(db,user.id,round.id);
      return response({ok:true,safe:true,active:publicActive(fresh),balance:Number((await walletFor(db,user.id)).balance)});
    }
    if(action==="apple_cash") {
      const round=await getActiveRound(db,user.id,String(body.roundId||""));
      if(round.game_id!=="apple") throw new HttpError(400,"wrong_game");
      const s=round.state||{},level=Number(s.level)||0;
      if(level<1) throw new HttpError(400,"cash_requires_safe_pick");
      const cfg=await appConfig(db),game=gameConfig(cfg,"apple"),rtp=rtpOf(game,ENGINE_RTP);
      const multiplier=appleMultiplier(rtp,level,Number(s.safeN),Number(s.maxMultiplier)||8);
      const payout=money(Number(round.stake)*multiplier);
      const finished=await finishActive(db,user.id,round,s,payout,{level,multiplier,picks:s.picks||[],cashedOut:true});
      return response({ok:true,payout,multiplier,stake:Number(round.stake),balance:Number(finished.balance),active:null});
    }
    if(action==="crash_status"||action==="crash_tick"||action==="crash_cash") {
      const round=await getActiveRound(db,user.id,String(body.roundId||""));
      if(round.game_id!=="crash"&&round.game_id!=="rocket") throw new HttpError(400,"wrong_game");
      const s=round.state||{},elapsed=Math.max(0,(Date.now()-Number(s.t0))/1000);
      const limit=Math.max(1,Math.min(100,Number(s.maxMultiplier)||20));
      const raw=Math.min(Math.exp(.35*elapsed),limit),multiplier=Math.floor(raw*100)/100;
      const crashed=raw>=Number(s.cp),auto=Number(s.auto)>1&&raw>=Number(s.auto)&&Number(s.auto)<Number(s.cp);
      if(action==="crash_status") return response({ok:true,active:true,crashPending:crashed||auto,crashed,autoDue:auto,elapsed,multiplier,stake:Number(round.stake)});
      if(action==="crash_cash"&&!crashed) {
        const payout=money(Number(round.stake)*multiplier);
        const finished=await finishActive(db,user.id,round,{...s,cashedAt:Date.now(),cashMultiplier:multiplier},payout,{multiplier,cashedOut:true});
        return response({ok:true,cashedOut:true,payout,multiplier,crashPoint:Number(s.cp),startedAt:Number(s.t0),elapsed,stake:Number(round.stake),balance:Number(finished.balance),active:null});
      }
      if(crashed||auto) {
        const paid=auto&&!crashed?money(Number(round.stake)*Number(s.auto)):0;
        const result=await finishActive(db,user.id,round,{...s,endedAt:Date.now(),crashed,autoSettled:auto&&!crashed},paid,
          {crashed,autoSettled:auto&&!crashed,crashPoint:Number(s.cp),multiplier:auto?Number(s.auto):0});
        return response({ok:true,crashed,autoSettled:auto&&!crashed,payout:paid,multiplier:auto?Number(s.auto):0,
          crashPoint:Number(s.cp),startedAt:Number(s.t0),elapsed,stake:Number(round.stake),balance:Number(result.balance),active:null});
      }
      return response({ok:true,active:publicActive(round),elapsed,multiplier,crashPoint:null});
    }
    if(action==="sports_bet") {
      const stake=money(cleanNumber(body.stake,.01,10000000)),matchId=String(body.matchId||""),
        marketId=String(body.marketId||""),optionId=String(body.optionId||""),key=String(body.idempotencyKey||"");
      if(key.length<12||key.length>100) throw new HttpError(400,"invalid_idempotency_key");
      const {data,error}=await db.rpc("place_virtual_sports_bet",{
        p_user_id:user.id,p_match_id:matchId,p_market_id:marketId,p_option_id:optionId,
        p_stake:stake,p_idempotency_key:key
      });
      if(error) throw new HttpError(400,error.message||"sports_bet_failed");
      return response({ok:true,...data});
    }
    if(action==="chat_list") {
      const {data,error}=await db.from("chat_messages").select("id,sender_role,message,created_at,read_at")
        .eq("user_id",user.id).order("created_at",{ascending:false}).limit(80);
      if(error) throw new HttpError(500,"chat_unavailable");
      return response({messages:(data||[]).reverse()});
    }
    if(action==="chat_send") {
      const message=String(body.message||"").trim().slice(0,2000);
      if(!message) throw new HttpError(400,"empty_message");
      const {data,error}=await db.from("chat_messages")
        .insert({user_id:user.id,sender_role:"player",message}).select("id,sender_role,message,created_at").single();
      if(error) throw new HttpError(500,"chat_send_failed");
      return response({message:data});
    }
    if(action==="credit_request") {
      const amount=money(cleanNumber(body.amount,.01,10000000));
      const note=String(body.note||"").slice(0,1500);
      const proof=String(body.proofData||"");
      let proofPath:string|null=null;
      if(proof) {
        const match=proof.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
        if(!match || proof.length>2200000) throw new HttpError(400,"invalid_or_large_proof_image");
        const mime="image/"+match[1],bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
        if(bytes.length>1600000) throw new HttpError(400,"proof_image_too_large");
        proofPath=user.id+"/"+crypto.randomUUID()+".jpg";
        const {error:uploadError}=await db.storage.from("virtual-credit-proofs").upload(proofPath,bytes,{contentType:mime,upsert:false});
        if(uploadError) throw new HttpError(400,"proof_upload_failed");
      }
      let requestId:string;
      try {
        let requestDetails:any={};
        try{requestDetails=JSON.parse(note);}catch{requestDetails={details:note};}
        const stored={...requestDetails};
        if(proofPath)stored.proofPath=proofPath;
        const {data,error}=await db.rpc("create_virtual_credit_request",{p_user_id:user.id,p_amount:amount,p_note:JSON.stringify(stored)});
        if(error) throw error;
        requestId=String(data);
      } catch(e) {
        if(proofPath) await db.storage.from("virtual-credit-proofs").remove([proofPath]);
        throw new HttpError(400,e instanceof Error?e.message:"request_failed");
      }
      return response({ok:true,requestId,status:"pending"});
    }
    if(action==="my_credit_requests") {
      const {data,error}=await db.from("virtual_credit_requests")
        .select("id,requested_amount,note,status,created_at,reviewed_at")
        .eq("user_id",user.id).order("created_at",{ascending:false}).limit(20);
      if(error) throw new HttpError(500,"credit_requests_unavailable");
      return response({requests:(data||[]).map((x:any)=>({id:x.id,requested_amount:x.requested_amount,status:x.status,created_at:x.created_at,reviewed_at:x.reviewed_at}))});
    }

    if(action==="admin_config_get") {
      requireAdmin(user);
      const [configResult,matchResult]=await Promise.all([
        db.from("app_config").select("config").eq("singleton",true).single(),
        db.from("matches").select("id,payload,status,kickoff_at").order("updated_at",{ascending:false}).limit(300)
      ]);
      if(configResult.error||matchResult.error) throw new HttpError(500,"admin_config_unavailable");
      const config=configResult.data?.config||{},matches:Obj={};
      for(const m of matchResult.data||[]) matches[m.id]={...(m.payload||{}),id:m.id,status:m.status,kickoffAt:m.kickoff_at?new Date(m.kickoff_at).getTime():0};
      return response({...config,matches});
    }
    if(action==="admin_accounts") {
      requireAdmin(user);
      const [us,ws]=await Promise.all([
        db.from("app_users").select("id,username,display_name,role,status,profile,customer_data,created_at,last_login_at,legacy_user_id").order("created_at",{ascending:false}).limit(1000),
        db.from("wallets").select("user_id,balance,registration_bonus,rounds,wins,losses,wagered,returned")
      ]);
      if(us.error||ws.error) throw new HttpError(500,"accounts_unavailable");
      const map=new Map((ws.data||[]).map((x:any)=>[x.user_id,x]));
      return response({accounts:(us.data||[]).map((x:any)=>{
        const wallet:any=map.get(x.id)||{};
        const data=x.customer_data||{};
        return {
          id:x.id,username:x.username,displayName:x.display_name,role:x.role,status:x.status,
          legacyUserId:x.legacy_user_id||data.id||null,
          createdAt:x.created_at,lastLoginAt:x.last_login_at,
          customer:{
            ...data,id:x.legacy_user_id||data.id,
            balance:Number(wallet.balance??0),regBonus:Number(wallet.registration_bonus??data.regBonus??0),
            rounds:Number(wallet.rounds??0),wins:Number(wallet.wins??0),losses:Number(wallet.losses??0),
            wagered:Number(wallet.wagered??0),returned:Number(wallet.returned??0),
            closed:x.status!=="active"||!!data.closed,
            scale:Number(data.scale)||100,
            gameCaps:data.gameCaps||{}
          },
          wallet
        };
      })});
    }
    if(action==="admin_create_account") {
      requireAdmin(user);
      const username=String(body.username||"").trim().toLowerCase();
      const password=String(body.password||"");
      if(!/^[a-z0-9_]{3,20}$/.test(username)) throw new HttpError(400,"invalid_username");
      if(password.length<6||password.length>128||password.toLowerCase()===username) throw new HttpError(400,"password_policy");
      let balance:number;
      if(body.initialBalance===null||body.initialBalance===undefined||String(body.initialBalance).trim()==="") {
        const {data:s,error}=await db.from("app_settings").select("initial_virtual_balance,new_accounts_start_at_zero").eq("singleton",true).single();
        if(error) throw new HttpError(500,"settings_unavailable");
        balance=s.new_accounts_start_at_zero?0:Number(s.initial_virtual_balance);
      } else balance=cleanNumber(body.initialBalance,0,1000000000);
      for(let attempt=0;attempt<5;attempt++) {
        const legacyId=makeLegacyId();
        const {data,error}=await db.rpc("admin_create_player_account",{
          p_actor_user_id:user.id,p_username:username,p_password_hash:await passwordHash(password),
          p_initial_balance:money(balance),p_legacy_user_id:legacyId
        });
        if(!error) {
          await audit(db,user.id,data.userId,"account.created","user",data.userId,{username,legacy_user_id:legacyId});
          return response({ok:true,...data});
        }
        if(String(error.message||"").includes("duplicate key")&&attempt<4) continue;
        if(String(error.message||"").includes("username_normalized")) throw new HttpError(409,"username_taken");
        throw new HttpError(400,error.message||"account_create_failed");
      }
      throw new HttpError(409,"legacy_id_generation_failed");
    }
    if(action==="admin_update_account") {
      requireAdmin(user);
      const target=String(body.userId||"");
      const legacyId=String(body.legacyUserId||"").trim();
      const wallet=body.wallet;
      if(!target||!/^\d{9}$/.test(legacyId)||!wallet||typeof wallet!=="object") throw new HttpError(400,"invalid_account_data");
      const pw=String(body.password||"");
      if(pw&&(pw.length<6||pw.length>128)) throw new HttpError(400,"password_policy");
      const values={
        balance:money(cleanNumber(wallet.balance,0,1000000000000)),
        registration_bonus:money(cleanNumber(wallet.registration_bonus,0,1000000000000)),
        rounds:Math.floor(cleanNumber(wallet.rounds,0,Number.MAX_SAFE_INTEGER)),
        wins:Math.floor(cleanNumber(wallet.wins,0,Number.MAX_SAFE_INTEGER)),
        losses:Math.floor(cleanNumber(wallet.losses,0,Number.MAX_SAFE_INTEGER)),
        wagered:money(cleanNumber(wallet.wagered,0,1000000000000)),
        returned:money(cleanNumber(wallet.returned,0,1000000000000))
      };
      const {data,error}=await db.rpc("admin_update_player_account",{
        p_actor_user_id:user.id,p_target_user_id:target,p_legacy_user_id:legacyId,
        p_wallet:values,p_password_hash:pw?await passwordHash(pw):null
      });
      if(error) throw new HttpError(400,error.message||"account_update_failed");
      return response({ok:true,...data});
    }
    if(action==="admin_set_scale") {
      requireAdmin(user);
      const scale=cleanNumber(body.scale,5,100);
      const {data,error}=await db.rpc("admin_set_player_scale",{
        p_actor_user_id:user.id,p_target_user_id:String(body.userId||""),p_scale:scale
      });
      if(error) throw new HttpError(400,error.message||"scale_update_failed");
      return response({ok:!!data});
    }
    if(action==="admin_set_game_caps") {
      requireAdmin(user);
      const target=String(body.userId||""),caps=body.caps;
      if(!target||!caps||typeof caps!=="object"||Array.isArray(caps)) throw new HttpError(400,"invalid_game_caps");
      const cleaned:Obj={};
      for(const [gameId,value] of Object.entries(caps)) {
        const cap=Number(value);
        if(!/^[a-z0-9_-]{1,60}$/.test(gameId)||!Number.isFinite(cap)||cap<1||cap>100)
          throw new HttpError(400,"invalid_game_cap");
        cleaned[gameId]=money(cap);
      }
      const {data:targetUser,error:readError}=await db.from("app_users").select("customer_data").eq("id",target).single();
      if(readError||!targetUser) throw new HttpError(404,"account_not_found");
      const next={...(targetUser.customer_data||{}),gameCaps:cleaned};
      const {error:updateError}=await db.from("app_users").update({customer_data:next}).eq("id",target);
      if(updateError) throw new HttpError(400,"game_caps_save_failed");
      await audit(db,user.id,target,"account.game_caps_updated","account",target,{gameCaps:cleaned});
      return response({ok:true,gameCaps:cleaned});
    }
    if(action==="admin_reset_stats") {
      requireAdmin(user);
      const {data,error}=await db.rpc("admin_reset_player_stats",{
        p_actor_user_id:user.id,p_target_user_id:String(body.userId||"")
      });
      if(error) throw new HttpError(400,error.message||"stats_reset_failed");
      return response({ok:!!data,historyPreserved:true});
    }
    if(action==="admin_delete_account") {
      requireAdmin(user);
      const target=String(body.userId||"");
      const {data,error}=await db.rpc("admin_set_user_status",{
        p_actor_user_id:user.id,p_target_user_id:target,p_status:"closed"
      });
      if(error) throw new HttpError(400,error.message||"account_close_failed");
      await audit(db,user.id,target,"account.soft_deleted","user",target,{history_preserved:true});
      return response({ok:!!data,softDeleted:true});
    }
    if(action==="admin_adjust") {
      requireAdmin(user);
      const target=String(body.userId||""),delta=money(cleanNumber(body.delta,-1000000000,1000000000));
      if(!delta) throw new HttpError(400,"zero_adjustment");
      const {data,error}=await db.rpc("admin_adjust_virtual_balance",{
        p_actor_user_id:user.id,p_target_user_id:target,p_delta:delta,
        p_reason:String(body.reason||"").slice(0,500),
        p_idempotency_key:String(body.idempotencyKey||crypto.randomUUID())
      });
      if(error) throw new HttpError(400,error.message||"adjustment_failed");
      return response({ok:true,...data});
    }
    if(action==="admin_status") {
      requireAdmin(user);
      const {data,error}=await db.rpc("admin_set_user_status",{
        p_actor_user_id:user.id,p_target_user_id:String(body.userId||""),p_status:String(body.status||"")
      });
      if(error) throw new HttpError(400,error.message||"status_change_failed");
      return response({ok:!!data});
    }

    if(action==="admin_match_delete") {
      requireAdmin(user);
      const id=String(body.matchId||"");
      if(!id) throw new HttpError(400,"invalid_match_id");
      const {data:existing,error:readError}=await db.from("matches").select("payload").eq("id",id).maybeSingle();
      if(readError||!existing) throw new HttpError(404,"match_not_found");
      const payload={...(existing.payload||{}),visible:false};
      const {error}=await db.from("matches").update({payload,status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id);
      if(error) throw new HttpError(500,"match_close_failed");
      await audit(db,user.id,null,"match.cancelled","match",id,{hidden:true,history_preserved:true});
      return response({ok:true,archived:true});
    }
    if(action==="admin_match_save") {
      requireAdmin(user);
      const id=String(body.matchId||"").slice(0,120),payload=body.payload;
      if(!id||!payload||typeof payload!=="object"||Array.isArray(payload)) throw new HttpError(400,"invalid_match");
      const kickoff=body.kickoffAt?new Date(body.kickoffAt).toISOString():null;
      const status=String(body.status||"open");
      const {data,error}=await db.rpc("admin_save_match",{
        p_actor_user_id:user.id,p_match_id:id,p_payload:payload,p_status:status,p_kickoff_at:kickoff
      });
      if(error) throw new HttpError(400,error.message||"match_save_failed");
      return response({ok:!!data,matchId:id});
    }
    if(action==="admin_market_settle") {
      requireAdmin(user);
      const {data,error}=await db.rpc("admin_settle_sports_market",{
        p_actor_user_id:user.id,p_match_id:String(body.matchId||""),
        p_market_id:String(body.marketId||""),p_result_option_id:body.resultOptionId?String(body.resultOptionId):null,
        p_void:!!body.void
      });
      if(error) throw new HttpError(400,error.message||"market_settlement_failed");
      return response({ok:true,...data});
    }
    if(action==="admin_credit_requests") {
      requireAdmin(user);
      const {data,error}=await db.from("virtual_credit_requests")
        .select("id,user_id,requested_amount,note,status,created_at,reviewed_at")
        .order("created_at",{ascending:false}).limit(300);
      if(error) throw new HttpError(500,"credit_requests_unavailable");
      const ids=[...new Set((data||[]).map((x:any)=>x.user_id))];
      const {data:users,error:userError}=ids.length?await db.from("app_users").select("id,username,legacy_user_id").in("id",ids):{data:[],error:null};
      if(userError) throw new HttpError(500,"credit_requests_unavailable");
      const names=new Map((users||[]).map((x:any)=>[x.id,x]));
      const requests=await Promise.all((data||[]).map(async(x:any)=>{
        let details:any={details:String(x.note||"")},proofUrl:string|null=null;
        try{details=JSON.parse(String(x.note||"{}"));}catch{}
        if(typeof details.details==="string" && details.details.startsWith("{")){
          try{details={...details,...JSON.parse(details.details)};}catch{}
        }
        if(details.proofPath){
          const {data:signed}=await db.storage.from("virtual-credit-proofs").createSignedUrl(details.proofPath,600);
          proofUrl=signed?.signedUrl||null;
        }
        return {...x,note:details.details||"",method:details.method||"",userNumber:details.userNumber||"",destinationNumber:details.destinationNumber||"",proofUrl,
          username:names.get(x.user_id)?.username||"—",legacyUserId:names.get(x.user_id)?.legacy_user_id||null};
      }));
      return response({requests});
    }
    if(action==="admin_credit_review") {
      requireAdmin(user);
      const {data,error}=await db.rpc("admin_review_virtual_credit_request",{
        p_actor_user_id:user.id,p_request_id:String(body.requestId||""),p_approve:!!body.approve
      });
      if(error) throw new HttpError(400,error.message||"credit_review_failed");
      return response({ok:true,...data});
    }
    if(action==="admin_config_save") {
      requireAdmin(user);
      const section=String(body.section||"");
      const allowed=["games","texts","colors","settings","pages"];
      if(!allowed.includes(section)||!body.value||typeof body.value!=="object"||Array.isArray(body.value))
        throw new HttpError(400,"invalid_config_section");
      const current=await appConfig(db);
      const next={...current,[section]:body.value};
      if(section==="settings"){
        const setting=body.value;
        const initial=Number(setting.initial),min=Number(setting.minBet),max=Number(setting.maxBet);
        if(!Number.isFinite(initial)||initial<0||!Number.isFinite(min)||min<=0||!Number.isFinite(max)||max<0)
          throw new HttpError(400,"invalid_site_settings");
        const {error:settingError}=await db.from("app_settings").update({
          registration_enabled:setting.registration!==false,
          initial_virtual_balance:initial,
          new_accounts_start_at_zero:!!setting.newZero,
          min_virtual_stake:min,
          max_virtual_stake:max
        }).eq("singleton",true);
        if(settingError) throw new HttpError(500,"settings_save_failed");
      }
      const {error}=await db.from("app_config").update({config:next,updated_at:new Date().toISOString()}).eq("singleton",true);
      if(error) throw new HttpError(500,"config_save_failed");
      await audit(db,user.id,null,"config.updated","config",section);
      return response({ok:true});
    }
    if(action==="admin_chat_rooms") {
      requireAdmin(user);
      const {data,error}=await db.from("chat_messages").select("id,user_id,sender_role,message,created_at,read_at")
        .order("created_at",{ascending:false}).limit(500);
      if(error) throw new HttpError(500,"admin_chat_unavailable");
      const userIds=[...new Set((data||[]).map((x:any)=>x.user_id))];
      const {data:us,error:ue}=userIds.length?await db.from("app_users").select("id,username,legacy_user_id").in("id",userIds):{data:[],error:null};
      if(ue) throw new HttpError(500,"admin_chat_unavailable");
      const names=new Map((us||[]).map((x:any)=>[x.id,x]));
      const rooms:Obj={};
      for(const m of [...(data||[])].reverse()){
        const key=m.user_id;
        if(!rooms[key])rooms[key]={userId:key,username:names.get(key)?.username||"—",legacyUserId:names.get(key)?.legacy_user_id||null,messages:[]};
        rooms[key].messages.push(m);
      }
      return response({rooms:Object.values(rooms)});
    }
    if(action==="admin_chat_send") {
      requireAdmin(user);
      const target=String(body.userId||""),message=String(body.message||"").trim().slice(0,2000);
      if(!message) throw new HttpError(400,"empty_message");
      const {data,error}=await db.from("chat_messages")
        .insert({user_id:target,sender_role:"admin",message}).select("id,user_id,sender_role,message,created_at").single();
      if(error) throw new HttpError(400,"chat_send_failed");
      await audit(db,user.id,target,"chat.admin_message","chat_message",String(data.id));
      return response({message:data});
    }
    if(action==="admin_ledger") {
      requireAdmin(user);
      const {data,error}=await db.from("wallet_ledger")
        .select("id,user_id,event_type,amount_delta,balance_before,balance_after,reference_type,reference_id,metadata,created_at")
        .order("created_at",{ascending:false}).limit(300);
      if(error) throw new HttpError(500,"ledger_unavailable");
      const ids=[...new Set((data||[]).map((x:any)=>x.user_id))];
      const {data:us,error:ue}=ids.length?await db.from("app_users").select("id,username,legacy_user_id").in("id",ids):{data:[],error:null};
      if(ue) throw new HttpError(500,"ledger_unavailable");
      const names=new Map((us||[]).map((x:any)=>[x.id,x]));
      return response({ledger:(data||[]).map((x:any)=>({...x,username:names.get(x.user_id)?.username||"—",legacyUserId:names.get(x.user_id)?.legacy_user_id||null}))});
    }
    return response({error:"unknown_action"},404);
  } catch(e) {
    const status=e instanceof HttpError?e.status:500;
    const message=e instanceof HttpError?e.message:"server_error";
    if(status===500) console.error("app-api",e instanceof Error?e.message:"unknown");
    return response({error:message},status);
  }
}
Deno.serve(async (req: Request) => {
  const result = await main(req);
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) {
    const h = new Headers(result.headers);
    h.set("access-control-allow-origin", origin);
    h.set("vary", "Origin");
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers: h });
  }
  return result;
});
