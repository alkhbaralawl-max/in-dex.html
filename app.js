const GAMES=[
{id:"slots",name:"السلوتس",emoji:"🎰",category:"classic",tag:"الأكثر شعبية",desc:"ثلاث بكرات ورموز متعددة. طابق الرموز لعرض العائد التجريبي."},
{id:"roulette",name:"الروليت الأوروبي",emoji:"🎡",category:"classic",tag:"كلاسيكية",desc:"اختر اللون أو الزوجي والفردي أو الصفر ثم شاهد نتيجة العجلة."},
{id:"blackjack",name:"بلاك جاك",emoji:"🂡",category:"cards",tag:"ورق",desc:"قارن مجموع أوراقك بمجموع الموزّع في جولة مبسطة."},
{id:"baccarat",name:"باكارات",emoji:"🃏",category:"cards",tag:"ورق",desc:"اختر اللاعب أو البنك أو التعادل قبل كشف الورقتين."},
{id:"video-poker",name:"فيديو بوكر",emoji:"♠️",category:"cards",tag:"ورق",desc:"اكشف خمس أوراق وشاهد تصنيف اليد."},
{id:"dice",name:"النرد",emoji:"🎲",category:"quick",tag:"سريعة",desc:"توقع هل مجموع حجرَي النرد أكبر أم أقل من سبعة."},
{id:"sicbo",name:"سيك بو",emoji:"🎲",category:"quick",tag:"سريعة",desc:"ثلاثة أحجار نرد ونتيجة كبيرة أو صغيرة."},
{id:"keno",name:"كينو",emoji:"🔢",category:"quick",tag:"سريعة",desc:"اختر مجموعة أرقام وقارنها بالأرقام المسحوبة."},
{id:"bingo",name:"بينجو",emoji:"🔵",category:"quick",tag:"سريعة",desc:"اختر رقمًا من 1 إلى 25 وشاهد الرقم المسحوب."},
{id:"plinko",name:"بلينكو",emoji:"🔮",category:"original",tag:"أصلية",desc:"أسقط الكرة عبر الدبابيس إلى خانة عشوائية."},
{id:"mines",name:"ماينز",emoji:"💎",category:"original",tag:"أصلية",desc:"اختر مربعًا واحدًا من شبكة تجريبية بها لغم واحد."},
{id:"crash",name:"كراش",emoji:"🚀",category:"original",tag:"أصلية",desc:"حدد نقطة سحب افتراضية وقارنها بنقطة الانهيار العشوائية."},
{id:"limbo",name:"ليمبو",emoji:"📈",category:"original",tag:"أصلية",desc:"حدد مضاعفًا مستهدفًا وشاهد هل تتجاوزه النتيجة."},
{id:"hi-lo",name:"هاي لو",emoji:"🂱",category:"cards",tag:"ورق",desc:"توقع هل الورقة التالية أعلى أم أقل من الورقة الحالية."},
{id:"tower",name:"البرج",emoji:"🗼",category:"original",tag:"أصلية",desc:"اختر عدد الطوابق وشاهد هل تصعدها كلها بأمان."},
{id:"coinflip",name:"قلب العملة",emoji:"🪙",category:"quick",tag:"سريعة",desc:"اختر صورة أو كتابة ثم اقلب العملة."},
{id:"wheel",name:"عجلة الحظ",emoji:"🎯",category:"classic",tag:"كلاسيكية",desc:"اختر لونًا وشاهد أين تتوقف العجلة."},
{id:"scratch",name:"كروت الخدش",emoji:"🎟️",category:"quick",tag:"سريعة",desc:"اكشف ثلاث خانات وابحث عن رموز متطابقة."},
{id:"dragon-tiger",name:"دراجون تايجر",emoji:"🐉",category:"cards",tag:"ورق",desc:"قارن ورقة التنين بورقة النمر."},
{id:"craps",name:"كرابس",emoji:"🎲",category:"classic",tag:"كلاسيكية",desc:"اختر خط اللاعب أو العكس ثم ارمِ حجرَي النرد."}
];
const DEMO_FEE=.07,START_BALANCE=10000;
let activeFilter="all",selectedGame=null,selectedOption=0,balance=Number(localStorage.getItem("rukn_demo_balance")||START_BALANCE),history=JSON.parse(localStorage.getItem("rukn_demo_history")||"[]"),favorites=JSON.parse(localStorage.getItem("rukn_demo_favs")||"[]");
const $=id=>document.getElementById(id);
const rand=n=>Math.floor(Math.random()*n);
const pick=a=>a[rand(a.length)];
const money=n=>Number(n).toLocaleString("ar-EG",{maximumFractionDigits:2});
const save=()=>{localStorage.setItem("rukn_demo_balance",String(balance));localStorage.setItem("rukn_demo_history",JSON.stringify(history.slice(0,60)));localStorage.setItem("rukn_demo_favs",JSON.stringify(favorites));};
const dice=()=>rand(6)+1;
const card=()=>rand(13)+1;
const cardName=n=>n===1?"A":n===11?"J":n===12?"Q":n===13?"K":String(n);
function renderGames(){
 const q=$("gameSearch").value.trim().toLowerCase();
 const list=GAMES.filter(g=>(activeFilter==="all"||g.category===activeFilter)&&(!q||(g.name+" "+g.desc).toLowerCase().includes(q)));
 $("gamesGrid").innerHTML=list.map(g=>'<button class="game-card" data-game="'+g.id+'" style="--glow:'+({classic:"#c44dff88",quick:"#e3a94d88",original:"#4dbdff77",cards:"#e55eaa77"}[g.category])+'"><div class="game-art"><span class="game-tag">'+g.tag+'</span><span class="emoji">'+g.emoji+'</span></div><div class="game-info"><div><b>'+g.name+'</b><small>'+(favorites.includes(g.id)?"★ في المفضلة":"افتح اللعبة")+'</small></div><span class="game-arrow">←</span></div></button>').join("");
 document.querySelectorAll("[data-game]").forEach(btn=>btn.addEventListener("click",()=>openGame(btn.dataset.game)));
}
function setView(id,navActive){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 $(id).classList.add("active");
 document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.nav===(navActive||id.replace("View","").toLowerCase())));
 window.scrollTo({top:0,behavior:"smooth"});
}
function choicesFor(g){
 const map={
 roulette:["أحمر","أسود","زوجي","فردي","الصفر"],
 blackjack:["سحب ورقة إضافية","تثبيت اليد"],
 baccarat:["اللاعب","البنك","تعادل"],
 dice:["أكبر من 7","أقل من 7"],
 sicbo:["كبير (11–17)","صغير (4–10)"],
 keno:["اختيار 1: 1، 4، 7، 12","اختيار 2: 2، 5، 9، 16","اختيار 3: 3، 8، 14، 20"],
 bingo:["7","13","21"],
 plinko:["مخاطرة منخفضة","مخاطرة متوسطة","مخاطرة مرتفعة"],
 mines:["المربع 1","المربع 2","المربع 3","المربع 4","المربع 5","المربع 6","المربع 7","المربع 8","المربع 9"],
 crash:["سحب عند ×1.5","سحب عند ×2","سحب عند ×3"],
 limbo:["×1.5","×2","×3","×5"],
 "hi-lo":["أعلى","أقل"],
 tower:["طابق واحد","طابقان","3 طوابق"],
 coinflip:["صورة","كتابة"],
 wheel:["ذهبي","بنفسجي","أزرق"],
 "dragon-tiger":["التنين","النمر","تعادل"],
 craps:["خط اللاعب","عكس خط اللاعب"]
 };
 return map[g.id]||["ابدأ الجولة"];
}
function openGame(id){
 selectedGame=GAMES.find(g=>g.id===id);if(!selectedGame)return;
 $("gameTitle").textContent=selectedGame.name;$("gameEmoji").textContent=selectedGame.emoji;$("gameDesc").textContent=selectedGame.desc;
 $("panelLabel").textContent="اختار إعداد الجولة التجريبية";
 selectedOption=0;
 const choices=choicesFor(selectedGame);
 $("optionGrid").style.display="block";
 $("optionGrid").innerHTML='<div class="demo-balance-row"><span>رصيدك الافتراضي</span><b id="liveBalance">'+money(balance)+'</b></div><label class="demo-label" for="demoStake">قيمة الجولة بالنقاط الافتراضية</label><input id="demoStake" class="demo-stake" type="number" min="1" max="1000" step="1" value="100"><div class="demo-choices">'+choices.map((o,i)=>'<button type="button" class="option-btn '+(i===0?"selected":"")+'" data-option="'+i+'">'+o+'</button>').join("")+'</div><button type="button" class="favorite-btn" id="favoriteBtn">'+(favorites.includes(id)?"★ إزالة من المفضلة":"☆ أضف للمفضلة")+'</button><div class="demo-fee">نموذج تجريبي فقط · لا أموال حقيقية · خصم توضيحي 7% من صافي العائد عند الفوز</div>';
 document.querySelectorAll("[data-option]").forEach(b=>b.addEventListener("click",()=>{selectedOption=Number(b.dataset.option);document.querySelectorAll("[data-option]").forEach(x=>x.classList.toggle("selected",x===b));}));
 $("favoriteBtn").addEventListener("click",()=>{favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save();$("favoriteBtn").textContent=favorites.includes(id)?"★ إزالة من المفضلة":"☆ أضف للمفضلة";renderGames();});
 $("demoMessage").classList.remove("show");
 $("runDemo").textContent="ابدأ الجولة التجريبية";
 $("resetDemo").textContent="إعادة ضبط";
 $("runDemo").onclick=runRound;
 $("resetDemo").onclick=()=>{$("demoStake").value=100;$("demoMessage").classList.remove("show");};
 updateBalance();
 setView("gameView","games");
}
function resolve(g,choice){
 let detail="",mult=0,won=false;
 switch(g.id){
 case "slots":{const s=["🍒","🍋","🔔","⭐","7️⃣","💎"],r=[pick(s),pick(s),pick(s)],same=r[0]===r[1]&&r[1]===r[2],pair=r[0]===r[1]||r[0]===r[2]||r[1]===r[2];mult=same?5:pair?1.5:0;detail=r.join("  ");break;}
 case "roulette":{const n=rand(37),reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],color=n===0?"الصفر":reds.includes(n)?"أحمر":"أسود";won=(choice===color)||(choice==="زوجي"&&n!==0&&n%2===0)||(choice==="فردي"&&n%2===1);mult=choice==="الصفر"?35:2;detail="الرقم: "+n+" · "+color;break;}
 case "blackjack":{const p=card()+card(),d=card()+card(),extra=choice===0?card():0,pt=p+extra;mult=pt<=21&&(pt>d||d>21)?2:pt===d?1:0;detail="أوراقك: "+p+(extra?" + "+extra:"")+" = "+pt+" · الموزّع: "+d;break;}
 case "baccarat":{const p=(card()+card())%10,b=(card()+card())%10,w=p>b?"اللاعب":b>p?"البنك":"تعادل";won=choice===w;mult=w==="تعادل"?8:w==="البنك"?1.95:2;detail="اللاعب "+p+" · البنك "+b+" · النتيجة "+w;break;}
 case "video-poker":{const ranks=Array.from({length:5},()=>card()),counts={};ranks.forEach(x=>counts[x]=(counts[x]||0)+1);const vals=Object.values(counts).sort((a,b)=>b-a);mult=vals[0]===4?20:vals[0]===3&&vals[1]===2?8:vals[0]===3?4:vals[0]===2&&vals[1]===2?2:vals[0]===2?1.5:0;detail="الأوراق: "+ranks.map(cardName).join(" · ");break;}
 case "dice":{const a=dice(),b=dice(),sum=a+b;won=choice===0?sum>7:sum<7;mult=2;detail="النرد: "+a+" + "+b+" = "+sum;break;}
 case "sicbo":{const r=[dice(),dice(),dice()],sum=r.reduce((a,b)=>a+b,0),triple=r.every(x=>x===r[0]),big=sum>=11;won=!triple&&(choice===0?big:!big);mult=1.9;detail="النرد: "+r.join(" · ")+" = "+sum+(triple?" · ثلاثية":"");break;}
 case "keno":{const sets=[[1,4,7,12],[2,5,9,16],[3,8,14,20]],chosen=sets[choice],draw=[];while(draw.length<6){const n=rand(20)+1;if(!draw.includes(n))draw.push(n);}const hits=chosen.filter(x=>draw.includes(x)).length;mult=hits>=4?8:hits===3?2.5:0;detail="أرقامك "+chosen.join("، ")+" · المسحوب "+draw.join("، ")+" · التطابق "+hits;break;}
 case "bingo":{const n=rand(25)+1,target=[7,13,21][choice];won=n===target;mult=20;detail="رقمك "+target+" · الرقم المسحوب "+n;break;}
 case "plinko":{const arrays=[[1.6,1.3,1.1,0.9,0.7,0.9,1.1,1.3,1.6],[4,2,1.2,0.5,0.3,0.5,1.2,2,4],[8,3,1,0.2,0,0.2,1,3,8]],a=arrays[choice],i=rand(a.length);mult=a[i];detail="سقطت الكرة في الخانة "+(i+1)+" · المضاعف ×"+mult;break;}
 case "mines":{const mine=rand(9),cell=choice;won=cell!==mine;mult=1.8;detail="اختيارك المربع "+(cell+1)+" · "+(won?"ظهر جوهر 💎":"ظهر لغم 💣");break;}
 case "crash":{const target=[1.5,2,3][choice],crash=1+Math.random()*3.5;won=crash>=target;mult=target;detail="نقطة الانهيار ×"+crash.toFixed(2)+" · "+(won?"تم السحب عند ×"+target:"انفجار قبل السحب");break;}
 case "limbo":{const target=[1.5,2,3,5][choice],result=1+Math.random()*5;won=result>=target;mult=target;detail="النتيجة ×"+result.toFixed(2)+" · الهدف ×"+target;break;}
 case "hi-lo":{const a=card(),b=card(),higher=b>a;won=(choice===0&&higher)||(choice===1&&!higher&&b!==a);mult=2;detail="الورقة الحالية "+cardName(a)+" · التالية "+cardName(b);break;}
 case "tower":{const steps=choice+1;let safe=true,done=0;for(let i=0;i<steps;i++){if(Math.random()<0.22){safe=false;break;}done++;}won=safe;mult=Math.pow(1.35,steps);detail="وصلت إلى "+done+" من "+steps+" طوابق"+(safe?" بأمان":" · تعثرت");break;}
 case "coinflip":{const side=rand(2),label=side===0?"صورة":"كتابة";won=choice===side;mult=1.9;detail="نتيجة العملة: "+label;break;}
 case "wheel":{const colors=["ذهبي","بنفسجي","أزرق","بنفسجي","ذهبي","أزرق","بنفسجي","ذهبي","أزرق","بنفسجي"];const c=pick(colors);won=c===["ذهبي","بنفسجي","أزرق"][choice];mult=2.7;detail="توقفت العجلة على "+c;break;}
 case "scratch":{const s=["🍀","💎","⭐","🍒","👑"],r=[pick(s),pick(s),pick(s)],same=r[0]===r[1]&&r[1]===r[2],pair=r[0]===r[1]||r[0]===r[2]||r[1]===r[2];mult=same?4:pair?1.5:0;detail="البطاقة: "+r.join("  ");break;}
 case "dragon-tiger":{const d=card(),t=card(),w=d>t?"التنين":t>d?"النمر":"تعادل";won=choice===({0:"التنين",1:"النمر",2:"تعادل"}[choice])&&choice===({ "التنين":0,"النمر":1,"تعادل":2}[w]);mult=w==="تعادل"?8:2;detail="التنين "+cardName(d)+" · النمر "+cardName(t)+" · "+w;break;}
 case "craps":{const a=dice(),b=dice(),sum=a+b;won=choice===0?[7,11].includes(sum):[2,3,12].includes(sum);mult=choice===0?2:3;detail="رمي النرد "+a+" + "+b+" = "+sum;break;}
 }
 if(!won&&mult>0)mult=0;
 return {mult,detail};
}
function runRound(){
 if(!selectedGame)return;
 const stake=Math.floor(Number($("demoStake").value));
 if(!Number.isFinite(stake)||stake<1||stake>1000)return showMessage("أدخل قيمة بين 1 و1000 نقطة افتراضية.",false);
 if(stake>balance)return showMessage("رصيدك الافتراضي لا يكفي. أعد ضبط الرصيد التجريبي من حسابك.",false);
 const choice=selectedOption,{mult,detail}=resolve(selectedGame,choice);
 const gross=mult>0?stake*mult:0;
 const payout=gross>stake?stake+(gross-stake)*(1-DEMO_FEE):gross;
 const net=payout-stake;
 balance=Math.round((balance-stake+payout)*100)/100;
 const item={game:selectedGame.name,detail,stake,payout,net,at:new Date().toISOString()};
 history.unshift(item);save();updateBalance();
 const status=net>0?"فوز تجريبي":net===0?"تعادل":"لم تفز في هذه الجولة";
 showMessage(status+" — "+detail+" — "+(net>0?"صافي العائد ":"صافي التغير ")+(net>0?"+":"")+money(net)+" نقطة. الرصيد الآن "+money(balance)+".",net>0);
 const stats=document.querySelectorAll(".game-stats .stat b");if(stats[0])stats[0].textContent=money(balance);
}
function showMessage(message,win){
 $("demoMessage").textContent=message;$("demoMessage").classList.add("show");$("demoMessage").style.borderColor=win?"#35d69a":"#a55cbd";
}
function updateBalance(){
 const live=$("liveBalance");if(live)live.textContent=money(balance);
 const stats=document.querySelectorAll(".game-stats .stat b");if(stats[0])stats[0].textContent=money(balance);
 const account=$("accountView");if(account){let p=account.querySelector(".game-desc");if(p)p.textContent="الرصيد الافتراضي الحالي: "+money(balance)+" نقطة. تم حفظ سجل الجولات والمفضلة على هذا الجهاز للمعاينة.";}
}
$("backHome").addEventListener("click",()=>setView("homeView"));
$("homeIcon").addEventListener("click",()=>setView("homeView"));
$("backFromAccount").addEventListener("click",()=>setView("homeView"));
$("profileBtn").addEventListener("click",()=>{updateBalance();setView("accountView","account");});
$("menuBtn").addEventListener("click",()=>{updateBalance();setView("accountView","account");});
$("heroGames").addEventListener("click",()=>{activeFilter="all";document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));setView("homeView");$("gameSearch").focus();});
$("gameSearch").addEventListener("input",renderGames);
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderGames();}));
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>{
 const nav=b.dataset.nav;
 if(nav==="account"){updateBalance();setView("accountView","account");}
 else if(nav==="home"||nav==="games"){setView("homeView",nav);if(nav==="games")$("gameSearch").focus();}
 else if(nav==="favorites"){
  activeFilter="all";setView("homeView","games");$("gameSearch").value="";renderGames();
  $("gamesGrid").innerHTML=GAMES.filter(g=>favorites.includes(g.id)).map(g=>'<button class="game-card" data-game="'+g.id+'"><div class="game-art"><span class="emoji">'+g.emoji+'</span></div><div class="game-info"><b>'+g.name+'</b><small>★ في المفضلة</small></div></button>').join("");
  document.querySelectorAll("[data-game]").forEach(btn=>btn.addEventListener("click",()=>openGame(btn.dataset.game)));
 }else{
  updateBalance();setView("accountView","account");
  const p=$("accountView").querySelector(".game-desc");if(p)p.textContent=history.length?"آخر الجولات: "+history.slice(0,8).map(x=>x.game+" ("+(x.net>=0?"+":"")+money(x.net)+")").join(" · "):"لا توجد جولات مسجلة بعد.";
 }
}));
const style=document.createElement("style");
style.textContent='.demo-balance-row{display:flex;justify-content:space-between;align-items:center;background:#21132f;border:1px solid #654180;border-radius:12px;padding:10px 12px;margin-bottom:10px;color:#ddc5ee;font-size:12px}.demo-balance-row b{color:#ffd778;font-size:17px}.demo-label{display:block;text-align:right;color:#d9c5e8;font-size:11px;margin:8px 0 5px}.demo-stake{width:100%;height:44px;border:1px solid #654180;background:#160d20;color:#fff;border-radius:11px;padding:0 12px;font-size:16px}.demo-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.favorite-btn{width:100%;padding:10px;border:1px solid #88632c;border-radius:11px;background:#2b1d20;color:#ffd778;font-weight:800}.demo-fee{margin-top:9px;color:#d0b8df;font-size:9px;line-height:1.8}.demo-message{white-space:normal;line-height:1.9}';
document.head.appendChild(style);
renderGames();updateBalance();
