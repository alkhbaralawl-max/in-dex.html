
window.onerror=function(m,s,l){var e=document.getElementById("fatal");e.textContent="ERROR: "+m+" (line "+l+")";e.hidden=false;};
const SUPABASE_URL="https://qoeefydvmkdigixsbpuy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_buyanIYkhiKL8rQPw2mZpg_J7c4bXAn";
const SAME_ORIGIN_API=location.origin==="https://rukn-algharb-main.vercel.app"||location.origin==="https://rukn-algharb-main-alkhbaralawl-4273.vercel.app";
const AUTH_API=SAME_ORIGIN_API?"/api/auth":SUPABASE_URL+"/functions/v1/auth-api";
const APP_API=SAME_ORIGIN_API?"/api/app":SUPABASE_URL+"/functions/v1/app-api";
let csrfToken="";
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function sendApi(url,action,payload={},useCsrf=true){
  const headers={"content-type":"application/json","apikey":SUPABASE_PUBLISHABLE_KEY};
  if(useCsrf&&csrfToken)headers["x-csrf-token"]=csrfToken;
  let response,data;
  try{
    response=await fetch(url,{method:"POST",credentials:"include",headers,body:JSON.stringify({action,...payload})});
    data=await response.json();
  }catch(e){throw new ApiError("تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.",0);}
  if(!response.ok){
    const messages={unauthorized:"انتهت جلسة الدخول. سجّل الدخول مرة أخرى.",csrf_failed:"انتهت صلاحية الطلب. حدّث الصفحة وحاول مرة أخرى.",invalid_credentials:"اسم المستخدم أو كلمة السر غير صحيح.",username_taken:"اسم المستخدم مستخدم بالفعل.",password_policy:"كلمة السر الجديدة يجب أن تكون 10 أحرف على الأقل.",registration_closed:"التسجيل مغلق حاليًا.",too_many_attempts:"محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",insufficient_virtual_balance:"الرصيد الافتراضي غير كافٍ.",active_game_exists:"أنهِ الجولة الحالية أولًا.",match_closed:"بدأت المباراة أو أُغلق السوق.",admin_required:"هذه العملية متاحة للإدارة فقط."};
    throw new ApiError(messages[data?.error]||data?.error||"حدث خطأ في الخادم.",response.status);
  }
  return data;
}
const apiCall=(action,payload={},useCsrf=true)=>sendApi(APP_API,action,payload,useCsrf);
const authCall=(action,payload={})=>sendApi(AUTH_API,action,payload,false);
const $=id=>document.getElementById(id);
const nd=s=>String(s==null?"":s).replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/[۰-۹]/g,d=>d.charCodeAt(0)-1776);
const f=n=>Number(n).toLocaleString("en",{maximumFractionDigits:2});
const r2=n=>Math.round(n*100)/100;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const lines=s=>String(s||"").split("\n").map(x=>x.trim()).filter(Boolean);
const isUrl=s=>/^https?:\/\//i.test(String(s||"").trim());
const SESS="ws_sess4";
const CAP=20;
function capOf(g){
  const personal=Number(U?.gameCaps?.[g?.id]);
  if(personal>=1&&personal<=100)return personal;
  const configured=Number(g?.maxMultiplier);
  return configured>=1&&configured<=100?configured:CAP;
}


const BASE={slot:96,apple:96,rocket:96,crash:97,wheel:95,plinko:96,dice:96,cards:95};
const THEME={slot:["#8a4b08","#f0b429","#2a1808"],apple:["#1d6f3a","#5ac46a","#0e3a21"],rocket:["#b56d13","#ffcf65","#241405"],crash:["#0B1E3A","#1677D2","#08162b"],wheel:["#4b2a8a","#a56bff","#1d1040"],plinko:["#1a2a4a","#4a7dd4","#0a1222"],dice:["#78531c","#f5d27a","#1a1208"],cards:["#742c26","#e5b85c","#160907"]};
const EMO={slot:"🎰",apple:"🍎",rocket:"✈",crash:"📈",wheel:"🎡",plinko:"🎯",dice:"⚄",cards:"♠"};
const DEFG=[
{id:"wwg",name:"Wild West Gold",desc:"سلوت غربي بثلاث بكرات ورموز نادرة صعبة",engine:"slot",cat:"سلوت",tag:"سلوت",order:1},
{id:"apple",name:"Apple Of Fortune",desc:"اختار تفاحة آمنة وكمّل لأعلى مضاعف",engine:"apple",cat:"تفاح",tag:"تفاح",order:2},
{id:"rocket",name:"لعبة الطيارة",desc:"تابع صعود الطيارة واسحب قبل انتهاء الجولة",engine:"rocket",cat:"الطيارة",tag:"الطيارة",order:3},
{id:"wheel",name:"Spin and Win",desc:"عجلة الحظ بجوائز متفاوتة",engine:"wheel",cat:"عجلة",tag:"عجلة",order:4},
{id:"crash",name:"Crash",desc:"المنحنى يرتفع... اسحب قبل الانهيار",engine:"crash",cat:"كراش",tag:"كراش",order:5},
{id:"plinko",name:"Plinko",desc:"أسقط الكرة واستنى تستقر في خانة المضاعف",engine:"plinko",cat:"بلينكو",tag:"بلينكو",order:6},
{id:"dice",name:"Lucky Dice",desc:"اختار مجموع النرد: أقل من 7 أو يساوي 7 أو أكبر من 7",engine:"dice",cat:"النرد",tag:"النرد",order:7},
{id:"cards",name:"Red or Black",desc:"اختار لون الورقة قبل كشفها: أحمر أم أسود",engine:"cards",cat:"الأوراق",tag:"أوراق",order:8}];
const DEFT={
title:"ركن الغرب",subtitle:"تجربة توعوية",
ribbon:"🔒 تجربة توعوية • الرصيد وهمي بالكامل • لا إيداع ولا سحب حقيقي",
notice:"⚠️ المراهنات خطر حقيقي على الفرد والمجتمع. هذه تجربة توعوية: الألعاب مضبوطة لصالح المنصة كما في منصات المراهنات الحقيقية.",
banT:"ألعاب جديدة 🔥",banD:"جرّب الألعاب برصيد وهمي، واعرف بنفسك إزاي الخسارة هي النتيجة المتوقعة.",banBtn:"ابدأ اللعب",banImg:"",
searchPh:"ابحث عن لعبة...",featTitle:"⭐ ألعاب مميزة",allTitle:"🎮 كل الألعاب",noGames:"مفيش لعبة بالاسم ده",
eduNote:"الألعاب هنا من تنفيذنا بنفس فكرة الألعاب المعروفة، وليست النسخ الأصلية المرخّصة. نسب الربح للمنصة زي المواقع الحقيقية.",
actTitle:"🕘 النشاط",moreTitle:"⋯ المزيد",noPages:"لا توجد صفحات بعد",supTitle:"💬 الدعم المباشر",chatPh:"اكتب رسالتك...",
meTitle:"👤 حسابي",lblRounds:"جولات",lblWins:"كسب",lblLoss:"خسر",lblWager:"إجمالي الرهان",lblReturn:"إجمالي العائد",lblNet:"الخسارة الصافية",lblBal:"الرصيد (وهمي)",
navHome:"الرئيسية",navGames:"الألعاب",navSup:"الدعم",navAct:"النشاط",navMore:"المزيد",navMe:"حسابي",
btnLogin2:"تسجيل الدخول",btnReg2:"حساب جديد",btnLogin:"دخول",btnReg:"إنشاء حساب",btnOut:"تسجيل الخروج",
phUser:"اسم المستخدم (حروف إنجليزي أو أرقام)",phPass:"كلمة السر (6 أحرف على الأقل)",phPass2:"أعد كتابة كلمة السر",
forgotLink:"نسيت كلمة السر؟",forgotMsg:"لإعادة تعيين كلمة السر تواصل مع المشرف من صفحة الدعم المباشر.",
payTitle:"اشحن حسابك مجانًا",payMethods:"فودافون كاش",payDestNumber:"00000000000",
payWarn:"",phoneLbl:"رقم وهمي",phonePh:"اكتب رقمًا تجريبيًا فقط",phoneWarn:"",
amtLbl:"المبلغ اللي حولته",amtPh:"اكتب المبلغ",shotLbl:"ارفع صورة تجريبية",shotPh:"اختار صورة",shotPh2:"تم اختيار الصورة",
transferBtn:"إرسال الطلب",payFooter:"",backMethods:"رجوع",payChoose:"اختار طريقة الدفع",
payOk:"جاري الشحن، انتظر مراجعة المشرف",payApprovedTpl:"تم الدفع وتم إضافة {amount} إلى رصيدك",payRejectedTpl:"لم تتم الموافقة على طلبك",
ackBtn:"تمام",
msgWin:"كسبت {amount} 🎉",msgLost:"خسرت {amount}",msgTie:"تعادل: رجعلك رهانك",noBal:"الرصيد مش كفاية",closedMsg:"هذا الحساب مغلق",regClosed:"التسجيل مغلق حاليًا",
errNet:"تعذر الاتصال، تأكد من الإنترنت وجرّب تاني",errStuck:"حصل تأخير، حاول تاني",errBusy:"عندك جولة شغالة",errBetVal:"اكتب رهان صحيح",
msgStart:"حط رهانك واضغط ابدأ",
ruleSlot:"سلوت عالي التقلب: أغلب اللفات فاضية تمامًا، وتطابق الرموز النادرة بيدي مكسب كبير. أقصى مضاعف ×{cap}. العائد النظري {rtp}% (أفضلية المنصة {edge}%).",
ruleApple:"5 صفوف، كل صف فيه 5 تفاحات وواحدة فاسدة (فرصة نجاة {p}% لكل صف). اسحب في أي وقت بعد أول صف. أقصى مضاعف ×{cap}. العائد النظري {rtp}%.",
ruleCrash:"اضغط ابدأ فيبدأ المضاعف يرتفع، واضغط اسحب في أي لحظة. أغلب الجولات بتنهار بدري. أقصى مضاعف ×{cap}. العائد النظري {rtp}% (أفضلية المنصة {edge}%).",
ruleWheel:"20 خانة بمضاعفات مختلفة. أغلبها خسارة كاملة أو جزئية، وخانات نادرة بمكاسب كبيرة. أقصى مضاعف ×{cap}. العائد النظري {rtp}% (أفضلية المنصة {edge}%).",
rulePlinko:"الكرة بتنزل من فوق وتتنطط يمين أو شمال 8 مرات، وتستقر في خانة لها مضاعف. أقصى مضاعف ×{cap}. العائد النظري {rtp}%.",
riskLoseLbl:"⚠️ لو غلطت تخسر",riskWinLbl:"لو نجحت تكسب",riskCashLbl:"لو سحبت الآن",riskSurvLbl:"فرصة النجاة في كل صف",riskOneWrong:"غلطة واحدة وتخسر رهانك كله",
scaleNote:"ℹ️ فرصة الفوز على حسابك مخفّضة بقرار المشرف ({pct}% خسارة إضافية).",
rtpNote:"عائدك الفعلي: {rtp} من كل ما راهنت به. ومهما كسبت في جولات، المنصة بتكسب على المدى الطويل.",
btnDrop:"🎯 أسقط الكرة",btnSpinSlot:"🎰 لف",btnSpinWheel:"🎡 لف",btnStart:"▶ ابدأ",btnCash:"اسحب"
};
const DEFCOL={b:"#1677D2",bd:"#0B1E3A",b2:"#245A91",bg:"#F3F6FA",ok:"#20A464",er:"#E5484D",yl:"#FFC83D"};
const DEFS={initial:100000,newZero:false,registration:true,minBet:1,maxBet:0,defBet:1000,sportsEnabled:true};
let C={texts:DEFT,colors:DEFCOL,settings:DEFS,games:{},pages:{},matches:{}};
function merge(c){
  c=c||{};
  const t=Object.assign({},DEFT,c.texts||{});
  ["notice","ruleSlot","ruleApple","ruleCrash","ruleWheel","rulePlinko"].forEach(k=>{if(!String(t[k]||"").trim())t[k]=DEFT[k];});
  C={texts:t,colors:Object.assign({},DEFCOL,c.colors||{}),settings:Object.assign({},DEFS,c.settings||{}),games:c.games||{},pages:c.pages||{},matches:c.matches||{}};
}
function games(){
  const m={};DEFG.forEach(g=>m[g.id]=Object.assign({},g));
  const o=C.games||{};
  for(const id in o)m[id]=Object.assign(m[id]||{id:id},o[id],{id:id});
  return Object.values(m).filter(g=>g.name&&BASE[g.engine]!=null).sort((a,b)=>(a.order||99)-(b.order||99));
}
const gOn=g=>g.on!==false;
const rtpOf=g=>{const v=parseFloat(g.rtp);return v>=1&&v<=99.9?v:BASE[g.engine];};
const gById=id=>games().find(g=>g.id===id);
function pagesList(){const o=C.pages||{};return Object.keys(o).map(id=>Object.assign({id:id},o[id])).filter(p=>p.title&&p.on!==false).sort((a,b)=>(a.order||99)-(b.order||99));}

let U=null,name=null,ref=null,view="home",busy=false,hold=false,authMode="login",cur=null,cat="الكل",gameCat="الكل",apLast=null,crLock=false,crFinal=null,crFlight=null,raf=0,crPollTimer=0,betSet=false,toastT=0,ovT=0,wRot=0,payM="",payImg="",plAnimating=false,lastAction=Date.now(),chatOn=false,sportsPick=null,sportsChainDraft=[],sportsChainStake=0,sportsSettleBusy=false,sportsSettleQueued=false,sportScoreStarted=false,sportScoreTimer=0,chatPollTimer=0;
const scU=()=>U?(U.scale||100)/100:1;
const histArr=()=>Array.isArray(U.hist)?U.hist:Object.values(U.hist||{});
function toast(t){const e=$("toast");e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,2800);}
function tpl(s,o){o=o||{};return String(s||"").replace(/\{(\w+)\}/g,(_,k)=>o[k]!=null?o[k]:"");}
function applyCfg(){
  C.texts.payWarn="الرصيد افتراضي للتجربة فقط، ولا توجد تحويلات مالية حقيقية.";
  for(const k in DEFCOL)document.documentElement.style.setProperty("--"+k,C.colors[k]||DEFCOL[k]);
  document.querySelectorAll("[data-t]").forEach(e=>{e.textContent=C.texts[e.dataset.t]||"";});
  document.querySelectorAll("[data-ph]").forEach(e=>{e.placeholder=C.texts[e.dataset.ph]||"";});
  document.title=C.texts.title;
}

setInterval(()=>{
  if((busy||hold)&&Date.now()-lastAction>9000){
    busy=false;hold=false;plAnimating=false;crLock=false;
    document.querySelectorAll(".gl button").forEach(b=>b.disabled=false);
    toast(C.texts.errStuck);
    if(U)render();
  }
},2000);

/* ---------- نافذة النتيجة في نص الشاشة ---------- */
function overlay(win,amt,text){
  $("ovb").className="ovb "+(win?"w":"l");
  $("ovi").textContent=win?"💰":"💥";
  $("ova").textContent=(win?"+":"-")+f(amt);
  $("ovt").textContent=text;
  $("ov").hidden=false;clearTimeout(ovT);ovT=setTimeout(()=>$("ov").hidden=true,2200);
}
$("ov").onclick=()=>{clearTimeout(ovT);$("ov").hidden=true;};

function show(v){
  if(!sportsFeatureEnabled()&&(v==="match"||v==="games"))v="home";
  view=v;["home","match","games","act","more","page","pay","withdraw","me","sup"].forEach(x=>{const node=$("v_"+x);if(node)node.hidden=x!==v;});
  const nv=v==="page"?"more":v==="pay"||v==="withdraw"?"":v==="match"?"home":v;
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===nv));
  window.scrollTo(0,0);
  if(v==="sup")openChat();
  if(v==="games")renderGames();
  if(v==="match")renderSportsMatchDetail();
  if(v==="act"){renderAct();renderChainHub();}
  if(v==="withdraw")updateWithdrawBalance();
}
function gcard(g){
  const th=THEME[g.engine]||THEME.crash,d=el("div","gcard"),art=el("div","art");
  d.classList.add("game-row");
  if(isUrl(g.img)){art.style.backgroundImage='url("'+String(g.img).replace(/["()\s]/g,"")+'")';art.style.backgroundSize="cover";art.style.backgroundPosition="center";}
  else{art.style.background="radial-gradient(circle at 50% 35%,"+th[1]+",#110d06 72%)";const icon=el("span","game-art-icon",EMO[g.engine]||"🎮");icon.setAttribute("aria-hidden","true");art.appendChild(icon);}
  art.appendChild(el("span","tag",g.tag||g.cat||"لعبة"));
  const gi=el("div","gi");gi.appendChild(el("b","",g.name));gi.appendChild(el("p","",g.desc||""));
  const bb=el("button","btn","ابدأ اللعبة");gi.appendChild(bb);
  d.appendChild(art);d.appendChild(gi);d.onclick=()=>openGame(g.id);return d;
}
function matchesList(){
  const o=C.matches||{};
  return Object.keys(o).map(id=>Object.assign({id:id},o[id]||{}))
    .filter(m=>m.title||m.team1&&m.team2)
    .sort((a,b)=>(a.order||999)-(b.order||999));
}
const TEAM_AR={
"AD San Carlos":"أ دي سان كارلوس","Pérez Zeledón":"بيريز زيليدون","Alajuelense":"ألاخولينسي","Sporting San José":"سبورتينغ سان خوسيه",
"Náutico":"ناوتيكو","CRB":"سي آر بي","Instituto (Córdoba)":"إنستيتوتو كوردوبا","Newell's Old Boys":"نيولز أولد بويز",
"Macarthur":"ماكارثر","Brisbane Roar":"بريزبن رور","Adelaide United":"أديلايد يونايتد","Melbourne Victory":"ملبورن فيكتوري",
"Beijing Guoan":"بكين غوان","Chongqing Tonglianglong":"تشونغتشينغ تونغليانغ لونغ","Shanghai Port":"شنغهاي بورت","Liaoning Tieren":"لياونينغ تيرين",
"Shandong Taishan":"شاندونغ تايشان","Chengdu Rongcheng":"تشنغدو رونغتشنغ","Shanghai Shenhua":"شنغهاي شينهوا","Qingdao West Coast":"تشينغداو ويست كوست",
"Zhejiang":"تشجيانغ","Henan":"خنان","Qingdao Hainiu":"تشينغداو هاينيو","Shenzhen Peng City":"شنتشن بينغ سيتي",
"Dalian Yingbo":"داليان ينغبو","Tianjin Jinmen Tiger":"تيانجين جينمن تايغر","Yunnan Yukun":"يونان يويكون","Wuhan Three Towns":"ووهان ثري تاونز",
"Club Brugge":"كلوب بروج","Anderlecht":"أندرلخت","Gent":"جينت","Kortrijk":"كورتريك","WSG Tirol":"دبليو إس جي تيرول","Austria Wien":"أوستريا فيينا",
"Hartberg":"هارتبرغ","Rheindorf Altach":"رايندورف ألتاش","Osijek":"أوسييك","Hajduk Split":"هايدوك سبليت",
"Audax Italiano":"أوداكس إيتاليانو","Coquimbo Unido":"كوكيمبو أونيدو","Universidad Católica":"جامعة كاتوليكا","Deportes Limache":"ديبورتيس ليماشي",
"Sturm Graz":"شتورم غراتس","Red Bull Salzburg":"ريد بول سالزبورغ","Cartaginés":"كارتاخينيس","Escorpiones Belén":"إسكوربيونيس بيلين",
"Union Saint-Gilloise":"يونيون سان جيلواز","Racing Genk":"راسينغ جينك","Ñublense":"نيوبلينسي","Colo Colo":"كولو كولو",
"Universidad de Chile":"جامعة تشيلي","Cobresal":"كوبريسال","Sint-Truiden":"سينت ترويدن","Zulte Waregem":"زولته فاريغيم",
"Independiente Santa Fe":"إنديبندينتي سانتا في","Deportivo Pasto":"ديبورتيفو باستو","Athletic":"أثليتيك","Atlético Goianiense":"أتلتيكو غويانيينسي",
"Nacional Potosí":"ناسيونال بوتوسي","Real Potosí":"ريال بوتوسي","Águilas Doradas":"أغيلاس دوراداس","Independiente Medellín":"إنديبندينتي ميديلين",
"Cúcuta Deportivo":"كوكوتا ديبورتيفو","Jaguares de Córdoba":"جاكواريس دي كوردوبا","Internacional de Bogotá":"إنترناسيونال بوغوتا",
"Llaneros FC":"يانيروس إف سي","Boyacá Chicó FC":"بوياكا تشيكو","Unión La Calera":"أونيون لا كاليرا","Huachipato":"هواشيباتو",
"Deportivo Pereira":"ديبورتيفو بيريرا","Junior":"جونيور","Millonarios":"مليوناريوس","Alianza":"أليانزا",
"Atlético Bucaramanga":"أتلتيكو بوكارامانغا","Fortaleza CEIF":"فورتاليزا","América de Cali":"أمريكا دي كالي",
"Atlético Nacional":"أتلتيكو ناسيونال","Once Caldas":"أونس كالداس","Deportivo Cali":"ديبورتيفو كالي","Deportes Tolima":"ديبورتيس توليما",
"Bolívar":"بوليفار","The Strongest":"ذا سترونغست","Saprissa":"سابريسا","Puntarenas FC":"بونتاريناس إف سي",
"Goiás":"جوياس","Ponte Preta":"بونتي بريتا","Ceará":"سيارا","América Mineiro":"أمريكا مينيرو",
"Central Córdoba (Santiago del Estero)":"سنترال كوردوبا","Lanús":"لانوس","Universidad de Concepción":"جامعة كونسبسيون","O'Higgins":"أوهيغينز",
"Costa Rican Primera División":"الدوري الكوستاريكي الممتاز","Brazilian Serie B":"دوري الدرجة الثانية البرازيلي",
"Argentine Liga Profesional":"الدوري الأرجنتيني الممتاز","Australian A-League Men":"الدوري الأسترالي",
"Chinese Super League":"الدوري الصيني الممتاز","Belgian Pro League":"الدوري البلجيكي الممتاز",
"Austrian Bundesliga":"الدوري النمساوي","Croatia Prva HNL":"الدوري الكرواتي الممتاز",
"Chilean Primera División":"الدوري التشيلي الممتاز","Colombian Primera A":"الدوري الكولومبي الممتاز",
"Bolivian División Profesional":"الدوري البوليفي الممتاز"
};
function arabicTeamName(value){
  const raw=String(value||"").trim();
  if(!raw)return "فريق";
  if(TEAM_AR[raw])return TEAM_AR[raw];
  if(/[\\u0600-\\u06FF]/.test(raw))return raw;
  const special=[[/\\bUnited\\b/gi," يونايتد"],[/\\bCity\\b/gi," سيتي"],[/\\bFC\\b/gi," إف سي"],[/\\bClub\\b/gi," كلوب"],[/\\bAthletic\\b/gi," أتلتيك"],[/\\bReal\\b/gi," ريال"],[/\\bDeportivo\\b/gi," ديبورتيفو"],[/\\band\\b/gi," و "],[/&/g," و "]];
  let s=raw;special.forEach(([re,to])=>s=s.replace(re,to));
  const letters={a:"ا",b:"ب",c:"ك",d:"د",e:"ي",f:"ف",g:"ج",h:"ه",i:"ي",j:"ج",k:"ك",l:"ل",m:"م",n:"ن",o:"و",p:"ب",q:"ك",r:"ر",s:"س",t:"ت",u:"و",v:"ف",w:"و",x:"كس",y:"ي",z:"ز"};
  return s.replace(/[A-Za-z]+/g,word=>word.toLowerCase().split("").map(ch=>letters[ch]||ch).join("")).replace(/\\s+/g," ").trim();
}

function teamLogo(team){
  const wrap=el("div","match-team");
  const logoUrl=isUrl(team.logo)?team.logo:(Number(team.id)>0?APP_API+"?team_logo="+encodeURIComponent(String(team.id)):"");
  if(logoUrl){
    const im=document.createElement("img");im.className="team-logo";im.src=logoUrl;im.alt=arabicTeamName(team.name)||"شعار الفريق";im.loading="lazy";
    im.onerror=()=>{const fb=el("div","team-logo-fallback",arabicTeamName(team.name).slice(0,1));im.replaceWith(fb);};
    wrap.appendChild(im);
  }else{
    wrap.appendChild(el("div","team-logo-fallback",arabicTeamName(team.name).slice(0,1)));
  }
  wrap.appendChild(el("b","",arabicTeamName(team.name)));return wrap;
}
function matchKickoffPassed(match){
  const kickoff=Number(match&&match.kickoffAt)||0;
  return kickoff>0&&Date.now()>=kickoff;
}
function matchProfitFactor(match){
  const percent=Number(match&&match.profitPercent);
  return Math.max(.1,Math.min(5,(Number.isFinite(percent)&&percent>0?percent:100)/100));
}
let sportsDetailMatchId="";
function sportsMarketKind(marketId,market){
  const id=String(marketId||"").toLowerCase().trim();
  const title=String(market?.title||"").toLowerCase().trim();
  const entries=Object.entries(market?.options||{});
  const ids=entries.map(([key])=>String(key).toLowerCase());
  const labels=entries.map(([,value])=>String(value?.label||"").toLowerCase());
  const all=[id,title,...ids,...labels].join(" ");
  const scoreKeys=ids.filter(key=>/^\\d+\\s*[-:]\\s*\\d+$/.test(key));
  const correctScore=/correct\\s*score|النتيجة\\s*(?:الصحيحة|الصحيحه)|نتيجة\\s*(?:صحيحة|صحيحه)/i.test(all);
  if(correctScore||scoreKeys.length>=2)return "correct_score";
  const knownGoals=["over_under_1_5","over_under_15","total_goals_1_5","goals_1_5"];
  const hasOverUnder=/(?:over|under|أكثر\\s*من|أقل\\s*من|اقل\\s*من)/i.test(all);
  const hasLine15=/1[.,_ ]5|واحد\\s*ونص/i.test(all)||Number(market?.line)===1.5;
  if(knownGoals.includes(id)||(hasOverUnder&&hasLine15))return "over_under_1_5";
  const aliases={home:["home","1","team1","home_win"],draw:["draw","x","tie"],away:["away","2","team2","away_win"]};
  const hasResult=ids.some(x=>aliases.home.includes(x))&&ids.some(x=>aliases.draw.includes(x))&&ids.some(x=>aliases.away.includes(x));
  if(["result","1x2","match_result","match_winner"].includes(id)||hasResult)return "result";
  return "other";
}
function sportsResultMarket(match){
  return Object.entries(match.markets||{}).find(([id,market])=>sportsMarketKind(id,market)==="result")||null;
}
function sportsSideOption(market,side){
  const aliases={home:["home","1","team1","home_win"],draw:["draw","x","tie"],away:["away","2","team2","away_win"]};
  const entries=Object.entries(market.options||{});
  return entries.find(([id])=>aliases[side].includes(String(id).toLowerCase()))||null;
}
function sportsOptionLabel(match,side,opt){
  if(side==="home")return arabicTeamName(match.team1?.name||String(opt?.label||C.texts.team1Fallback||"الفريق الأول"));
  if(side==="away")return arabicTeamName(match.team2?.name||String(opt?.label||C.texts.team2Fallback||"الفريق الثاني"));
  return String(opt?.label||C.texts.drawLabel||"التعادل").replace(/\{team1\}/g,arabicTeamName(match.team1?.name||C.texts.team1Fallback||"الفريق الأول")).replace(/\{team2\}/g,arabicTeamName(match.team2?.name||C.texts.team2Fallback||"الفريق الثاني"));
}
function sportsMatchLocked(match,market){
  return (match.status||"open")!=="open"||matchKickoffPassed(match)||(market?.status||"open")!=="open";
}
function matchIsFinished(match){
  const status=String(match.status||"").toLowerCase();
  if(["settled","finished","completed","ended","ft","full_time","aet","pens"].includes(status))return true;
  const result=sportsResultMarket(match)?.[1];
  if(String(result?.status||"").toLowerCase()==="settled")return true;
  const markets=Object.values(match.markets||{}).filter(m=>m&&typeof m==="object");
  return markets.length>0&&markets.every(m=>["settled","cancelled","void"].includes(String(m.status||"").toLowerCase()));
}
function renderMatches(){
  const box=$("matchesList"),empty=$("matchesEmpty");if(!box||!empty)return;
  box.innerHTML="";
  const items=matchesList().filter(m=>m.visible!==false&&!matchIsFinished(m));
  const canBet=items.filter(m=>(m.status||"open")==="open"&&!matchKickoffPassed(m)&&
    (sportsResultMarket(m)?.[1]?.status||"open")==="open");
  const locked=items.filter(m=>!canBet.includes(m));
  const makeCard=match=>{
    const entry=sportsResultMarket(match),market=entry?.[1];
    const card=el("article","match-card sports-match-card");card.tabIndex=0;card.setAttribute("role","button");
    card.onclick=()=>openSportsMatch(match.id);
    card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openSportsMatch(match.id);}};
    const meta=el("div","match-meta");
    meta.appendChild(el("span","",arabicTeamName(match.title||"مباراة اليوم")+(match.date?" • "+match.date:"")));
    const open=canBet.includes(match);
    const status=open?(C.texts.matchOpenStatus||"متاحة للتوقعات"):(C.texts.matchStartedStatus||"بدأت المباراة — التوقعات مغلقة");
    const state=el("span","match-live",status);
    if(!open){state.style.background="#fff4e5";state.style.color="#9a641d";}
    meta.appendChild(state);card.appendChild(meta);
    const teams=el("div","match-teams");teams.appendChild(teamLogo(match.team1||{}));teams.appendChild(el("div","match-vs","VS"));teams.appendChild(teamLogo(match.team2||{}));card.appendChild(teams);
    const quick=el("div","match-market");quick.appendChild(el("div","match-quick-label",C.texts.marketResultTitle||"نتيجة المباراة"));
    const outcomes=el("div","match-outcomes match-quick-outcomes");
    if(market){
      ["home","draw","away"].forEach(side=>{
        const pair=sportsSideOption(market,side),cell=el("div","match-outcome");
        if(pair){const opt=pair[1],label=sportsOptionLabel(match,side,opt);
          cell.appendChild(el("b","",side==="draw"?(C.texts.drawLabel||"التعادل"):(C.texts.homeWinPrefix||"فوز ")+label));
          cell.appendChild(el("small","","×"+r2(Number(opt.odds||1)*matchProfitFactor(match)).toFixed(2)));
        }else cell.appendChild(el("b","","—"));
        outcomes.appendChild(cell);
      });
    }else outcomes.appendChild(el("div","match-result",C.texts.noMatchMarkets||"اختيارات المباراة غير متاحة"));
    quick.appendChild(outcomes);card.appendChild(quick);return card;
  };
  const addSection=(title,subtitle,list)=>{
    if(!list.length)return;
    box.appendChild(el("div","match-group-title",title+" "));
    if(subtitle)box.lastChild.appendChild(el("span","match-group-sub",subtitle));
    list.forEach(m=>box.appendChild(makeCard(m)));
  };
  canBet.sort((a,b)=>(Number(a.kickoffAt)||0)-(Number(b.kickoffAt)||0));
  locked.sort((a,b)=>(Number(b.kickoffAt)||0)-(Number(a.kickoffAt)||0));
  addSection("مباريات قادمة","متاحة للمراهنة",canBet);
  addSection("مباريات مباشرة أو مغلقة","لا يمكن المراهنة الآن",locked);
  $("matchesCount").textContent=items.length+" "+(C.texts.matchesCountSuffix||"مباراة");
  empty.hidden=items.length>0;
}
let sportsScrollY=0;
function openSportsMatch(matchId){if(!sportsFeatureEnabled())return;sportsScrollY=window.scrollY||window.pageYOffset||0;sportsDetailMatchId=String(matchId||"");show("match");}
function sportsMarketEntries(match){
  const entries=Object.entries(match.markets||{});
  const result=sportsResultMarket(match);
  const correct=entries.find(([id,market])=>sportsMarketKind(id,market)==="correct_score")||null;
  const goals=entries.find(([id,market])=>sportsMarketKind(id,market)==="over_under_1_5")||null;
  const ordered=[];
  if(result)ordered.push(result);
  if(correct&&correct[0]!==result?.[0])ordered.push(correct);
  if(goals&&goals[0]!==result?.[0]&&goals[0]!==correct?.[0])ordered.push(goals);
  return ordered;
}
function sportsMarketTitle(marketId,market){
  if(market.title)return arabicTeamName(market.title);
  const kind=sportsMarketKind(marketId,market);
  if(kind==="result")return C.texts.marketResultTitle||"نتيجة المباراة";
  if(kind==="correct_score")return C.texts.marketCorrectScoreTitle||"النتيجة الصحيحة";
  return C.texts.marketOverUnder15Title||"أكثر / أقل من 1.5 هدف";
}
function sportsMarketOptionLabel(marketId,optionId,opt,match){
  const kind=sportsMarketKind(marketId,market);
  const id=String(optionId||"").toLowerCase();
  const label=String(opt?.label||"").trim();
  if(kind==="result"){
    if(["home","1","team1","home_win"].includes(id))return sportsOptionLabel(match,"home",opt);
    if(["away","2","team2","away_win"].includes(id))return sportsOptionLabel(match,"away",opt);
    if(["draw","x","tie"].includes(id))return sportsOptionLabel(match,"draw",opt);
  }
  if(kind==="correct_score"&&(id==="other"||label.toLowerCase()==="other"))return C.texts.otherScoreLabel||"نتيجة أخرى";
  if(kind==="over_under_1_5"){
    if(["over","over_1_5","more"].includes(id)||/over|أكثر\\s*من/i.test(label))return C.texts.over15Label||"أكثر من 1.5";
    if(["under","under_1_5","less"].includes(id)||/under|أقل\\s*من|اقل\\s*من/i.test(label))return C.texts.under15Label||"أقل من 1.5";
  }
  return arabicTeamName(String(opt?.label||optionId||"—"));
}
function sportsOptionEntries(marketId,market,match){
  const options=market.options||{};
  if(sportsMarketKind(marketId,market)==="result"){
    return ["home","draw","away"].map(side=>{
      const p=sportsSideOption(market,side);
      return p?[p[0],p[1],sportsMarketOptionLabel(marketId,p[0],p[1],match)]:null;
    }).filter(Boolean);
  }
  return Object.entries(options).map(([id,opt])=>[id,opt,sportsMarketOptionLabel(marketId,id,opt,match)]);
}
function renderSportsMatchBets(match){
  const bets=Object.values(U?.sportsBets||{}).filter(b=>String(b.matchId)===String(match.id)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const wrap=el("section","sports-my-bets");
  wrap.appendChild(el("div","sports-detail-section-title",C.texts.userBetsTitle||"توقعاتك على المباراة"));
  if(!bets.length){wrap.appendChild(el("div","empty",C.texts.noUserBets||"لم تسجل أي توقع على هذه المباراة بعد."));return wrap;}
  bets.forEach(b=>{
    const item=el("div","sports-my-bet"),main=el("div","sports-my-bet-main");
    main.appendChild(el("b","",(b.marketTitle?b.marketTitle+" — ":"")+String(b.optionLabel||"الاختيار")+" • "+f(b.stake)));
    const expected=r2(Number(b.stake)*Math.max(0,Number(b.odds||0)-1));
    main.appendChild(el("div","",b.status==="pending"?(C.texts.expectedProfitLabel||"المكسب المتوقع")+": "+f(expected):b.status==="won"?(C.texts.wonProfitLabel||"المكسب")+": "+f(Number(b.payout||0)-Number(b.stake)):b.status==="lost"?(C.texts.matchEndedText||"انتهت المباراة"):(C.texts.betVoidedText||"تم إلغاء التوقع")));
    const status=b.status||"pending";
    const state=el("span","sports-my-bet-state "+(status==="won"?"won":status==="lost"?"lost":"pending"),status==="won"?(C.texts.betWonStatus||"✓ كسبت"):status==="lost"?(C.texts.betLostStatus||"✕ خسرت"):status==="pending"?(C.texts.betPendingStatus||"قيد المتابعة"):(C.texts.betVoidStatus||"ملغي"));
    item.appendChild(main);item.appendChild(state);wrap.appendChild(item);
  });
  return wrap;
}
function renderSportsMatchDetail(){
  const box=$("matchDetail");if(!box)return;box.innerHTML="";
  const match=matchesList().find(m=>String(m.id)===sportsDetailMatchId);
  if(!match){box.appendChild(el("div","empty",C.texts.matchUnavailable||"المباراة غير متاحة."));return;}
  $("matchDetailTitle").textContent=arabicTeamName(match.title||C.texts.matchDetailTitle||"تفاصيل المباراة");
  const card=el("section","sports-detail-card"),meta=el("div","sports-detail-meta");
  meta.appendChild(el("span","",arabicTeamName(match.title||C.texts.matchDetailTitle||"مباراة")));
  const status=match.status==="settled"?(C.texts.matchFinishedStatus||"انتهت"):match.minute?String(match.minute):matchKickoffPassed(match)?(C.texts.matchStartedStatus||"بدأت"):(C.texts.matchWaitingStatus||"لم تبدأ");
  meta.appendChild(el("b","",status));card.appendChild(meta);
  const teams=el("div","sports-detail-teams");teams.appendChild(teamLogo(match.team1||{}));
  const score=el("div","sports-detail-score"),sc=match.score||{};
  score.textContent=sc.home!=null&&sc.away!=null?String(sc.home)+" - "+String(sc.away):"VS";
  score.appendChild(el("small","",match.date||""));teams.appendChild(score);
  teams.appendChild(teamLogo(match.team2||{}));card.appendChild(teams);
  const markets=sportsMarketEntries(match);
  if(markets.length){
    markets.forEach(([marketId,market])=>{
      const section=el("section","sports-detail-market");
      section.appendChild(el("div","sports-detail-section-title",sportsMarketTitle(marketId,market)));
      const options=el("div","sports-detail-options"),locked=sportsMatchLocked(match,market);
      const entries=sportsOptionEntries(marketId,market,match);
      entries.forEach(([optionId,opt,label])=>{
        const adjusted=r2(Number(opt.odds||1)*matchProfitFactor(match));
        const button=el("button","match-outcome sports-longpick");button.type="button";button.disabled=locked;
        button.appendChild(el("b","",label));button.appendChild(el("small","","×"+adjusted.toFixed(2)));
        button.appendChild(el("span","pick-check","✓"));
        let timer=0,longPicked=false;
        const cancel=()=>{if(timer){clearTimeout(timer);timer=0;}};
        button.addEventListener("pointerdown",e=>{
          if(button.disabled||e.button!==0)return;longPicked=false;cancel();
          timer=setTimeout(()=>{
            timer=0;longPicked=true;
            options.querySelectorAll(".sports-longpick.selected").forEach(x=>x.classList.remove("selected"));
            button.classList.add("selected");
            setTimeout(()=>openSportsModal(match,market,marketId,optionId,{...opt,label:label,odds:adjusted,baseOdds:Number(opt.odds||1),profitPercent:Number(match.profitPercent)||100}),180);
          },1000);
        });
        ["pointerup","pointerleave","pointercancel"].forEach(ev=>button.addEventListener(ev,cancel));
        button.addEventListener("contextmenu",e=>e.preventDefault());
        button.addEventListener("click",e=>{e.stopPropagation();if(!longPicked)toast(C.texts.longPressToast||"اضغط مطولًا لمدة ثانية لاختيار النتيجة");longPicked=false;});
        options.appendChild(button);
      });
      section.appendChild(options);
      section.appendChild(el("div","sports-detail-hint",locked?(C.texts.closedMarketHint||"التوقعات مغلقة لهذه المباراة"):(C.texts.longPressHint||"اضغط مطولًا ثانية واحدة على الاختيار")));
      if(market.status==="settled"&&market.resultOptionId){
        const winner=market.options?.[market.resultOptionId];
        const winnerLabel=sportsMarketOptionLabel(marketId,market.resultOptionId,winner||{},match);
        section.appendChild(el("div","match-result",(C.texts.confirmedResultPrefix||"النتيجة المعتمدة:")+" "+winnerLabel));
      }else if(market.status==="cancelled"){
        section.appendChild(el("div","match-result",C.texts.marketCancelledText||"تم إلغاء هذا السوق وإرجاع الرصيد."));
      }
      card.appendChild(section);
    });
  }else card.appendChild(el("div","matches-empty",C.texts.noMatchMarkets||"لا توجد اختيارات متاحة لهذه المباراة."));
  box.appendChild(card);
  box.appendChild(el("div","sports-detail-hint",C.texts.marketTimingHint||"تُحتسب توقعات المباراة على الوقت الأصلي والوقت بدل الضائع فقط. أكثر من 1.5 يتحسم عند تسجيل الهدف الثاني."));
  box.appendChild(renderSportsMatchBets(match));
}
let sportsFeedTimer=0,sportsFeedBusy=false;
async function runSportsFeedSync(){
  if(!U||!sportsFeatureEnabled()||sportsFeedBusy)return;
  sportsFeedBusy=true;
  try{
    await apiCall("sports_feed_sync",{});
    await loadPublicConfig();
  }catch(e){console.warn("sports feed sync",e);}
  finally{sportsFeedBusy=false;}
}
function initSportScoreFeed(){
  if(sportsFeedTimer)clearInterval(sportsFeedTimer);
  sportsFeedTimer=0;
  if(!sportsFeatureEnabled())return;
  runSportsFeedSync();
  sportsFeedTimer=setInterval(()=>{
    if(U&&document.visibilityState!=="hidden")runSportsFeedSync();
  },5*60*1000);
}

function openSportsModal(match,market,marketId,optionId,option){
  if(sportsMatchLocked(match,market))return toast(C.texts.matchLockToast||"بدأت المباراة أو أُغلقت التوقعات");
  sportsPick={matchId:match.id,match:match,marketId:marketId,market:market,optionId:optionId,option:option};
  $("sportsModalTitle").textContent=(C.texts.selectionTitle||"تأكيد الاختيار")+" — "+arabicTeamName(match.team1?.name||"الفريق الأول")+" × "+arabicTeamName(match.team2?.name||"الفريق الثاني");
  $("sportsModalPick").textContent=sportsMarketTitle(String(sportsPick.marketId),market)+" — "+sportsMarketOptionLabel(String(sportsPick.marketId),String(sportsPick.optionId),option,match)+" — ×"+Number(option.odds).toFixed(2);
  $("sportsStake").value="";$("sportsModalMsg").textContent="";
  updateSportsPotential();$("sportsModal").hidden=false;
}
function closeSportsModal(){sportsPick=null;$("sportsModal").hidden=true;}
function addSportsPickToChain(){
  if(!sportsPick||!U)return;
  const p=sportsPick;
  if(sportsChainDraft.some(x=>String(x.matchId)===String(p.matchId))){
    $("sportsModalMsg").textContent="اختر مباراة مختلفة لكل حلقة في السلسلة.";return;
  }
  if(!sportsChainDraft.length)sportsChainStake=Number(C.settings.defBet)||100;
  sportsChainDraft.push({
    matchId:String(p.matchId),marketId:String(p.marketId),optionId:String(p.optionId),
    team1:String(p.match.team1?.name||"الفريق الأول"),team2:String(p.match.team2?.name||"الفريق الثاني"),
    team1Logo:String(p.match.team1?.logo||""),team2Logo:String(p.match.team2?.logo||""),
    matchTitle:String(p.match.title||"مباراة"),marketTitle:sportsMarketTitle(String(p.marketId),p.market),
    optionLabel:sportsMarketOptionLabel(String(p.marketId),String(p.optionId),p.option,p.match),
    odds:r2((Number(p.option.odds)||0)*matchProfitFactor(p.match))
  });
  closeSportsModal();activityType="sports";show("act");renderChainHub();renderAct();
  toast("أُضيف الاختيار للسلسلة. يمكنك اختيار مباراة أخرى أو تعديل السلسلة من النشاط.");
}
function reorderChainPick(index,delta){
  const next=index+delta;if(next<0||next>=sportsChainDraft.length)return;
  const copy=[...sportsChainDraft];[copy[index],copy[next]]=[copy[next],copy[index]];
  sportsChainDraft=copy;renderChainHub();
}
function removeChainPick(index){sportsChainDraft=sportsChainDraft.filter((x,i)=>i!==index);renderChainHub();}
async function placeSportsChain(){
  if(!U||busy||sportsChainDraft.length<2)return;
  const stakeValue=r2(Number(nd($("chainStake").value)));
  const msg=$("chainMessage"),button=$("chainPlace");
  const bad=t=>{msg.textContent=t;msg.style.color="var(--er)";};
  if(!Number.isFinite(stakeValue)||stakeValue<=0)return bad("اكتب مبلغًا صحيحًا للسلسلة.");
  if(stakeValue>Number(U.balance||0))return bad("المبلغ أكبر من رصيدك الافتراضي المتاح.");
  const combinedOdds=chainOddsTotal();
  if(!Number.isFinite(combinedOdds)||combinedOdds<1)return bad("تعذر حساب المعامل الإجمالي للاختيارات.");
  if(stakeValue*combinedOdds>999999999999.99)return bad("إجمالي العائد المتوقع يتجاوز الحد الأعلى المسموح به. قلل مبلغ الرهان أو عدد الاختيارات.");
  button.disabled=true;msg.textContent="جارٍ التحقق من جميع اختيارات السلسلة...";msg.style.color="";
  try{
    const data=await apiCall("sports_chain",{
      stake:stakeValue,idempotencyKey:crypto.randomUUID(),
      picks:sportsChainDraft.map(x=>({matchId:x.matchId,marketId:x.marketId,optionId:x.optionId}))
    });
    U.balance=Number(data.balance);sportsChainDraft=[];sportsChainStake=0;
    await refreshMe(false);render();
    toast("تم تسجيل السلسلة بالترتيب الذي اخترته.");
  }catch(e){bad(e.message||"تعذر تسجيل السلسلة.");}
  finally{button.disabled=false;}
}
function chainOddsTotal(){return sportsChainDraft.reduce((product,p)=>Math.round(product*Math.max(0,Number(p.odds)||0)*10000)/10000,1);}
function updateChainEstimate(){
  const odds=chainOddsTotal(),stake=Number(nd($("chainStake")?.value||sportsChainStake))||0;
  if($("chainTotalOdds"))$("chainTotalOdds").textContent="×"+odds.toFixed(2);
  const total=r2(stake*odds),principal=r2(stake),profit=Math.max(0,r2(total-principal));
  if($("chainPotentialReturn"))$("chainPotentialReturn").textContent=f(profit);
  if($("chainPrincipalReturn"))$("chainPrincipalReturn").textContent=f(principal);
  if($("chainTotalReturn"))$("chainTotalReturn").textContent=f(total);
}
function renderChainHub(){
  const box=$("chainActivity");if(!box)return;
  if(!U||activityType!=="sports"||!sportsChainDraft.length){box.hidden=true;box.innerHTML="";return;}
  box.hidden=false;box.innerHTML="";
  const title=el("div","chain-hub-title");
  title.appendChild(el("b","","⛓️ قسيمة السلسلة"));
  title.appendChild(el("small","","اختياراتك المختارة — راجع الفرق والمعامل قبل التأكيد"));
  box.appendChild(title);
  const draft=el("div","chain-draft-card");
  draft.appendChild(el("div","chain-card-title","الاختيارات داخل السلسلة"));
  const list=el("div","chain-picks");
  sportsChainDraft.forEach((pick,i)=>{
    const row=el("div","chain-pick"),info=el("div","chain-pick-info"),teams=el("div","chain-pick-teams");
    const team=(logo,name)=>{
      const item=el("div","chain-pick-team");
      if(isUrl(logo)){const img=document.createElement("img");img.src=logo;img.alt=arabicTeamName(name);img.loading="lazy";item.appendChild(img);}
      else item.appendChild(el("span","chain-team-fallback",String(name||"؟").slice(0,1)));
      item.appendChild(el("b","",arabicTeamName(name)));return item;
    };
    teams.appendChild(team(pick.team1Logo,pick.team1));
    teams.appendChild(el("span","chain-vs","×"));
    teams.appendChild(team(pick.team2Logo,pick.team2));
    info.appendChild(teams);
    info.appendChild(el("small","",arabicTeamName(pick.matchTitle)+" • "+pick.marketTitle+" • "+arabicTeamName(pick.optionLabel)));
    info.appendChild(el("strong","","معامل الاختيار ×"+Number(pick.odds||0).toFixed(2)));
    row.appendChild(info);
    const actions=el("div","chain-pick-actions");
    const up=el("button","chain-order-btn","↑");up.type="button";up.title="تقديم الاختيار";up.disabled=i===0;up.onclick=()=>reorderChainPick(i,-1);
    const down=el("button","chain-order-btn","↓");down.type="button";down.title="تأخير الاختيار";down.disabled=i===sportsChainDraft.length-1;down.onclick=()=>reorderChainPick(i,1);
    const del=el("button","chain-remove-btn","حذف");del.type="button";del.onclick=()=>removeChainPick(i);
    actions.appendChild(up);actions.appendChild(down);actions.appendChild(del);row.appendChild(actions);list.appendChild(row);
  });
  draft.appendChild(list);
  const estimate=el("div","chain-estimate"),oddsBox=el("div","chain-estimate-item"),profitBox=el("div","chain-estimate-item"),principalBox=el("div","chain-estimate-item"),totalBox=el("div","chain-estimate-item total");
  oddsBox.appendChild(el("small","","المعامل الإجمالي — ضرب معاملات الاختيارات"));
  const ov=el("b","","×0.00");ov.id="chainTotalOdds";oddsBox.appendChild(ov);
  profitBox.appendChild(el("small","","المكسب المتوقع"));
  const rv=el("b","","0");rv.id="chainPotentialReturn";profitBox.appendChild(rv);
  principalBox.appendChild(el("small","","أصل الرهان المسترد"));
  const pv=el("b","","0");pv.id="chainPrincipalReturn";principalBox.appendChild(pv);
  totalBox.appendChild(el("small","","إجمالي العائد المتوقع"));
  const tv=el("b","","0");tv.id="chainTotalReturn";totalBox.appendChild(tv);
  estimate.appendChild(oddsBox);estimate.appendChild(profitBox);estimate.appendChild(principalBox);estimate.appendChild(totalBox);draft.appendChild(estimate);
  const label=el("label","chain-stake-label","مبلغ السلسلة");
  const stake=el("input","chain-stake-input");stake.id="chainStake";stake.type="number";stake.min="0.01";stake.step="0.01";stake.inputMode="decimal";
  stake.value=String(sportsChainStake||C.settings.defBet||100);
  stake.oninput=()=>{sportsChainStake=Number(stake.value)||0;updateChainEstimate();};
  draft.appendChild(label);draft.appendChild(stake);
  draft.appendChild(el("div","chain-balance-note","الرصيد الافتراضي المتاح: "+f(U.balance||0)));
  draft.appendChild(el("div","chain-formula-note","مثال: 5 اختيارات بمعامل 2.00 لكل اختيار = 32.00x. رهان 1,000: المكسب 31,000 + استرداد أصل الرهان 1,000 = إجمالي عائد 32,000 عند نجاح كل الاختيارات."));
  const msg=el("div","chain-message");msg.id="chainMessage";draft.appendChild(msg);
  const actions=el("div","chain-main-actions");
  const place=el("button","btn full","تأكيد السلسلة");place.id="chainPlace";place.type="button";place.onclick=placeSportsChain;actions.appendChild(place);
  const clear=el("button","btn g","حذف السلسلة بالكامل");clear.type="button";
  clear.onclick=()=>{sportsChainDraft=[];sportsChainStake=0;renderChainHub();renderAct();};
  actions.appendChild(clear);draft.appendChild(actions);box.appendChild(draft);updateChainEstimate();
}
function updateSportsPotential(){
  const amount=Number(nd($("sportsStake").value)),odds=sportsPick?Number(sportsPick.option.odds):0;
  const total=amount>0&&odds>0?r2(amount*odds):0;
  const principal=amount>0?amount:0;
  const profit=Math.max(0,r2(total-principal));
  $("sportsPotential").textContent=f(profit);
  $("sportsStakeReturn").textContent=f(principal);
  $("sportsTotalReturn").textContent=f(total);
}
async function placeSportsBet(){
  if(!sportsPick||!U||busy)return;
  const choice=sportsPick,stakeValue=r2(Number(nd($("sportsStake").value)));
  if(!Number.isFinite(stakeValue)||stakeValue<=0){$("sportsModalMsg").textContent=C.texts.betAmountError||"اكتب مبلغًا صحيحًا أكبر من صفر";return;}
  $("sportsPlaceBtn").disabled=true;$("sportsModalMsg").textContent=C.texts.betSavingMessage||"جارٍ التحقق وتسجيل التوقع على الخادم...";
  try{
    const data=await apiCall("sports_bet",{matchId:String(choice.matchId),marketId:String(choice.marketId),optionId:String(choice.optionId),stake:stakeValue,idempotencyKey:crypto.randomUUID()});
    U.balance=Number(data.balance);closeSportsModal();await refreshMe(false);render();toast(C.texts.betSuccessToast||"تم تسجيل التوقع بنجاح.");
  }catch(e){$("sportsModalMsg").textContent=e.message||C.texts.betFailureMessage||"تعذر تسجيل التوقع.";}
  finally{$("sportsPlaceBtn").disabled=false;}
}
async function settleUserSportsBets(){
  if(!U||sportsSettleBusy)return;
  sportsSettleBusy=true;
  try{await refreshMe(false);}
  catch(e){console.warn("sports bet refresh",e);}
  finally{sportsSettleBusy=false;if(sportsSettleQueued){sportsSettleQueued=false;settleUserSportsBets();}}
}
$("sportsStake").oninput=updateSportsPotential;
$("sportsModalClose").onclick=closeSportsModal;
$("sportsModal").addEventListener("click",e=>{if(e.target.id==="sportsModal")closeSportsModal();});
$("sportsPlaceBtn").onclick=placeSportsBet;
$("sportsChainAddBtn").onclick=addSportsPickToChain;
function sportsFeatureEnabled(){return C.settings.sportsEnabled!==false;}
function renderHomeGames(){
  const section=$("gamesHomeSection"),list=$("gamesHomeList"),count=$("gamesHomeCount");
  if(!section||!list)return;
  const enabled=sportsFeatureEnabled();section.hidden=enabled;
  if(enabled){list.innerHTML="";if(count)count.textContent="";return;}
  const available=games().filter(gOn);list.innerHTML="";
  available.forEach(g=>list.appendChild(gcard(g)));
  if(count)count.textContent=available.length+" لعبة";
}
function applySportsAvailability(){
  const enabled=sportsFeatureEnabled();
  if(enabled!==lastSportsEnabled){activityType=enabled?"sports":"games";lastSportsEnabled=enabled;}
  const sportsHome=$("sportsHomeSection"),gamesHome=$("gamesHomeSection");
  if(sportsHome)sportsHome.hidden=!enabled;
  const gamesNav=document.querySelector('.nav button[data-v="games"]');
  if(gamesNav)gamesNav.hidden=!enabled;
  const sportsActivity=document.querySelector('#activityMenu [data-activity="sports"]');
  if(sportsActivity)sportsActivity.hidden=!enabled;
  const gameActivity=document.querySelector('#activityMenu [data-activity="games"]');
  if(gameActivity)gameActivity.hidden=false;
  const activityPick=$("activityPick"),activityMenu=$("activityMenu");
  if(!enabled){
    activityType="games";
    sportsChainDraft=[];sportsChainStake=0;sportsPick=null;
    if(activityPick)activityPick.hidden=true;
    if(activityMenu)activityMenu.hidden=true;
    if($("chainActivity"))$("chainActivity").hidden=true;
    if($("sportsModal"))$("sportsModal").hidden=true;
    if(view==="match"||view==="games"){
      view="home";
      ["home","match","games","act","more","page","pay","withdraw","me","sup"].forEach(x=>{const node=$("v_"+x);if(node)node.hidden=x!=="home";});
      document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.v==="home"));
      window.scrollTo(0,0);
    }
  }else{
    if(activityPick)activityPick.hidden=false;
  }
  renderHomeGames();
}
function renderHome(){
  const bn=$("ban"),im=String(C.texts.banImg||"").trim();
  bn.style.backgroundImage=isUrl(im)?'linear-gradient(120deg,#0B1E3Acc,#1677D299),url("'+im.replace(/["()\s]/g,"")+'")':"";
  bn.style.backgroundSize="cover";bn.style.backgroundPosition="center";
}
function renderGames(){
  const L=games().filter(gOn),cats=["الكل"].concat([...new Set(L.map(g=>g.cat).filter(Boolean))]);
  if(!cats.includes(gameCat))gameCat="الكل";
  const c=$("gamesCats");c.innerHTML="";
  cats.forEach(x=>{const b=el("button","chip"+(x===gameCat?" on":""),x);b.onclick=()=>{gameCat=x;renderGames();};c.appendChild(b);});
  const q=$("gamesQ").value.trim().toLowerCase();
  const F=L.filter(g=>(gameCat==="الكل"||g.cat===gameCat)&&(!q||(g.name+" "+(g.desc||"")+" "+(g.tag||"")).toLowerCase().includes(q)));
  const list=$("gamesList");list.innerHTML="";F.forEach(g=>list.appendChild(gcard(g)));
  $("gamesEmpty").hidden=F.length>0;$("gamesCount").textContent=F.length+" لعبة";
}
let activityType="sports",lastSportsEnabled=true;
function renderAct(){
  if(!sportsFeatureEnabled())activityType="games";
  const box=$("hist2"),stats=$("activityStats");box.innerHTML="";stats.innerHTML="";
  const games=histArr().slice(-100).reverse();
  const sports=Object.values(U.sportsBets||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const chains=U.sportsChains||[];
  const chainBox=$("chainActivity");if(chainBox)chainBox.hidden=activityType!=="sports"||!sportsChainDraft.length;
  const count=activityType==="sports"?sports.length+chains.length:games.length;
  const wins=activityType==="sports"?
    sports.filter(x=>x.status==="won").length+chains.reduce((n,c)=>n+c.legs.filter(l=>l.result==="won").length,0):
    games.filter(x=>Number(x.win)>Number(x.bet)).length;
  const losses=activityType==="sports"?
    sports.filter(x=>x.status==="lost").length+chains.reduce((n,c)=>n+c.legs.filter(l=>l.result==="lost").length,0):
    games.filter(x=>Number(x.win)<Number(x.bet)).length;
  [[activityType==="sports"?"رهانات رياضية":"رهانات ألعاب",count],["مرات الفوز",wins],["مرات الخسارة",losses]].forEach(([label,value])=>{
    const item=el("div","sb");item.appendChild(el("b","",String(value)));item.appendChild(el("span","",label));stats.appendChild(item);
  });
  $("activityPick").setAttribute("aria-label","اختيار مراهنات الألعاب أو الرياضية");
  if(!count){box.appendChild(el("div","empty","لا توجد "+(activityType==="sports"?"مراهنات رياضية":"مراهنات ألعاب")+" مسجلة حتى الآن."));return;}
  if(activityType==="games"){
    games.forEach(x=>{
      const net=r2(Number(x.win)-Number(x.bet)),game=gById(x.g),item=el("div","activity-entry");
      item.appendChild(el("div","activity-entry-title",(game?(EMO[game.engine]||"🎮 ")+game.name:"🎮 لعبة")));
      item.appendChild(el("div","activity-entry-meta","قيمة الرهان: "+f(x.bet)+" • العائد: "+f(x.win)));
      item.appendChild(el("div","activity-entry-state "+(net>0?"up":net<0?"dn":""),net>0?"كسبت "+f(net):net<0?"خسرت "+f(-net):"تعادل"));
      item.appendChild(el("div","activity-entry-meta",x.t?new Date(x.t).toLocaleString("ar-EG"):""));box.appendChild(item);
    });
    return;
  }
  sports.forEach(b=>{
    const won=b.status==="won",lost=b.status==="lost",pendingStatus=b.status==="pending";
    const state=won?"مكسب "+f(Math.max(0,Number(b.payout||0)-Number(b.stake||0)))+" + استرداد أصل الرهان "+f(b.stake||0):
      lost?"خسرت "+f(b.stake||0):pendingStatus?"قيد المتابعة":(C.texts.betVoidStatus||"ملغي");
    const teams=b.team1&&b.team2?arabicTeamName(b.team1)+" ضد "+arabicTeamName(b.team2):arabicTeamName(b.matchTitle||"مباراة");
    const item=el("div","activity-entry");
    item.appendChild(el("div","activity-entry-title","⚽ "+teams));
    item.appendChild(el("div","activity-entry-meta",(b.marketTitle?arabicTeamName(b.marketTitle)+" • ":"")+"اختيارك: "+arabicTeamName(b.optionLabel||"—")));
    item.appendChild(el("div","activity-entry-meta","قيمة الرهان: "+f(b.stake)+" • معامل الرهان: ×"+Number(b.odds||0).toFixed(2)));
    item.appendChild(el("div","activity-entry-state "+(won?"up":lost?"dn":""),state));
    item.appendChild(el("div","activity-entry-meta",b.createdAt?new Date(b.createdAt).toLocaleString("ar-EG"):""));box.appendChild(item);
  });
  chains.forEach(chain=>{
    const details=document.createElement("details");details.className="chain-history-entry";
    const summary=document.createElement("summary");
    const combinedOdds=chain.legs.reduce((product,leg)=>Math.round(product*Math.max(0,Number(leg.odds)||0)*10000)/10000,1);
    const chainState=chain.status==="active"?"تنتظر النتائج":chain.status==="completed"?"مكتملة":chain.status==="lost"?"خسرت السلسلة":"انتهت";
    summary.textContent="⛓️ سلسلة ×"+combinedOdds.toFixed(2)+" • "+chainState+" • "+chain.totalLegs+" اختيارات";
    details.appendChild(summary);
    const principal=Number(chain.initialStake)||0,expectedTotal=r2(principal*combinedOdds),expectedProfit=Math.max(0,r2(expectedTotal-principal));
    details.appendChild(el("div","activity-entry-meta","مبلغ الرهان: "+f(principal)+" • المعامل الإجمالي: ×"+combinedOdds.toFixed(2)));
    details.appendChild(el("div","activity-entry-meta","المكسب المتوقع: "+f(expectedProfit)+" • أصل الرهان المسترد: "+f(principal)));
    details.appendChild(el("div","activity-entry-state up","إجمالي العائد المتوقع: "+f(expectedTotal)));
    if(chain.status==="completed")details.appendChild(el("div","activity-entry-state up","تم إرجاع إجمالي: "+f(chain.currentBalance)+" • المكسب الفعلي: "+f(Math.max(0,Number(chain.currentBalance)-principal))));
    else if(chain.status==="lost")details.appendChild(el("div","activity-entry-state dn","لم تتحقق جميع الاختيارات؛ خُصم مبلغ السلسلة."));
    chain.legs.forEach(leg=>{
      const snap=leg.snapshot||{},row=el("div","activity-entry");
      row.appendChild(el("div","activity-entry-title",(leg.order||0)+". "+arabicTeamName(snap.team1)+" × "+arabicTeamName(snap.team2)));
      row.appendChild(el("div","activity-entry-meta",arabicTeamName(snap.market_title||leg.marketId)+" • "+arabicTeamName(snap.option_label||leg.optionId)+" • ×"+Number(leg.odds||0).toFixed(2)));
      const label=leg.processedAt?(leg.result==="won"?"كسبت":leg.result==="lost"?"خسرت":leg.result==="void"?"إلغاء":"لم تُنفّذ"):
        leg.result==="pending"?"قيد الانتظار":"نتيجة الحلقة معروفة وتنتظر دورها";
      row.appendChild(el("div","activity-entry-state "+(leg.result==="won"?"up":leg.result==="lost"?"dn":""),label+(leg.processedAt?" • قيمة الحلقة: "+f(leg.stake):"")));
      details.appendChild(row);
    });
    box.appendChild(details);
  });
}
function renderMore(){
  const box=$("morelist");box.innerHTML="";const L=pagesList();
  L.forEach(p=>{const b=el("button","mrow");b.innerHTML="<span>"+esc(p.emo||"📄")+" "+esc(p.title)+"</span><span>‹</span>";b.onclick=()=>openPage(p);box.appendChild(b);});
  $("moreempty").hidden=L.length>0;
  const mb=document.querySelector('.nav button[data-v="more"]');
  mb.hidden=L.length===0;
  if(L.length===0&&(view==="more"||view==="page"))show("home");
}
function openPage(p){
  $("pgT").textContent=(p.emo||"📄")+" "+p.title;$("pgB").textContent=p.body||"";
  const im=$("pgI");if(isUrl(p.img)){im.src=p.img;im.hidden=false;}else im.hidden=true;
  show("page");
}
function renderMe(){
  $("mname").textContent=U.displayName||name;
  $("mid").textContent=U.id||"—";$("mbal").textContent=f(U.balance);
  const w=U.wagered||0,r=U.returned||0;
  $("m1").textContent=U.rounds||0;$("m2").textContent=U.wins||0;$("m3").textContent=U.losses||0;
  $("m4").textContent=f(w);$("m5").textContent=f(r);$("m6").textContent=f(Math.max(0,w-r));
  $("mrtp").textContent=tpl(C.texts.rtpNote,{rtp:(w?(r/w*100).toFixed(1):"—")+"%"});
  const sc=scU(),n=$("mscn");n.hidden=sc>=1;n.textContent=tpl(C.texts.scaleNote,{pct:Math.round((1-sc)*100)});
  const av=$("profileAvatar");
  if(av){
    av.innerHTML="";
    if(U.profile?.avatarUrl){const im=document.createElement("img");im.src=U.profile.avatarUrl;im.alt="صورة الحساب";av.appendChild(im);}
    else av.textContent="👤";
  }
}
function renderPayBanner(){
  const box=$("payreqbanner");box.innerHTML="";
  const pr=U.payreq;
  if(!pr||pr.status==="seen"||pr.status==="pending")return;
  const ap=pr.status==="approved";
  const d=el("div","resbox "+(ap?"ap":"rj"));
  d.textContent=ap?tpl(C.texts.payApprovedTpl,{amount:f(pr.amt||0)}):C.texts.payRejectedTpl;
  const b=el("button","btn g full",C.texts.ackBtn);b.style.marginTop="8px";
  b.onclick=()=>{U.payreq=null;renderPayBanner();};
  d.appendChild(document.createElement("br"));d.appendChild(b);
  box.appendChild(d);
}
function render(){
  applyCfg();applySportsAvailability();
  $("hbal").textContent="💰 "+f(U.balance);
  renderHome();renderMatches();renderChainHub();renderGames();renderAct();renderMore();renderMe();updAdminMsg();renderPayBanner();
  if(view==="match")renderSportsMatchDetail();
  if(cur)cur.upd();
}
function showAuth(t){
  U=null;crStop();$("gl").hidden=true;$("ov").hidden=true;cur=null;document.body.style.overflow="";chatOn=false;
  $("shell").hidden=true;$("v_auth").hidden=false;$("aerr").textContent=t||"";applyCfg();
}
function showApp(){$("v_auth").hidden=true;$("shell").hidden=false;}

/* ---------- الدعم المباشر (دردشة اللاعب عبر الخادم) ---------- */
async function loadPlayerChat(){
  if(!U||!chatOn)return;
  try{
    const data=await apiCall("chat_list",{},false),box=$("chatbox");box.innerHTML="";
    const arr=data.messages||[];
    if(!arr.length)box.innerHTML='<div class="empty">ابعت رسالة للمشرف وهيردّ عليك هنا</div>';
    arr.forEach(m=>{
      const b=el("div","bub "+(m.sender_role==="player"?"me":"them"),m.message);
      b.appendChild(el("small","",new Date(m.created_at).toLocaleTimeString("ar-EG")));box.appendChild(b);
    });box.scrollTop=box.scrollHeight;
  }catch(e){console.warn("chat refresh",e);}
}
function openChat(){
  if(chatOn)return;chatOn=true;loadPlayerChat();
  if(chatPollTimer)clearInterval(chatPollTimer);
  chatPollTimer=setInterval(()=>{if(document.visibilityState!=="hidden")loadPlayerChat();},6000);
}
$("chatsend").onclick=async()=>{
  const v=$("chatin").value.trim();if(!v||!U)return;
  const button=$("chatsend");button.disabled=true;
  try{await apiCall("chat_send",{message:v.slice(0,2000)});$("chatin").value="";await loadPlayerChat();}
  catch(e){toast(e.message||C.texts.errNet);}
  finally{button.disabled=false;}
};
$("chatin").onkeydown=e=>{if(e.key==="Enter")$("chatsend").click();};

/* ---------- صفحة الدفع ---------- */
function updAdminMsg(){
  const am=String(C.texts.payWarn||"").trim(),b=$("adminmsg");
  b.hidden=!am;b.textContent=am;
}
let payProofData="";
function renderPay(){
  updAdminMsg();const box=$("paylist");box.innerHTML="";$("paymsgbox").hidden=true;box.hidden=false;
  box.appendChild(el("div","plb","اختار طريقة الدفع"));
  lines(C.texts.payMethods).forEach(method=>{
    const b=el("button","mrow");b.innerHTML="<span>"+esc(method)+"</span><span>‹</span>";
    b.onclick=()=>payClick(method);box.appendChild(b);
  });
  loadMyCreditRequests().catch(()=>{});
}
function payClick(method){
  payM=String(method||"").slice(0,80);$("paylist").hidden=true;$("paymsgbox").hidden=false;
  $("pmethod").textContent=payM;
  $("paydest").textContent=String(C.texts.payDestNumber||"00000000000");
  $("phoneLbl").textContent=C.texts.phoneLbl||"رقم وهمي";
  $("pphone").placeholder=C.texts.phonePh||"اكتب رقمًا تجريبيًا فقط";
  $("amtLbl").textContent=C.texts.amtLbl||"المبلغ اللي حولته";
  $("shotLbl").textContent=C.texts.shotLbl||"ارفع صورة تجريبية";
  $("prooflabel").textContent=C.texts.shotPh||"اختار صورة";
  $("pphone").value="";$("pamt").value="";$("payres").textContent="";$("paystatus").hidden=true;
  $("payproof").value="";$("proofpreview").hidden=true;payProofData="";
  $("psend").textContent=C.texts.transferBtn||"إرسال الطلب";
}
$("payproof").onchange=async()=>{
  const file=$("payproof").files?.[0];if(!file){payProofData="";return;}
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)){ $("payproof").value="";$("payres").textContent="اختار صورة PNG أو JPG أو WEBP فقط";return;}
  if(file.size>8*1024*1024){$("payproof").value="";$("payres").textContent="الصورة كبيرة جدًا؛ اختار صورة أصغر من 8 ميجابايت";return;}
  try{
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=data;});
    const scale=Math.min(1,1500/Math.max(img.width,img.height)),canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    payProofData=canvas.toDataURL("image/jpeg",.76);
    if(payProofData.length>2200000)throw new Error("الصورة بعد الضغط ما زالت كبيرة؛ اختار صورة أصغر");
    $("proofpreview").src=payProofData;$("proofpreview").hidden=false;
    $("prooflabel").textContent=C.texts.shotPh2||"تم اختيار الصورة";
  }catch(e){payProofData="";$("payres").textContent=e.message||"تعذر تجهيز الصورة";}
};
async function loadMyCreditRequests(){
  const d=await apiCall("my_credit_requests",{},false),box=$("paystatus");
  if(!box)return;box.hidden=!(d.requests||[]).length;if(box.hidden)return;
  const x=d.requests[0],status=x.status==="approved"?"تم الدفع":x.status==="rejected"?"لم تتم الموافقة":"جاري الشحن، انتظر";
  box.className="resbox "+(x.status==="approved"?"ap":x.status==="rejected"?"rj":"");
  box.textContent=status+" — "+f(Number(x.requested_amount)||0);
}
$("psend").onclick=async()=>{
  const phone=nd($("pphone").value).trim(),amt=parseFloat(nd($("pamt").value)),res=$("payres");
  const bad=t=>{res.textContent=t;res.style.color="var(--er)";};
  if(!payM)return bad("اختار طريقة الدفع أولًا");
  if(!/^\d{6,20}$/.test(phone))return bad("اكتب رقمًا تجريبيًا من 6 إلى 20 رقمًا");
  if(!(amt>0))return bad(C.texts.errBetVal);if(amt>50000)return bad("الحد الأقصى للطلب 50,000");
  if(!payProofData)return bad("ارفع صورة تجريبية أولًا");
  $("psend").disabled=true;res.textContent="جاري إرسال الطلب...";res.style.color="";
  try{
    const note={method:payM,userNumber:phone,destinationNumber:String(C.texts.payDestNumber||"00000000000")};
    await apiCall("credit_request",{amount:r2(amt),note:JSON.stringify(note),proofData:payProofData});
    res.textContent=C.texts.payOk||"جاري الشحن، انتظر";res.style.color="var(--ok)";
    $("pphone").value="";$("pamt").value="";$("payproof").value="";$("proofpreview").hidden=true;payProofData="";
    await loadMyCreditRequests();
  }catch(e){bad(e.message||C.texts.errNet);}
  finally{$("psend").disabled=false;}
};
$("withdrawOpen").onclick=()=>{updateWithdrawBalance();show("withdraw");};
$("withdrawBack").onclick=()=>show("pay");
function updateWithdrawBalance(){
  const node=$("withdrawBalance");if(node)node.textContent=f(Number(U?.balance||0));
}
$("withdrawSubmit").onclick=async()=>{
  const phone=nd($("withdrawPhone").value).trim();
  const amount=parseFloat(nd($("withdrawAmount").value));
  const msg=$("withdrawMessage"),button=$("withdrawSubmit");
  const bad=t=>{msg.textContent=t;msg.style.color="var(--er)";};
  if(!/^\\d{6,20}$/.test(phone))return bad("اكتب رقم هاتف وهميًا من 6 إلى 20 رقمًا.");
  if(!(Number.isFinite(amount)&&amount>0))return bad("اكتب مبلغًا صحيحًا أكبر من صفر.");
  if(amount>Number(U?.balance||0))return bad("المبلغ أكبر من الرصيد الوهمي المتاح.");
  button.disabled=true;msg.textContent="جارٍ تنفيذ السحب الوهمي...";msg.style.color="";
  try{
    const out=await apiCall("virtual_withdrawal",{amount:r2(amount),phoneNumber:phone,idempotencyKey:crypto.randomUUID()});
    U.balance=Number(out.balance);
    await refreshMe(false);
    render();updateWithdrawBalance();
    msg.style.color="var(--ok)";
    msg.textContent="✅ تم تنفيذ السحب الوهمي بنجاح. تم خصم "+f(amount)+" من رصيدك الوهمي.\\nالرصيد المتبقي: "+f(U.balance);
    $("withdrawPhone").value="";$("withdrawAmount").value="";
  }catch(e){bad(e.message||"تعذر تنفيذ السحب الوهمي.");}
  finally{button.disabled=false;}
};
$("payagain").onclick=renderPay;
$("usd").onclick=()=>{renderPay();show("pay");};
$("payback").onclick=()=>show("home");

/* ---------- منطق عام للعب (آمن ضد التعليق) ---------- */
async function run(){throw new Error("يجب تنفيذ الجولة من الخادم");}
function chk(){throw new Error("يتم التحقق من الرهان على الخادم");}
function stake(){throw new Error("تعديل الرصيد متاح للخادم فقط");}
function payout(){throw new Error("تعديل العائد متاح للخادم فقط");}
const getBet=()=>r2(parseFloat(nd(($("bet")||{}).value)));
function gmsg(t,k){const m=$("gmsg");if(m){m.textContent=t;m.className="gmsg "+(k||"");}}
function result(win,bet,extra){
  const net=r2(win-bet);let t,k,kind;
  if(net>0){t=tpl(C.texts.msgWin,{amount:f(net)});k="ok";kind="win";}
  else if(net<0){t=tpl(C.texts.msgLost,{amount:f(-net)});k="er";kind="loss";}
  else{t=C.texts.msgTie;k="";kind="";}
  const label=(extra?extra+" — ":"")+t;
  gmsg(label,k);
  const chip=el("div","result-chip "+kind,label);
  const field=document.querySelector("#gbody .fld");
  const old=document.querySelector("#gbody .result-chip");
  if(old)old.remove();
  if(field)field.parentNode.insertBefore(chip,field);
  else{const body=$("gbody");if(body)body.prepend(chip);}
  fxBal(net>=0);
}
function fxBal(win){
  const b=$("hbal");b.classList.remove("fxw","fxl");void b.offsetWidth;b.classList.add(win?"fxw":"fxl");
  if(!win&&navigator.vibrate)navigator.vibrate(100);
}
function base(){const e=$("gbal");if(e)e.textContent="💰 "+f(U.balance);}
function histHTML(g){
  const h=histArr().filter(x=>x.g===g.id).slice(-8).reverse();
  if(!h.length)return '<div class="sm2">لا توجد جولات بعد</div>';
  return h.map(x=>{const n=r2(x.win-x.bet);return '<div class="hr2"><span>رهان '+f(x.bet)+'</span><span class="'+(n>0?"up":n<0?"dn":"")+'">'+(n>0?"+"+f(n):n<0?"-"+f(-n):"=")+'</span></div>';}).join("");
}
const betBox=(ex,btns)=>'<div class="gc"><div class="gmsg" id="gmsg">'+C.texts.msgStart+'</div><div class="bar"><button data-bv="h">½</button><button data-bv="d">×2</button><button data-bv="100">100</button><button data-bv="1000">1K</button><button data-bv="10000">10K</button></div><div class="fld"><div><label>الرهان</label><input id="bet" type="number" inputmode="decimal" value="'+C.settings.defBet+'"></div>'+(ex||"")+'</div>'+btns+'</div>';
const rulesBox=t=>'<details class="gd"><summary>📖 قواعد اللعبة</summary><p>'+t+'</p></details>';
const histBox='<div class="gc"><b>🕘 سجل جولاتك</b><div id="hist" style="margin-top:6px"></div></div>';
function bindBet(b){b.querySelectorAll("[data-bv]").forEach(x=>x.onclick=()=>{const i=$("bet"),v=parseFloat(nd(i.value))||0,k=x.dataset.bv;i.value=k==="h"?Math.max(1,r2(v/2)):k==="d"?r2(v*2):k;});}
function safeClick(btn,fn){btn.onclick=async()=>{if(btn.disabled)return;try{await fn();}catch(e){toast(C.texts.errNet);busy=false;hold=false;upd();}};}

const ENG={};
function openGame(id){
  const g=gById(id);if(!g||!gOn(g))return;
  const th=THEME[g.engine],gl=$("gl");
  gl.style.background="linear-gradient(180deg,"+th[2]+",#000)";
  gl.innerHTML='<div class="gtop"><span class="gb" id="gbal"></span><b class="gt">'+esc(g.name)+'</b><button class="gx" id="gx">✕</button></div><div class="gbody" id="gbody"></div>';
  gl.hidden=false;document.body.style.overflow="hidden";
  cur={g:g,upd:function(){}};apLast=null;
  ENG[g.engine].open(g,$("gbody"));
  $("gx").onclick=closeGame;
  cur.upd();
}
function closeGame(){
  if(busy||hold)return toast(C.texts.errBusy);
  crStop();$("gl").hidden=true;document.body.style.overflow="";cur=null;if(U)render();
}
const upd=()=>{if(cur)cur.upd();};

/* ======== Wild West Gold ======== */
const SYM=[["🤠",.44,0],["🐴",.26,2],["🔫",.16,4],["🥃",.09,8],["💎",.04,16],["👑",.01,20]];
function slotRawPay(a,b,c){
  if(a===b&&b===c)return SYM[a][2];
  if(a===b||b===c||a===c)return 2;
  return 0;
}
function slotExact(g){
  const P=SYM.map(s=>s[1]),target=rtpOf(g)/100;
  const expected=scale=>{
    let total=0;
    for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++)
      total+=P[a]*P[b]*P[c]*Math.min(slotRawPay(a,b,c)*scale,CAP);
    return total;
  };
  let lo=0,hi=100;
  for(let i=0;i<52;i++){
    const mid=(lo+hi)/2;
    if(expected(mid)<target)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}
function slotPayoutOf(g,a,b,c,scale){
  return r2(Math.min(slotRawPay(a,b,c)*scale,CAP));
}
function pickSym(){const r=rnd();let a=0;for(let i=0;i<6;i++){a+=SYM[i][1];if(r<a)return i;}return 5;}
ENG.slot={open(g,b){
  const scale=slotExact(g);
  const pt=SYM.map((s,i)=>'<div class="row2"><span>'+s[0]+s[0]+s[0]+'</span><b>×'+slotPayoutOf(g,i,i,i,scale)+'</b></div>').join("")+'<div class="row2"><span>رمزين متشابهين (أي مكان)</span><b>×'+slotPayoutOf(g,0,0,1,scale)+'</b></div>';  b.innerHTML='<div class="gc"><div class="reels"><div class="reel" id="r0">🤠</div><div class="reel" id="r1">🐴</div><div class="reel" id="r2">🔫</div></div></div>'+
    betBox("",'<button class="btn y full" id="spin">'+C.texts.btnSpinSlot+'</button>')+
    rulesBox(tpl(C.texts.ruleSlot,{cap:CAP,rtp:rtpOf(g),edge:r2(100-rtpOf(g))}))+
    '<div class="gd"><b>💎 جدول الجوائز</b>'+pt+'</div>'+histBox;
  bindBet(b);safeClick($("spin"),()=>slotSpin(g,scale));
  cur.upd=()=>{base();$("hist").innerHTML=histHTML(g);$("spin").disabled=busy;};
}};
async function slotSpin(g,scale){
  if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
  lastAction=Date.now();busy=true;hold=true;$("spin").disabled=true;
  const rs=[0,1,2].map(i=>$("r"+i));
  const iv=rs.map(r=>setInterval(()=>{r.textContent=SYM[secureClientSymbol()][0];},90));
  rs.forEach(r=>{r.classList.remove("reel-stop");r.classList.add("spin");});gmsg("جارٍ تنفيذ الجولة بأمان...");
  try{
    const data=await apiCall("play",{gameId:g.id,stake:bet,idempotencyKey:crypto.randomUUID()});
    const symbols=data.outcome.symbols||[0,0,0];
    for(let i=0;i<3;i++){
      await sleep(520);
      clearInterval(iv[i]);rs[i].classList.remove("spin");
      rs[i].textContent=SYM[symbols[i]][0];
      rs[i].classList.add("reel-stop");
    }
    U.balance=Number(data.balance);hold=false;busy=false;render();result(Number(data.payout),bet);refreshMe(false).then(()=>render()).catch(()=>{});
  }catch(e){iv.forEach(clearInterval);rs.forEach(r=>r.classList.remove("spin"));hold=false;busy=false;upd();gmsg(e.message||C.texts.errNet,"er");}
}
function secureClientSymbol(){return Math.floor(rnd()*6);}

/* ======== Apple of Fortune ======== */
const AP_ROWS=5,AP_COLS=5,AP_REAL_P=.8,AP_CAP=8;
function apSafeCount(){return Math.max(1,Math.min(AP_COLS,Math.round(AP_COLS*AP_REAL_P*scU())));}
function apMult(g,k,safeN){
  const chance=Math.max(1,Math.min(AP_COLS,Number(safeN)||apSafeCount()))/AP_COLS;
  return r2(Math.min(Math.pow(1/chance,k)*(rtpOf(g)/100),AP_CAP));
}
function apMakeHazards(safeN,picks){
  const traps=AP_COLS-Math.max(1,Math.min(AP_COLS,Number(safeN)||1));
  return Array.from({length:AP_ROWS},(_,r)=>{
    const excluded=Array.isArray(picks)&&picks[r]!=null?[picks[r]]:[];
    const pool=Array.from({length:AP_COLS},(_,i)=>i).filter(i=>!excluded.includes(i));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool.slice(0,Math.min(traps,pool.length));
  });
}
ENG.apple={open(g,b){
  const safeN=apSafeCount();
  b.innerHTML='<div class="gc"><div class="gmsg" id="gmsg">'+C.texts.msgStart+'</div><div class="sm2" id="arisk"></div><div id="aboard"></div></div>'+
    '<div class="gc"><div class="bar"><button data-bv="h">½</button><button data-bv="d">×2</button><button data-bv="100">100</button><button data-bv="1000">1K</button><button data-bv="10000">10K</button></div><div class="fld"><div><label>الرهان</label><input id="bet" type="number" min="0.01" step="0.01" inputmode="decimal" value="'+C.settings.defBet+'"></div></div><div class="two"><button class="btn" id="astart">'+C.texts.btnStart+'</button><button class="btn ok" id="acash" disabled>'+C.texts.btnCash+'</button></div></div>'+
    rulesBox(tpl(C.texts.ruleApple,{p:Math.round(safeN/AP_COLS*100),cap:AP_CAP,rtp:rtpOf(g)}))+histBox;
  bindBet(b);safeClick($("astart"),()=>apStart(g));safeClick($("acash"),()=>apCash(g));
  cur.upd=()=>{base();const a=U.ap&&U.ap.k===g.id;$("hist").innerHTML=histHTML(g);$("astart").disabled=busy||!!a;$("acash").disabled=busy||!(a&&U.ap.level>=1);
    $("acash").textContent=a&&U.ap.level>=1?C.texts.btnCash+" "+f(U.ap.bet*apMult(g,U.ap.level,U.ap.safeN)):C.texts.btnCash;apDraw(g);};
}};
function apDraw(g){
  const a=U.ap&&U.ap.k===g.id?U.ap:null,L=apLast,saved=a||L;
  const safeN=saved&&saved.safeN?saved.safeN:apSafeCount();
  const bet=saved?saved.bet:(r2(parseFloat(nd(($("bet")||{}).value)))||0);
  const odds=Math.round(safeN/AP_COLS*100);
  $("arisk").textContent=a?
    (C.texts.riskLoseLbl+" "+f(a.bet)+" • فرصة الأمان "+odds+"% • "+C.texts.riskWinLbl+" "+f(a.bet*apMult(g,a.level+1,safeN))+(a.level>=1?" • "+C.texts.riskCashLbl+" "+f(a.bet*apMult(g,a.level,safeN)):"")):
    (C.texts.riskSurvLbl+" "+odds+"% • اختار تفاحة واحدة في كل صف");
  const bd=$("aboard");bd.innerHTML="";
  const picks=saved?(saved.picks||[]):[],hazards=saved&&Array.isArray(saved.hazards)?saved.hazards:[];
  for(let r=AP_ROWS-1;r>=0;r--){
    const row=el("div","aprow"),m=el("div","apm");
    m.innerHTML="×"+apMult(g,r+1,safeN)+"<small>"+f(bet*apMult(g,r+1,safeN))+"</small>";row.appendChild(m);
    for(let c=0;c<AP_COLS;c++){
      const x=el("button","ap","🍎");x.type="button";x.disabled=true;
      if(a){
        if(r<a.level){
          if((hazards[r]||[]).includes(c)){x.classList.add("bad");x.textContent="🐛";}
          else if(picks[r]===c){x.classList.add("safe");x.textContent="✓";}
          else{x.classList.add("dim");x.textContent="🍏";}
        }else if(r===a.level){x.disabled=busy;x.classList.add("act");if(!busy)safeClick(x,()=>apPick(g,c));}
      }else if(L&&r<L.row){
        if((hazards[r]||[]).includes(c)){x.classList.add("bad");x.textContent="🐛";}
        else if(picks[r]===c){x.classList.add("safe");x.textContent="✓";}
        else{x.classList.add("dim");x.textContent="🍏";}
      }else if(L&&r===L.row){
        if((hazards[r]||[]).includes(c)){x.classList.add("bad");x.textContent="🐛";}
        if(c===L.col){x.classList.add("act");x.textContent="✕";}
      }
      row.appendChild(x);
    }
    bd.appendChild(row);
  }
}
async function apStart(g){
  if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
  busy=true;lastAction=Date.now();gmsg("جارٍ بدء الجولة على الخادم...");
  try{
    const data=await apiCall("active_start",{gameId:g.id,stake:bet,idempotencyKey:crypto.randomUUID()});
    U.balance=Number(data.balance);U.ap={k:g.id,bet:bet,level:data.active.level||0,picks:data.active.picks||[],safeN:data.active.safeN||4,hazards:data.active.revealedHazards||[],roundId:data.active.id,version:data.active.version};
    apLast=null;busy=false;render();
  }catch(e){busy=false;gmsg(e.message||C.texts.errNet,"er");}
}
async function apPick(g,c){
  if(busy||!U?.ap)return;busy=true;hold=true;lastAction=Date.now();
  document.querySelectorAll("#aboard .ap.act").forEach(x=>{x.textContent="·";x.disabled=true;});$("acash").disabled=true;
  try{
    const a=U.ap,data=await apiCall("apple_pick",{roundId:a.roundId,cell:c});
    U.balance=Number(data.balance);hold=false;busy=false;
    if(data.lost){apLast={row:data.row,col:data.cell,picks:data.picks,hazards:data.hazards,safeN:a.safeN,bet:a.bet};U.ap=null;render();result(0,a.bet);refreshMe(false).then(()=>render()).catch(()=>{});}
    else if(data.won){apLast=null;U.ap=null;render();result(Number(data.payout),a.bet);refreshMe(false).then(()=>render()).catch(()=>{});}
    else{U.ap={k:g.id,roundId:data.active.id,bet:a.bet,level:data.active.level,picks:data.active.picks,safeN:data.active.safeN,hazards:data.active.revealedHazards||[],version:data.active.version};render();gmsg("✓ اختيار آمن. اختار الصف التالي أو اسحب رصيدك.","ok");}
  }catch(e){hold=false;busy=false;await refreshMe(false).catch(()=>{});render();gmsg(e.message||C.texts.errNet,"er");}
}
async function apCash(g){
  if(busy||!U?.ap)return;busy=true;lastAction=Date.now();
  try{
    const a=U.ap,data=await apiCall("apple_cash",{roundId:a.roundId});
    U.balance=Number(data.balance);U.ap=null;apLast=null;busy=false;render();result(Number(data.payout),a.bet);refreshMe(false).then(()=>render()).catch(()=>{});
  }catch(e){busy=false;gmsg(e.message||C.texts.errNet,"er");}
}

/* ======== Crash / Red Rocket ======== */
const K=0.06;
const STARS=Array.from({length:45},()=>[Math.random(),Math.random(),Math.random()*1.6+.4]);
function genCp(g){
  const r=rnd();
  let c=Math.floor((rtpOf(g)/100)/(1-r)*100)/100;
  if(c<1)c=1;if(c>capOf(g))c=capOf(g);
  return c;
}
function drawCr(skin,t,m,st,limit=CAP){
  const cv=$("cv");if(!cv)return;
  const rect=cv.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const W=Math.max(320,rect.width||720),H=Math.max(220,rect.height||420);
  const bw=Math.round(W*dpr),bh=Math.round(H*dpr);
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;}
  const x=cv.getContext("2d");if(!x)return;
  x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const bg=x.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#07172a");bg.addColorStop(.6,"#0a2740");bg.addColorStop(1,"#04101c");
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  STARS.forEach((a,i)=>{
    const sx=(a[0]*W+(t*8*(i%3+1)))%W,sy=a[1]*H;
    x.fillStyle="rgba(210,235,255,"+(a[2]/3.5)+")";x.beginPath();x.arc(sx,sy,Math.max(.5,a[2]*.7),0,Math.PI*2);x.fill();
  });
  const left=36,right=22,top=25,bottom=34,plotW=W-left-right,plotH=H-top-bottom;
  x.strokeStyle="rgba(174,211,239,.13)";x.lineWidth=1;
  for(let r=0;r<5;r++){const yy=top+plotH*r/4;x.beginPath();x.moveTo(left,yy);x.lineTo(W-right,yy);x.stroke();}
  for(let c=0;c<7;c++){const xx=left+plotW*c/6;x.beginPath();x.moveTo(xx,top);x.lineTo(xx,H-bottom);x.stroke();}
  const elapsed=Math.max(0,Number(t)||0),current=Math.max(1,Math.min(Number(m)||1,limit));
  const tx=Math.max(7,elapsed*1.18),maxM=Math.max(2.1,Math.min(limit,current*1.22));
  const px=v=>left+(v/tx)*plotW;
  const py=v=>top+plotH-((v-1)/(maxM-1))*plotH;
  const points=[];
  for(let i=0;i<=120;i++){
    const sec=elapsed*i/120,mult=Math.min(Math.exp(K*sec),limit);
    points.push({x:px(sec),y:py(mult)});
  }
  if(points.length>1){
    x.beginPath();x.moveTo(points[0].x,H-bottom);
    points.forEach(p=>x.lineTo(p.x,p.y));x.lineTo(points[points.length-1].x,H-bottom);x.closePath();
    const area=x.createLinearGradient(0,top,0,H-bottom);
    area.addColorStop(0,st==="crash"?"rgba(255,84,98,.24)":"rgba(42,220,180,.23)");
    area.addColorStop(1,"rgba(24,128,165,.015)");x.fillStyle=area;x.fill();
    x.beginPath();x.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>x.lineTo(p.x,p.y));
    x.strokeStyle=st==="crash"?"#ff5366":st==="pending"?"#f6b74b":"#37e5c1";
    x.lineWidth=3.5;x.lineJoin="round";x.lineCap="round";x.shadowColor=x.strokeStyle;x.shadowBlur=13;x.stroke();x.shadowBlur=0;
  }
  const planeX=px(elapsed),planeY=py(current);
  if(st==="crash"){
    const radius=18+Math.min(16,(elapsed%2)*10);
    x.save();x.translate(planeX,planeY);x.strokeStyle="#ff7885";x.lineWidth=3;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;x.beginPath();x.moveTo(Math.cos(a)*radius*.45,Math.sin(a)*radius*.45);x.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);x.stroke();}
    x.fillStyle="#ffb25f";x.beginPath();x.arc(0,0,7,0,Math.PI*2);x.fill();x.restore();
  }else{
    const prevSec=Math.max(0,elapsed-.08),nextSec=elapsed+.08;
    const dx=px(nextSec)-px(prevSec),dy=py(Math.min(Math.exp(K*nextSec),limit))-py(Math.min(Math.exp(K*prevSec),limit));
    const angle=Math.atan2(dy,dx)+Math.PI/2;
    x.save();x.translate(planeX,planeY);x.rotate(angle);
    const flame=x.createLinearGradient(0,15,0,36);
    flame.addColorStop(0,"#fff5a0");flame.addColorStop(.35,"#ff9a38");flame.addColorStop(1,"rgba(255,84,35,0)");
    x.fillStyle=flame;x.beginPath();x.moveTo(-5,13);x.quadraticCurveTo(0,23,0,38);x.quadraticCurveTo(8,24,5,13);x.closePath();x.fill();
    x.shadowColor="#5de8ff";x.shadowBlur=18;x.fillStyle="#e9f8ff";x.strokeStyle="#4fa9d1";x.lineWidth=1.4;
    x.beginPath();x.moveTo(0,-29);x.lineTo(5,-7);x.lineTo(24,4);x.lineTo(24,9);x.lineTo(5,5);x.lineTo(8,18);x.lineTo(15,24);x.lineTo(14,28);x.lineTo(0,24);x.lineTo(-14,28);x.lineTo(-15,24);x.lineTo(-8,18);x.lineTo(-5,5);x.lineTo(-24,9);x.lineTo(-24,4);x.lineTo(-5,-7);x.closePath();x.fill();x.stroke();x.shadowBlur=0;x.restore();
  }
  x.textAlign="center";x.textBaseline="middle";x.font="900 "+Math.min(48,Math.max(34,W*.08))+"px Tahoma";
  x.fillStyle=st==="crash"?"#ff7b8b":"#f4fbff";x.shadowColor=st==="crash"?"#ff354d":"#35dbff";x.shadowBlur=18;
  x.fillText(st==="crash"?"انفجرت":"×"+current.toFixed(2),W/2,H*.47);x.shadowBlur=0;
  x.font="bold 14px Tahoma";x.fillStyle=st==="crash"?"#ff9aa4":st==="pending"?"#ffd48a":"#a8cce4";
  const label=st==="crash"?"انتهت الجولة":st==="pending"?"الطيارة وصلت للنهاية • جارٍ تأكيد النتيجة من الخادم":st==="cash"?"تم السحب • الجولة مستمرة":st==="run"?"اسحب قبل انفجار الطيارة":"جاهز للإقلاع";
  x.fillText(label,W/2,H*.47+34);
}
function crStop(){
  if(raf)cancelAnimationFrame(raf);raf=0;
  if(crPollTimer)clearTimeout(crPollTimer);crPollTimer=0;
}
async function crResolve(data,c){
  if(data.active||!U?.cr||U.cr.roundId!==c.roundId)return false;
  U.cr=null;U.balance=Number(data.balance??U.balance);
  const cp=Number(data.crashPoint)||Number(data.multiplier)||1;
  try{await refreshMe(false);}catch(e){console.warn("crash balance refresh",e);}
  crStop();busy=false;hold=false;crLock=false;
  if(data.cashedOut||data.autoSettled){
    crFinal={k:c.k,cp,m:cp,status:"cash",t0:Number(data.startedAt)||Number(c.t0)};render();
    result(Number(data.payout||0),Number(data.stake||c.bet),"أنت كسبت");
  }else{
    crFinal={k:c.k,cp,m:cp,status:"crash"};render();
    result(0,Number(data.stake||c.bet),"انفجرت الطيارة");
  }
  return true;
}
function showCrashNotice(c,cp){
  const button=$("ccash");if(button){button.disabled=true;button.textContent="انفجرت الطيارة";}
  if(c.crashShown||!cur||cur.g.id!==c.k||$("gl").hidden)return;
  c.crashShown=true;
  const label="انفجرت الطيارة — تم إيقاف السحب";
  gmsg(label,"er");
  const chip=el("div","result-chip loss",label);
  const field=document.querySelector("#gbody .fld");
  const old=document.querySelector("#gbody .result-chip");
  if(old)old.remove();
  if(field)field.parentNode.insertBefore(chip,field);
  else{const body=$("gbody");if(body)body.prepend(chip);}
}
function crLoop(){
  if(!raf){
    const frame=()=>{
      const c=U&&U.cr;if(!c){raf=0;return;}
      const serverNow=Date.now()+Number(c.serverOffset||0);
      const elapsed=Math.max(0,(serverNow-Number(c.t0))/1000);
      const multiplier=Math.min(Math.exp(K*elapsed),capOf(cur?.g||{engine:"crash"}));
      if(cur&&cur.g.id===c.k&&!$("gl").hidden){
        const crashed=!!c.crashDetectedAt;
        drawCr(cur.g.engine,elapsed,multiplier,crashed?"crash":c.cashPending?"pending":"run",capOf(cur.g));
        const cb=$("ccash");
        if(cb){cb.textContent=crashed?"انفجرت الطيارة":c.cashPending?"جارٍ تأكيد السحب…":C.texts.btnCash+" "+f(c.bet*multiplier);if(crashed)cb.disabled=true;}
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
  }
  if(U&&U.cr&&!crPollTimer){
    const tick=async()=>{
      const c=U&&U.cr;if(!c){crPollTimer=0;return;}
      let delay=320;
      try{
        const sentAt=Date.now(),status=await apiCall("crash_status",{roundId:c.roundId},false),receivedAt=Date.now();
        if(!U?.cr||U.cr.roundId!==c.roundId){crPollTimer=0;return;}
        if(Number.isFinite(Number(status.serverNow))){
          const rtt=receivedAt-sentAt;
          if(rtt<=Number(c.bestRtt||Infinity)){c.bestRtt=rtt;c.serverOffset=Number(status.serverNow)-(sentAt+receivedAt)/2;}
        }
        if(status.settled||status.active===false){await crResolve(status,c);crPollTimer=0;return;}
        const multiplier=Number(status.multiplier)||1;
        const cb=$("ccash");
        if(cb&&cur&&cur.g.id===c.k&&!c.crashDetectedAt)cb.textContent=c.cashPending?"جارٍ تأكيد السحب…":C.texts.btnCash+" "+f(c.bet*multiplier);
        if(status.crashed){
          c.crashDetectedAt=c.crashDetectedAt||Date.now();
          showCrashNotice(c,status.crashPoint);
          if(cur&&cur.g.id===c.k&&!$("gl").hidden)drawCr(cur.g.engine,Number(status.elapsed)||0,multiplier,"crash",capOf(cur.g));
          if(c.cashPending){
            delay=220;
          }else{
            const remaining=Number.isFinite(Number(status.settleAfter))?Math.max(0,Number(status.settleAfter)-Number(status.serverNow||Date.now())):5500;
            if(remaining<=0&&!c.settlePromise){
              c.settlePromise=(async()=>{
                try{const final=await apiCall("crash_tick",{roundId:c.roundId});if(final.settled||final.active===null)await crResolve(final,c);}
                catch(e){console.warn("crash settlement pending",e);}
              })();
              await c.settlePromise;c.settlePromise=null;delay=110;
            }else delay=Math.min(260,Math.max(140,remaining));
          }
        }else if(c.cashPending){
          delay=220;
        }else if(status.autoDue){
          if(!c.settlePromise){
            c.settlePromise=(async()=>{
              try{const final=await apiCall("crash_tick",{roundId:c.roundId});if(final.settled||final.active===null)await crResolve(final,c);}
              catch(e){console.warn("auto crash settlement pending",e);}
            })();
          }
          await c.settlePromise;c.settlePromise=null;delay=220;
        }else{
          c.crashDetectedAt=0;
          delay=340;
        }
        c.syncErrors=0;
      }catch(e){
        c.syncErrors=(Number(c.syncErrors)||0)+1;
        if(c.syncErrors===2)gmsg("الاتصال اتأخر؛ بنسترجع حالة الجولة من الخادم…","er");
        delay=Math.min(1000,250+c.syncErrors*120);
      }
      if(U?.cr&&U.cr.roundId===c.roundId)crPollTimer=setTimeout(tick,delay);
      else crPollTimer=0;
    };
    crPollTimer=setTimeout(tick,0);
  }
}
const crashEng={open(g,b){
  b.innerHTML='<div class="gc" style="padding:0;overflow:hidden;background:#06172a"><canvas id="cv" width="720" height="420" style="width:100%;height:auto;aspect-ratio:12/7"></canvas></div><div class="strip" id="cstrip"></div>'+
    betBox('<div><label>سحب تلقائي عند ×</label><input id="auto" type="number" inputmode="decimal" placeholder="اختياري"></div>','<div class="two"><button class="btn y" id="cgo">'+C.texts.btnStart+'</button><button class="btn ok" id="ccash" disabled>'+C.texts.btnCash+'</button></div>')+
    rulesBox(tpl(C.texts.ruleCrash,{cap:capOf(g),rtp:rtpOf(g),edge:r2(100-rtpOf(g))}),g)+histBox;
  bindBet(b);safeClick($("cgo"),()=>crStart(g));safeClick($("ccash"),()=>crSettle("cash"));
  cur.upd=()=>{
    base();const mine=U.cr&&U.cr.k===g.id;
    $("cgo").disabled=!!U.cr;
    $("ccash").disabled=!mine||!!U.cr?.cashPending||!!U.cr?.crashDetectedAt;
    if(!mine)$("ccash").textContent=C.texts.btnCash;
    else if(U.cr.crashDetectedAt)$("ccash").textContent="انفجرت الطيارة";
    else if(U.cr.cashPending)$("ccash").textContent="جارٍ تأكيد السحب…";
    const S=$("cstrip");S.innerHTML="";
    histArr().filter(x=>x.g===g.id).slice(-10).reverse().forEach(x=>{const cp=el("span","cp "+(x.i<2?"lo":"hi"),"×"+(+x.i).toFixed(2));S.appendChild(cp);});
    $("hist").innerHTML=histHTML(g);
    if(mine){crLoop();}
    else{
      crStop();
      const final=crFinal&&crFinal.k===g.id?crFinal:null;
      if(final&&final.status==="cash"){
        const startedAt=Number(final.t0)||Date.now();
        const crashElapsed=Math.log(Math.max(1,Number(final.cp)||1))/K;
        const frame=()=>{
          const elapsed=Math.max(0,(Date.now()-startedAt)/1000);
          const shownElapsed=Math.min(elapsed,crashElapsed);
          const multiplier=Math.min(Math.exp(K*shownElapsed),Number(final.cp)||1);
          const crashed=elapsed>=crashElapsed;
          drawCr(g.engine,shownElapsed,multiplier,crashed?"crash":"cash",capOf(g));
          if(!crashed)raf=requestAnimationFrame(frame);else raf=0;
        };
        frame();
      }else if(final){
        drawCr(g.engine,Math.log(Math.max(1,final.cp))/K,final.cp,"crash",capOf(g));
      }else drawCr(g.engine,0,1,"idle",capOf(g));
    }
  };
}};
ENG.crash=crashEng;ENG.rocket=crashEng;
async function crStart(g){
  if(busy||crLock||!U)return;
  const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
  let auto=parseFloat(nd($("auto").value));if(!(auto>=1.01))auto=0;
  lastAction=Date.now();busy=true;gmsg("جارٍ بدء الجولة على الخادم...");
  try{
    const sentAt=Date.now(),data=await apiCall("active_start",{gameId:g.id,stake:bet,auto,idempotencyKey:crypto.randomUUID()}),receivedAt=Date.now();
    U.balance=Number(data.balance);
    const offset=Number.isFinite(Number(data.serverNow))?Number(data.serverNow)-(sentAt+receivedAt)/2:0;
    U.cr={k:g.id,bet,t0:Number(data.active.startedAt),auto:Number(data.active.auto)||0,roundId:data.active.id,version:data.active.version,
      serverOffset:offset,bestRtt:receivedAt-sentAt,cashPending:false,syncErrors:0};
    crFinal=null;busy=false;render();gmsg("الجولة بدأت على الخادم. اسحب قبل انفجار الطيارة!");crLoop();
  }catch(e){busy=false;gmsg(e.message||C.texts.errNet,"er");}
}
async function crSettle(mode){
  const c=U?.cr;if(!c)return;
  if(mode!=="cash"){
    if(crLock)return;
    crLock=true;
    try{
      const data=await apiCall("crash_tick",{roundId:c.roundId});
      if(data.settled||data.active===null)await crResolve(data,c);
    }catch(e){gmsg("الخادم لسه بيأكد نتيجة الجولة…","er");}
    finally{crLock=false;}
    return;
  }
  if(c.crashDetectedAt)return;
  if(c.cashPromise||c.cashPending)return c.cashPromise;
  const clickAt=Date.now()+Number(c.serverOffset||0);
  c.cashPending=true;lastAction=Date.now();upd();
  c.cashPromise=(async()=>{
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      let timer;
      try{
        const request=apiCall("crash_cash",{roundId:c.roundId,cashClickAt:clickAt});
        const data=await Promise.race([
          request,
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("cashout_timeout")),5200);})
        ]);
        clearTimeout(timer);
        if(data.settled||data.active===null){await crResolve(data,c);return;}
        if(data.active){gmsg("الطلب وصل؛ الخادم بيأكد توقيت السحب…","");return;}
      }catch(e){clearTimeout(timer);lastError=e;if(attempt===0)await sleep(220);}
    }
    try{
      const status=await apiCall("crash_status",{roundId:c.roundId},false);
      if(status.settled||status.active===false)await crResolve(status,c);
      else if(status.crashed&&Number(status.serverNow)>=Number(status.settleAfter)){
        const final=await apiCall("crash_tick",{roundId:c.roundId});
        if(final.settled||final.active===null)await crResolve(final,c);
        else gmsg("السيرفر ما زال بيأكد النتيجة؛ هانسترجعها تلقائيًا…","");
      }else gmsg(lastError?.message==="cashout_timeout"?"الاتصال تأخر، ولسه بنحاول نحصل على قرار الخادم…":"الطلب اتبعت، ولسه بنسترجع حالة الجولة من الخادم…","");
    }catch(e){
      gmsg("الشبكة اتأخرت. ما تقفلش اللعبة؛ بنحاول نسترجع النتيجة من الخادم…","er");
    }
  })();
  try{await c.cashPromise;}
  finally{
    if(U?.cr&&U.cr.roundId===c.roundId){
      c.cashPending=false;c.cashPromise=null;upd();
    }
  }
}
/* ======== Lucky Dice ======== */
ENG.dice={open(g,b){
  let choice="low";
  b.innerHTML='<div class="dice-stage" id="diceStage"><div class="dice-pair"><div class="die-face" id="dieOne">⚄</div><div class="die-face" id="dieTwo">⚄</div></div><div class="dice-total">مجموع النرد <b id="diceSum">—</b></div></div>'+
    '<div class="gc"><div class="gmsg" id="gmsg">'+C.texts.msgStart+'</div><div class="game-choice-row" id="diceChoices">'+
    '<button type="button" class="game-choice on" data-dice-choice="low">أقل من 7</button><button type="button" class="game-choice" data-dice-choice="seven">يساوي 7</button><button type="button" class="game-choice" data-dice-choice="high">أكبر من 7</button></div>'+
    '<div class="bar"><button data-bv="h">½</button><button data-bv="d">×2</button><button data-bv="100">100</button><button data-bv="1000">1K</button><button data-bv="10000">10K</button></div>'+
    '<div class="fld"><label>قيمة الجولة الافتراضية</label><input id="bet" type="number" min="1" step="1" inputmode="decimal" value="'+C.settings.defBet+'"></div>'+
    '<button class="btn full" id="diceRoll">ارمِ النرد</button></div>'+rulesBox("اختر مجموع حجرَي النرد، ثم ارمِهما. النتيجة تُحسب من الخادم وتظهر في سجل الألعاب.")+histBox;
  bindBet(b);
  b.querySelectorAll("[data-dice-choice]").forEach(btn=>btn.onclick=()=>{choice=btn.dataset.diceChoice;b.querySelectorAll("[data-dice-choice]").forEach(x=>x.classList.toggle("on",x===btn));});
  safeClick($("diceRoll"),async()=>{
    if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
    lastAction=Date.now();busy=true;hold=true;const stage=$("diceStage");stage.classList.add("rolling");$("diceRoll").disabled=true;gmsg("النرد بيتحرك...");
    try{
      const data=await apiCall("play",{gameId:g.id,stake:bet,choice,idempotencyKey:crypto.randomUUID()}),o=data.outcome||{};
      stage.classList.remove("rolling");const faces=["⚀","⚁","⚂","⚃","⚄","⚅"];
      $("dieOne").textContent=faces[Math.max(1,Math.min(6,Number(o.dice?.[0])||1))-1];
      $("dieTwo").textContent=faces[Math.max(1,Math.min(6,Number(o.dice?.[1])||1))-1];
      $("diceSum").textContent=String(o.sum??"—");U.balance=Number(data.balance);hold=false;busy=false;render();
      result(Number(data.payout),bet,(o.won?"اختيار صحيح":"لم تصب هذه الجولة")+" • ×"+Number(o.multiplier||0).toFixed(2));refreshMe(false).then(()=>render()).catch(()=>{});
    }catch(e){stage.classList.remove("rolling");hold=false;busy=false;upd();gmsg(e.message||C.texts.errNet,"er");}
  });
  cur.upd=()=>{base();$("hist").innerHTML=histHTML(g);$("diceRoll").disabled=busy;};
}};

/* ======== Red or Black Cards ======== */
ENG.cards={open(g,b){
  let choice="red";
  b.innerHTML='<div class="cards-stage" id="cardsStage"><div class="playing-card playing-card-back" id="playingCard">♠</div><div class="dice-total" id="cardOutcome">اختار اللون قبل كشف الورقة</div></div>'+
    '<div class="gc"><div class="gmsg" id="gmsg">'+C.texts.msgStart+'</div><div class="game-choice-row" style="grid-template-columns:1fr 1fr" id="cardChoices">'+
    '<button type="button" class="game-choice on" data-card-choice="red">أحمر ♥ ♦</button><button type="button" class="game-choice" data-card-choice="black">أسود ♣ ♠</button></div>'+
    '<div class="bar"><button data-bv="h">½</button><button data-bv="d">×2</button><button data-bv="100">100</button><button data-bv="1000">1K</button><button data-bv="10000">10K</button></div>'+
    '<div class="fld"><label>قيمة الجولة الافتراضية</label><input id="bet" type="number" min="1" step="1" inputmode="decimal" value="'+C.settings.defBet+'"></div>'+
    '<button class="btn full" id="drawCard">اكشف الورقة</button></div>'+rulesBox("اختر اللون الأحمر أو الأسود قبل كشف ورقة واحدة. النتيجة تعتمد من الخادم.")+histBox;
  bindBet(b);
  b.querySelectorAll("[data-card-choice]").forEach(btn=>btn.onclick=()=>{choice=btn.dataset.cardChoice;b.querySelectorAll("[data-card-choice]").forEach(x=>x.classList.toggle("on",x===btn));});
  safeClick($("drawCard"),async()=>{
    if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
    lastAction=Date.now();busy=true;hold=true;$("drawCard").disabled=true;$("playingCard").className="playing-card playing-card-back";$("cardOutcome").textContent="جاري كشف الورقة...";
    try{
      const data=await apiCall("play",{gameId:g.id,stake:bet,choice,idempotencyKey:crypto.randomUUID()}),o=data.outcome||{};
      const rank=Number(o.rank)||1,symbol=String(o.suit||"♠"),rankLabel=({1:"A",11:"J",12:"Q",13:"K"})[rank]||String(rank);
      $("playingCard").className="playing-card "+(o.red?"red":"black");$("playingCard").textContent=rankLabel+symbol;
      $("cardOutcome").textContent=o.won?"اختيار صحيح • ×"+Number(o.multiplier||0).toFixed(2):"اختيار غير مطابق • "+(o.red?"أحمر":"أسود");
      U.balance=Number(data.balance);hold=false;busy=false;render();
      result(Number(data.payout),bet,o.won?"لون صحيح":"اللون لم يطابق");refreshMe(false).then(()=>render()).catch(()=>{});
    }catch(e){hold=false;busy=false;upd();gmsg(e.message||C.texts.errNet,"er");}
  });
  cur.upd=()=>{base();$("hist").innerHTML=histHTML(g);$("drawCard").disabled=busy;};
}};

/* ======== Spin and Win ======== */
const WH=[0,0,.3,0,1,0,.5,0,2,0,0,.3,1,0,.5,8,0,0,1,.3];
const WC={0:"#2b3a52",.3:"#8a5a1a",.5:"#8a5a1a",1:"#245A91",2:"#20A464",8:"#d49a10"};
function wv(g){const expected=WH.reduce((a,b)=>a+b,0)/WH.length,scale=(rtpOf(g)/100)/expected;return WH.map(v=>r2(Math.min(v*scale,CAP)));}
function wheelDraw(g){
  const cv=$("wcv"),x=cv.getContext("2d"),S=cv.width,c=S/2,R=c-6,n=20,a=2*Math.PI/n,V=wv(g);
  x.clearRect(0,0,S,S);
  for(let i=0;i<n;i++){
    x.beginPath();x.moveTo(c,c);x.arc(c,c,R,-Math.PI/2+i*a,-Math.PI/2+(i+1)*a);x.closePath();
    x.fillStyle=WC[WH[i]]||"#245A91";x.fill();x.strokeStyle="#0b1623";x.lineWidth=2;x.stroke();
    x.save();x.translate(c,c);x.rotate(-Math.PI/2+(i+.5)*a);x.fillStyle="#fff";x.font="bold 14px Tahoma";x.textAlign="right";x.textBaseline="middle";
    x.fillText(V[i]?"×"+V[i]:"0",R-12,0);x.restore();
  }
  x.beginPath();x.arc(c,c,26,0,7);x.fillStyle="#0B1E3A";x.fill();x.lineWidth=4;x.strokeStyle="#FFC83D";x.stroke();
}
ENG.wheel={open(g,b){
  wRot=0;
  b.innerHTML='<div class="wheelwrap"><div class="pointer">▼</div><div class="wrot" id="wrot"><canvas id="wcv" width="320" height="320"></canvas></div></div>'+
    betBox("",'<button class="btn y full" id="wgo">'+C.texts.btnSpinWheel+'</button>')+
    rulesBox(tpl(C.texts.ruleWheel,{cap:8,rtp:rtpOf(g),edge:r2(100-rtpOf(g))}))+histBox;
  wheelDraw(g);bindBet(b);safeClick($("wgo"),()=>wheelSpin(g));
  cur.upd=()=>{base();$("hist").innerHTML=histHTML(g);$("wgo").disabled=busy;};
}};
async function wheelSpin(g){
  if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
  lastAction=Date.now();busy=true;hold=true;$("wgo").disabled=true;gmsg("العجلة بتلف...");
  try{
    const data=await apiCall("play",{gameId:g.id,stake:bet,idempotencyKey:crypto.randomUUID()});
    const index=Number(data.outcome.index)||0,V=wv(g);wRot=(Math.floor(wRot/360)+5)*360+(360-(index*18+9))+(Math.random()*10-5);
    $("wrot").style.transform="rotate("+wRot+"deg)";await new Promise(resolve=>{const wheel=$("wrot");let finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(fallback);resolve();};const fallback=setTimeout(finish,4300);wheel.addEventListener("transitionend",finish,{once:true});});
    U.balance=Number(data.balance);hold=false;busy=false;render();result(Number(data.payout),bet,"×"+Number(data.outcome.multiplier).toFixed(2));refreshMe(false).then(()=>render()).catch(()=>{});
  }catch(e){hold=false;busy=false;upd();gmsg(e.message||C.texts.errNet,"er");}
}

/* ======== Plinko ======== */
const PL_ROWS=8,PL_COEF=[1,8,28,56,70,56,28,8,1],PL_RAW=[6.21,.45,3.5,.35,2.5,.2,1.5,.1,.05];
const multText=n=>Number(n).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:4});
function plMults(g){
  const scale=rtpOf(g)/96;
  return PL_RAW.map(v=>Math.min(v*scale,CAP));
}
function resetBall(){
  const ball=$("plball");if(!ball)return;
  ball.style.transition="none";ball.style.left="50%";ball.style.top="3%";ball.style.transform="rotate(0deg)";
  const rope=$("plrope");if(rope){rope.style.left="50%";rope.style.height="18px";}
  void ball.offsetWidth;
  ball.style.transition="left .24s cubic-bezier(.2,.7,.2,1),top .24s cubic-bezier(.2,.7,.2,1),transform .24s ease";
}
function makePlinkoPath(targetK){
  const path=Array(targetK).fill(1).concat(Array(PL_ROWS-targetK).fill(0));
  for(let i=path.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[path[i],path[j]]=[path[j],path[i]];}
  return path;
}
ENG.plinko={open(g,b){
  const M=plMults(g);
  b.innerHTML='<div class="gc"><div class="gmsg" id="gmsg">'+C.texts.msgStart+'</div><div class="plbd" id="plbd"><div class="plrope" id="plrope"></div><div class="plball" id="plball"></div></div><div class="plbuckets" id="plbk">'+M.map((m,i)=>'<div class="plbk" data-i="'+i+'">×'+multText(m)+'</div>').join("")+'</div></div>'+
    betBox("",'<button class="btn y full" id="pldrop">'+C.texts.btnDrop+'</button>')+
    rulesBox(tpl(C.texts.rulePlinko,{cap:Math.max(...M),rtp:rtpOf(g)}))+histBox;
  bindBet(b);
  const bd=$("plbd");
  for(let r=0;r<PL_ROWS;r++)for(let c=0;c<=r;c++){
    const px=50+(2*c-r)*(100/(2*(PL_ROWS+1)));
    const p=el("div","plpeg");p.style.left=px+"%";p.style.top=(10+r*9.6)+"%";bd.appendChild(p);
  }
  resetBall();safeClick($("pldrop"),()=>plDrop(g,M));
  cur.upd=()=>{base();$("hist").innerHTML=histHTML(g);$("pldrop").disabled=busy;};
}};
async function plDrop(g,M){
  if(busy||!U)return;const bet=getBet();if(!(bet>0))return gmsg(C.texts.errBetVal,"er");
  lastAction=Date.now();busy=true;hold=true;plAnimating=true;$("pldrop").disabled=true;
  document.querySelectorAll(".plbk").forEach(x=>x.classList.remove("hit"));resetBall();gmsg("الكرة بدأت النزول...");
  try{
    const data=await apiCall("play",{gameId:g.id,stake:bet,idempotencyKey:crypto.randomUUID()}),o=data.outcome;
    await plAnimate(o.path||[]);document.querySelectorAll(".plbk").forEach(x=>x.classList.toggle("hit",Number(x.dataset.i)===Number(o.bucket)));
    await sleep(300);plAnimating=false;hold=false;busy=false;U.balance=Number(data.balance);render();result(Number(data.payout),bet,"×"+multText(o.multiplier));refreshMe(false).then(()=>render()).catch(()=>{});
  }catch(e){plAnimating=false;hold=false;busy=false;upd();gmsg(e.message||C.texts.errNet,"er");}
}
function plAnimate(path){
  return new Promise(res=>{
    const ball=$("plball"),rope=$("plrope");if(!ball){res();return;}
    const step=100/(PL_ROWS+1)/2;
    let x=50,pos=0,angle=0;
    const tick=()=>{
      if(pos>=PL_ROWS){
        ball.style.left=x+"%";ball.style.top="91%";ball.style.transform="rotate("+angle+"deg)";
        if(rope){rope.style.left=x+"%";rope.style.height="91%";}
        setTimeout(res,420);return;
      }
      const dir=path[pos]?1:-1;x+=dir*step;pos++;angle+=dir*105;
      const y=10+pos*9.6;
      ball.style.left=x+"%";ball.style.top=y+"%";ball.style.transform="rotate("+angle+"deg)";
      if(rope){rope.style.left=x+"%";rope.style.height=y+"%";}
      setTimeout(tick,250);
    };
    if(rope){rope.style.left="50%";rope.style.height="3%";}
    tick();
  });
}

/* ---------- الحسابات والاتصال الآمن بالخادم ---------- */
function mapAccount(data){
  const a=data.user||{},w=data.wallet||{};
  const bets={};(data.sportsBets||[]).forEach(b=>{bets[b.id]={id:b.id,matchId:b.match_id,matchTitle:b.matchTitle,team1:b.team1,team2:b.team2,marketId:b.market_id,marketTitle:b.marketTitle,optionId:b.option_id,optionLabel:b.optionLabel,stake:Number(b.stake),odds:Number(b.odds),status:b.status,payout:Number(b.payout),createdAt:new Date(b.created_at).getTime()};});
  const active=data.active||null;
  return {
    id:a.legacyUserId||a.id,userId:a.id,username:a.username,displayName:a.displayName,role:a.role,closed:false,
    scale:Number(a.scale)||100,balance:Number(w.balance)||0,rounds:Number(w.rounds)||0,wins:Number(w.wins)||0,losses:Number(w.losses)||0,
    wagered:Number(w.wagered)||0,returned:Number(w.returned)||0,displayName:a.displayName||"",profile:a.profile||{},
    hist:(data.history||[]).map(x=>({g:x.g,bet:Number(x.bet),win:Number(x.win),t:Number(x.t),i:Number(x.i)})),sportsBets:bets,
    sportsChains:(data.sportsChains||[]).map(x=>({
      id:x.id,initialStake:Number(x.initial_stake)||0,currentBalance:Number(x.current_balance)||0,
      totalLegs:Number(x.total_legs)||0,processedLegs:Number(x.processed_legs)||0,nextLegOrder:Number(x.next_leg_order)||1,
      status:x.status,createdAt:x.created_at?new Date(x.created_at).getTime():0,
      completedAt:x.completed_at?new Date(x.completed_at).getTime():0,
      legs:(x.legs||x.sports_chain_legs||[]).map(l=>({
        id:l.id,order:Number(l.order_no)||0,matchId:l.match_id,marketId:l.market_id,optionId:l.option_id,
        snapshot:l.match_snapshot||{},odds:Number(l.odds)||0,stake:Number(l.actual_stake)||0,payout:Number(l.payout)||0,
        result:l.result_status||"pending",processedAt:l.processed_at||null
      })).sort((a,b)=>a.order-b.order)
    })),
    ap:active&&active.gameId==="apple"?{k:active.gameId,bet:active.stake,level:active.level,picks:active.picks||[],safeN:active.safeN,hazards:active.revealedHazards||[],roundId:active.id,version:active.version}:null,
    cr:active&&(active.gameId==="crash"||active.gameId==="rocket")?{k:active.gameId,bet:active.stake,t0:active.startedAt,auto:active.auto,roundId:active.id,version:active.version}:null,
    creditRequest:null
  };
}
async function refreshMe(shouldRender=true){
  if(!name)return null;
  const wasSportsEnabled=sportsFeatureEnabled();
  const data=await apiCall("me",{},false);
  if(typeof data.sportsEnabled==="boolean")C.settings.sportsEnabled=data.sportsEnabled;
  csrfToken=data.csrfToken||csrfToken;
  U=mapAccount(data);
  if(shouldRender&&!hold&&!plAnimating)render();
  if(wasSportsEnabled!==sportsFeatureEnabled())initSportScoreFeed();
  if(U.cr&&cur&&cur.g.id===U.cr.k)crLoop();
  return U;
}
async function loadPublicConfig(){
  try{const cfg=await apiCall("public_config",{},false);merge(cfg);applyCfg();applySportsAvailability();if(U)render();}
  catch(e){console.warn("site config unavailable",e);}
}
function attach(n){
  name=n;ref=true;
  refreshMe(false).then(()=>{showApp();render();settleUserSportsBets();initSportScoreFeed();}).catch(e=>{logout(e.message||"سجّل دخول من جديد");});
}
async function logout(t){
  if(chatPollTimer)clearInterval(chatPollTimer);chatPollTimer=0;crStop();
  try{if(csrfToken)await apiCall("logout",{});}catch(e){console.warn("logout",e);}
  ref=null;name=null;U=null;csrfToken="";hold=false;busy=false;chatOn=false;
  localStorage.removeItem(SESS);localStorage.removeItem("ws_sess3");show("home");showAuth(t);
}
function setAuth(m){
  authMode=m;$("confirmPasswordWrap").hidden=m!=="reg";$("p2").hidden=m!=="reg";
  $("t_login").className=m==="login"?"on":"";$("t_reg").className=m==="reg"?"on":"";
  $("agb").textContent=m==="reg"?C.texts.btnReg:C.texts.btnLogin;
  $("forgot").hidden=m==="reg";$("aerr").textContent="";$("aerr").style.color="";
}
async function auth(){
  const reg=authMode==="reg",n=nd($("u").value).trim().toLowerCase(),p=$("p").value,err=t=>$("aerr").textContent=t;
  if(!/^[a-z0-9_]{3,20}$/.test(n))return err("اسم المستخدم من 3 إلى 20 حرف إنجليزي أو أرقام أو _ بدون مسافات");
  if(reg&&p.length<10)return err("كلمة السر الجديدة يجب أن تكون 10 أحرف على الأقل");
  if(!reg&&p.length<1)return err("اكتب كلمة السر");
  if(reg){if(p===n)return err("كلمة السر لازم تختلف عن اسم المستخدم");if(p!==$("p2").value)return err("كلمتا السر غير متطابقتين");}
  err("جارٍ التحقق...");$("agb").disabled=true;
  try{
    const data=await authCall(reg?"register":"login",{username:n,password:p});
    csrfToken=data.csrfToken||"";$("p").value="";$("p2").value="";localStorage.removeItem(SESS);localStorage.removeItem("ws_sess3");
    err("");attach(n);
  }catch(e){err(e.message||C.texts.errNet);}
  finally{$("agb").disabled=false;}
}
$("agb").type="button";$("agb").onclick=auth;
$("t_login").onclick=()=>setAuth("login");$("t_reg").onclick=()=>setAuth("reg");

$("p").onkeydown=$("p2").onkeydown=e=>{if(e.key==="Enter")auth();};
$("forgot").onclick=()=>{$("aerr").style.color="var(--tx)";$("aerr").textContent=C.texts.forgotMsg;setTimeout(()=>$("aerr").style.color="",5000);};
$("mout").onclick=()=>logout();
$("pgback").onclick=()=>show("more");
$("matchBack").onclick=()=>{show("home");requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,sportsScrollY)));};
$("gamesQ").oninput=renderGames;
$("banbtn").onclick=()=>show("games");
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>show(b.dataset.v));
$("activityPick").onclick=()=>{
  const menu=$("activityMenu");
  menu.hidden=!menu.hidden;
  $("activityPick").setAttribute("aria-expanded",String(!menu.hidden));
};
document.querySelectorAll("[data-activity]").forEach(b=>b.onclick=()=>{
  activityType=b.dataset.activity==="games"?"games":"sports";
  $("activityMenu").hidden=true;
  $("activityPick").setAttribute("aria-expanded","false");
  renderAct();
});
let welcomeIndex=0;
function renderWelcome(){
  document.querySelectorAll("[data-welcome-slide]").forEach((slide,i)=>slide.hidden=i!==welcomeIndex);
  const dots=$("welcomeDots");if(dots)dots.querySelectorAll("span").forEach((dot,i)=>dot.classList.toggle("active",i===welcomeIndex));
  $("welcomeBack").hidden=welcomeIndex===0;
  $("welcomeNext").innerHTML=welcomeIndex===2?'ابدأ التجربة <span>←</span>':'التالي <span>←</span>';
}
function openWelcome(){
  let seen=false;try{seen=localStorage.getItem("rukn_welcome_seen_v2")==="1";}catch(e){}
  if(seen)return;
  welcomeIndex=0;renderWelcome();$("welcomeTour").hidden=false;
}
function closeWelcome(){
  $("welcomeTour").hidden=true;
  try{localStorage.setItem("rukn_welcome_seen_v2","1");}catch(e){}
}
$("welcomeNext").onclick=()=>{if(welcomeIndex<2){welcomeIndex++;renderWelcome();}else closeWelcome();};
$("welcomeBack").onclick=()=>{if(welcomeIndex>0){welcomeIndex--;renderWelcome();}};
$("welcomeSkip").onclick=closeWelcome;
setAuth("login");showAuth();loadPublicConfig();openWelcome();
(async()=>{
  try{const data=await apiCall("me",{},false);if(typeof data.sportsEnabled==="boolean")C.settings.sportsEnabled=data.sportsEnabled;csrfToken=data.csrfToken||"";name=data.user.username;U=mapAccount(data);ref=true;showApp();render();initSportScoreFeed();if(U.cr)crLoop();}
  catch(e){showAuth();}
})();
setInterval(()=>{if(U&&name&&!busy&&!hold&&document.visibilityState!=="hidden")refreshMe(true).catch(()=>{});},12000);
