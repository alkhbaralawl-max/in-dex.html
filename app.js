const GAMES=[
{id:"slots",name:"السلوتس",emoji:"🎰",category:"classic",tag:"الأكثر شعبية",desc:"لفّ البكرات وشاهد الرموز المتتابعة في تجربة سلوتس كلاسيكية."},
{id:"roulette",name:"الروليت الأوروبي",emoji:"🎡",category:"classic",tag:"كلاسيكية",desc:"عجلة الروليت الأوروبية بأرقامها وصفرها الأخضر، مع لوحة اختيارات واضحة."},
{id:"blackjack",name:"بلاك جاك",emoji:"🂡",category:"cards",tag:"ورق",desc:"تعرّف على قواعد بلاك جاك وطريقة تكوين يد قريبة من 21."},
{id:"baccarat",name:"باكارات",emoji:"🃏",category:"cards",tag:"ورق",desc:"واجهة باكارات أنيقة تعرض يد اللاعب ويد الموزّع وقواعد الجولة."},
{id:"video-poker",name:"فيديو بوكر",emoji:"♠️",category:"cards",tag:"ورق",desc:"كوّن أفضل تشكيلة من أوراق اللعب في تجربة فيديو بوكر."},
{id:"dice",name:"النرد",emoji:"🎲",category:"quick",tag:"سريعة",desc:"نرد بواجهة واضحة ونتيجة مرئية بعد كل تجربة توضيحية."},
{id:"sicbo",name:"سيك بو",emoji:"🎲",category:"quick",tag:"سريعة",desc:"ثلاثة أحجار نرد مع خيارات عرض متنوعة ومبسطة."},
{id:"keno",name:"كينو",emoji:"🔢",category:"quick",tag:"سريعة",desc:"اختر أرقامًا من لوحة كينو وشاهد نموذج النتيجة."},
{id:"bingo",name:"بينجو",emoji:"🔵",category:"quick",tag:"سريعة",desc:"بطاقة أرقام مرتبة وسحب توضيحي للأرقام."},
{id:"plinko",name:"بلينكو",emoji:"🔮",category:"original",tag:"أصلية",desc:"كرة تتحرك عبر مسار من الدبابيس وصولًا إلى خانة في الأسفل."},
{id:"mines",name:"ماينز",emoji:"💎",category:"original",tag:"أصلية",desc:"شبكة مربعات لاكتشاف الجواهر وتعلّم قواعد ماينز."},
{id:"crash",name:"كراش",emoji:"🚀",category:"original",tag:"أصلية",desc:"مؤشر مضاعف متحرك في عرض بصري توضيحي."},
{id:"limbo",name:"ليمبو",emoji:"📈",category:"original",tag:"أصلية",desc:"واجهة هدف ومضاعف مع شرح آلية لعبة ليمبو."},
{id:"hi-lo",name:"هاي لو",emoji:"🂱",category:"cards",tag:"ورق",desc:"توقّع ما إذا كانت الورقة التالية أعلى أم أقل."},
{id:"tower",name:"البرج",emoji:"🗼",category:"original",tag:"أصلية",desc:"اصعد طوابق البرج في تجربة تفاعلية قصيرة."},
{id:"coinflip",name:"قلب العملة",emoji:"🪙",category:"quick",tag:"سريعة",desc:"صورة عملة متحركة ووجهان للاختيار."},
{id:"wheel",name:"عجلة الحظ",emoji:"🎯",category:"classic",tag:"كلاسيكية",desc:"عجلة قطاعات متعددة مع حركة دوران في الواجهة."},
{id:"scratch",name:"كروت الخدش",emoji:"🎟️",category:"quick",tag:"سريعة",desc:"بطاقات قابلة للكشف بتصميم احتفالي."},
{id:"dragon-tiger",name:"دراجون تايجر",emoji:"🐉",category:"cards",tag:"ورق",desc:"مقارنة ورقتين في واجهة دراجون تايجر."},
{id:"craps",name:"كرابس",emoji:"🎲",category:"classic",tag:"كلاسيكية",desc:"لوحة كرابس مبسطة مع شرح النرد ومناطق الطاولة."}
];
let activeFilter="all",selectedGame=null,selectedOption=0;
const $=id=>document.getElementById(id);
function renderGames(){
 const q=$("gameSearch").value.trim().toLowerCase();
 const list=GAMES.filter(g=>(activeFilter==="all"||g.category===activeFilter)&&(!q||g.name.toLowerCase().includes(q)));
 $("gamesGrid").innerHTML=list.map(g=>'<button class="game-card" data-game="'+g.id+'" style="--glow:'+({classic:"#c44dff88",quick:"#e3a94d88",original:"#4dbdff77",cards:"#e55eaa77"}[g.category])+'"><div class="game-art"><span class="game-tag">'+g.tag+'</span><span class="emoji">'+g.emoji+'</span></div><div class="game-info"><div><b>'+g.name+'</b><small>افتح التفاصيل</small></div><span class="game-arrow">←</span></div></button>').join("");
 document.querySelectorAll("[data-game]").forEach(btn=>btn.addEventListener("click",()=>openGame(btn.dataset.game)));
}
function setView(id,navActive){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 $(id).classList.add("active");
 document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.nav===(navActive||id.replace("View","").toLowerCase())));
 window.scrollTo({top:0,behavior:"smooth"});
}
function openGame(id){
 selectedGame=GAMES.find(g=>g.id===id); if(!selectedGame)return;
 $("gameTitle").textContent=selectedGame.name;$("gameEmoji").textContent=selectedGame.emoji;$("gameDesc").textContent=selectedGame.desc;
 $("panelLabel").textContent=selectedGame.id==="roulette"?"اختر منطقة في لوحة الروليت — عرض فقط":"اختر عنصرًا لعرض شكل التفاعل";
 const options=selectedGame.id==="roulette"?["الأحمر","الأسود","فردي","زوجي","1–12","13–24","25–36"]:selectedGame.id==="blackjack"?["سحب ورقة","تثبيت اليد","شرح القواعد"]:selectedGame.id==="mines"?["شبكة 3×3","شبكة 4×4","شبكة 5×5"]:selectedGame.id==="hi-lo"?["أعلى","أقل","شرح اللعبة"]:["الخيار الأول","الخيار الثاني","شرح الجولة"];
 $("optionGrid").innerHTML=options.map((o,i)=>'<button class="option-btn '+(i===0?"selected":"")+'" data-option="'+i+'">'+o+'</button>').join("");
 selectedOption=0;
 document.querySelectorAll("[data-option]").forEach(b=>b.addEventListener("click",()=>{selectedOption=Number(b.dataset.option);document.querySelectorAll("[data-option]").forEach(x=>x.classList.toggle("selected",x===b));$("demoMessage").classList.remove("show");}));
 $("demoMessage").classList.remove("show");
 setView("gameView","games");
}
$("runDemo").addEventListener("click",()=>{
 const options=document.querySelectorAll("[data-option]");
 const choice=options[selectedOption]?.textContent||"اختيار تجريبي";
 $("demoMessage").textContent="تم عرض تفاعل واجهة توضيحي للعبة "+selectedGame.name+" — الاختيار: "+choice+". لا توجد نتيجة فعلية ولا خصم أو إضافة نقاط في هذه المعاينة.";
 $("demoMessage").classList.add("show");
});
$("resetDemo").addEventListener("click",()=>{selectedOption=0;document.querySelectorAll("[data-option]").forEach((x,i)=>x.classList.toggle("selected",i===0));$("demoMessage").classList.remove("show");});
$("backHome").addEventListener("click",()=>setView("homeView"));$("homeIcon").addEventListener("click",()=>setView("homeView"));
$("backFromAccount").addEventListener("click",()=>setView("homeView"));
$("profileBtn").addEventListener("click",()=>setView("accountView"));
$("menuBtn").addEventListener("click",()=>setView("accountView"));
$("heroGames").addEventListener("click",()=>{activeFilter="all";document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));setView("homeView");$("gameSearch").focus();});
$("gameSearch").addEventListener("input",renderGames);
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderGames();}));
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>{
 const nav=b.dataset.nav;
 if(nav==="account")setView("accountView");
 else if(nav==="home"||nav==="games"){setView("homeView");if(nav==="games")$("gameSearch").focus();}
 else{$("demoMessage").textContent=nav==="favorites"?"ستُفعّل المفضلة عند ربط الحسابات في النسخة الفعلية.":"سيظهر سجل الجولات بعد ربط قاعدة البيانات.";setView("accountView");}
}));
renderGames();