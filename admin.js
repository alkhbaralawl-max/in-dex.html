const GAME_DATA=[
["slots","السلوتس","🎰","classic"],["roulette","الروليت الأوروبي","🎡","classic"],["blackjack","بلاك جاك","🂡","cards"],["baccarat","باكارات","🃏","cards"],["video-poker","فيديو بوكر","♠️","cards"],["dice","النرد","🎲","quick"],["sicbo","سيك بو","🎲","quick"],["keno","كينو","🔢","quick"],["bingo","بينجو","🔵","quick"],["plinko","بلينكو","🔮","original"],["mines","ماينز","💎","original"],["crash","كراش","🚀","original"],["limbo","ليمبو","📈","original"],["hi-lo","هاي لو","🂱","cards"],["tower","البرج","🗼","original"],["coinflip","قلب العملة","🪙","quick"],["wheel","عجلة الحظ","🎯","classic"],["scratch","كروت الخدش","🎟️","quick"],["dragon-tiger","دراجون تايجر","🐉","cards"],["craps","كرابس","🎲","classic"]
].map(x=>({id:x[0],name:x[1],emoji:x[2],category:x[3],enabled:true,description:"وصف "+x[1],rules:"تعليمات "+x[1],min:10,max:5000,mult:20,image:""}));
let chosen=null;
const $=id=>document.getElementById(id);
function renderList(){
 const q=$("gameSearch").value.trim();
 const rows=GAME_DATA.filter(g=>g.name.includes(q));
 $("gameList").innerHTML=rows.map(g=>'<div class="game-row"><div class="game-emoji">'+g.emoji+'</div><div class="game-row-info"><b>'+g.name+'</b><small>'+g.id+'</small></div><button class="switch '+(g.enabled?"":"off")+'" data-toggle="'+g.id+'">'+(g.enabled?"مفعّلة":"متوقفة")+'</button><button class="switch" data-edit="'+g.id+'">تعديل</button></div>').join("");
 document.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>{const g=GAME_DATA.find(x=>x.id===b.dataset.toggle);g.enabled=!g.enabled;renderList();$("activeCount").textContent=GAME_DATA.filter(x=>x.enabled).length;}));
 document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>selectGame(b.dataset.edit)));
}
function selectGame(id){
 chosen=GAME_DATA.find(g=>g.id===id);if(!chosen)return;
 $("emptyEditor").hidden=true;$("editor").hidden=false;
 $("titleInput").value=chosen.name;$("descInput").value=chosen.description;$("rulesInput").value=chosen.rules;
 $("categoryInput").value=chosen.category;$("minInput").value=chosen.min;$("maxInput").value=chosen.max;$("multInput").value=chosen.mult;$("imageInput").value=chosen.image;
 $("editorCard").scrollIntoView({behavior:"smooth",block:"start"});
}
$("saveGame").addEventListener("click",()=>{
 if(!chosen)return;
 chosen.name=$("titleInput").value.trim()||chosen.name;chosen.description=$("descInput").value;chosen.rules=$("rulesInput").value;
 chosen.category=$("categoryInput").value;chosen.min=Number($("minInput").value);chosen.max=Number($("maxInput").value);chosen.mult=Number($("multInput").value);chosen.image=$("imageInput").value;
 $("savedToast").classList.add("show");renderList();setTimeout(()=>$("savedToast").classList.remove("show"),2500);
});
$("gameSearch").addEventListener("input",renderList);
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(b.dataset.page).classList.add("active");
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x===b));window.scrollTo(0,0);
}));
function renderDashboard(){
 $("dashboardTop").innerHTML=GAME_DATA.slice(0,4).map(g=>'<div class="game-row"><div class="game-emoji">'+g.emoji+'</div><div class="game-row-info"><b>'+g.name+'</b><small>إعدادات مستقلة</small></div><span style="color:var(--green);font-size:9px">جاهزة للتهيئة</span></div>').join("");
}
renderList();renderDashboard();