let deferredPrompt=null;
const button=document.getElementById("installButton"),status=document.getElementById("installStatus");
const standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
if(standalone){button.textContent="التطبيق مثبت بالفعل";button.disabled=true;status.textContent="يمكنك فتح ركن الغرب من أيقونته على جهازك.";}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredPrompt=event;button.disabled=false;button.textContent="تثبيت التطبيق الآن";status.textContent="التطبيق جاهز للتثبيت على جهازك.";});
window.addEventListener("appinstalled",()=>{deferredPrompt=null;button.disabled=true;button.textContent="تم تثبيت التطبيق";status.textContent="تمت الإضافة بنجاح إلى جهازك.";});
button.addEventListener("click",async()=>{
 if(standalone)return;
 if(deferredPrompt){
  button.disabled=true;
  try{deferredPrompt.prompt();const choice=await deferredPrompt.userChoice;status.textContent=choice?.outcome==="accepted"?"تم إرسال طلب التثبيت.":"يمكنك تثبيته لاحقًا من قائمة المتصفح.";}
  catch(e){status.textContent="افتح قائمة المتصفح واختار تثبيت التطبيق.";}
  deferredPrompt=null;button.disabled=false;
 }else{
  status.textContent="على الهاتف افتح قائمة المتصفح ⋮ ثم اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». على iPhone استخدم Safari ثم زر المشاركة.";
 }
});
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{}),{once:true});