import { Capacitor } from "@capacitor/core";
import { LiveUpdate } from "@capawesome/capacitor-live-update";

(function startRuknLiveUpdates() {
  const config = window.__RUKN_OTA_CONFIG__;
  if (!config || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

  const appNames = { player: "ركن الغرب", admin: "لوحة المشرف" };
  const expectedAppIds = {
    player: "com.ruknalgharb.player",
    admin: "com.ruknalgharb.admin"
  };
  if (!expectedAppIds[config.app] || config.appId !== expectedAppIds[config.app]) return;

  window.__RUKN_NATIVE_OTA__ = true;
  const ready = LiveUpdate.ready();
  ready.then(() => {
    const check = () => checkForUpdate().catch(() => {});
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(check, 500), { once: true });
    } else {
      setTimeout(check, 500);
    }
  }).catch(() => {});

  function addStyles() {
    if (document.getElementById("rukn-ota-style")) return;
    const style = document.createElement("style");
    style.id = "rukn-ota-style";
    style.textContent = [
      "#rukn-ota-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl;font-family:Tahoma,Arial,sans-serif}",
      "#rukn-ota-dialog{width:min(100%,420px);background:linear-gradient(145deg,#21190b,#090806);border:1px solid #c99a37;border-radius:20px;box-shadow:0 24px 80px #000c;padding:24px;color:#fff1cf;text-align:center}",
      "#rukn-ota-dialog h2{margin:0 0 10px;color:#f5d477;font-size:23px}",
      "#rukn-ota-dialog p{margin:8px 0 16px;color:#d8c69e;line-height:1.8;font-size:14px}",
      "#rukn-ota-progress{width:100%;height:13px;border-radius:20px;overflow:hidden;background:#352812;border:1px solid #795c24;margin:16px 0 7px}",
      "#rukn-ota-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#b57b19,#ffe18a);transition:width .18s ease}",
      "#rukn-ota-percent{font-weight:900;color:#ffdf80;font-size:19px;font-variant-numeric:tabular-nums}",
      "#rukn-ota-status{font-size:12px;color:#cbb98f;min-height:22px;margin:8px 0 12px}",
      ".rukn-ota-actions{display:flex;gap:9px;margin-top:12px}",
      ".rukn-ota-actions button{flex:1;border:0;border-radius:12px;padding:13px 10px;font-size:15px;font-weight:900;cursor:pointer}",
      "#rukn-ota-start{background:linear-gradient(180deg,#f5d783,#b98120);color:#1b1204}",
      "#rukn-ota-later{background:#211a0d;color:#eddaa9;border:1px solid #71551f}",
      "#rukn-ota-start:disabled,#rukn-ota-later:disabled{opacity:.55;cursor:wait}",
      "@media(max-width:360px){#rukn-ota-dialog{padding:18px}#rukn-ota-dialog h2{font-size:20px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function createDialog(manifest) {
    addStyles();
    const old = document.getElementById("rukn-ota-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "rukn-ota-overlay";
    overlay.innerHTML =
      '<section id="rukn-ota-dialog" role="dialog" aria-modal="true" aria-labelledby="rukn-ota-title">' +
      '<div style="font-size:35px;margin-bottom:8px">✦</div>' +
      '<h2 id="rukn-ota-title">يتوفر تحديث جديد</h2>' +
      '<p id="rukn-ota-description">يوجد إصدار جديد من ' + appNames[config.app] + '. اضغط تحديث الآن لتثبيته داخل التطبيق.</p>' +
      '<div id="rukn-ota-progress"><div id="rukn-ota-progress-fill"></div></div>' +
      '<div id="rukn-ota-percent">0%</div>' +
      '<div id="rukn-ota-status">التحديث جاهز للتحميل</div>' +
      '<div class="rukn-ota-actions">' +
      '<button id="rukn-ota-start" type="button">تحديث الآن</button>' +
      '<button id="rukn-ota-later" type="button">لاحقًا</button>' +
      "</div></section>";
    document.body.appendChild(overlay);

    if (manifest.releaseNotes) {
      const description = document.getElementById("rukn-ota-description");
      description.textContent = String(manifest.releaseNotes).slice(0, 240);
    }

    const start = document.getElementById("rukn-ota-start");
    const later = document.getElementById("rukn-ota-later");
    later.addEventListener("click", () => overlay.remove());
    start.addEventListener("click", () => downloadAndApply(manifest, overlay, start, later));
    return overlay;
  }

  function setProgress(value, status) {
    const safe = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const fill = document.getElementById("rukn-ota-progress-fill");
    const percent = document.getElementById("rukn-ota-percent");
    const label = document.getElementById("rukn-ota-status");
    if (fill) fill.style.width = safe + "%";
    if (percent) percent.textContent = safe + "%";
    if (label && status) label.textContent = status;
  }

  function validateManifest(manifest) {
    if (!manifest || manifest.appId !== config.appId) return false;
    if (typeof manifest.bundleId !== "string" || !/^[a-f0-9]{64}$/i.test(manifest.bundleId)) return false;
    if (typeof manifest.checksum !== "string" || !/^[a-f0-9]{64}$/i.test(manifest.checksum)) return false;
    if (typeof manifest.signature !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(manifest.signature)) return false;
    if (typeof manifest.url !== "string") return false;
    const url = new URL(manifest.url);
    const manifestOrigin = new URL(config.manifestUrl).origin;
    return url.protocol === "https:" &&
      url.origin === manifestOrigin &&
      url.pathname.startsWith("/ota/" + config.app + "/") &&
      url.pathname.endsWith(".zip");
  }

  async function checkForUpdate() {
    const response = await fetch(config.manifestUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return;
    const manifest = await response.json();
    if (!validateManifest(manifest)) return;

    const current = await LiveUpdate.getCurrentBundle();
    const installedId = current.bundleId || config.embeddedVersion;
    if (installedId === manifest.bundleId) return;

    const blocked = await LiveUpdate.getBlockedBundles().catch(() => ({ bundleIds: [] }));
    if (Array.isArray(blocked.bundleIds) && blocked.bundleIds.includes(manifest.bundleId)) return;

    createDialog(manifest);
  }

  async function downloadAndApply(manifest, overlay, start, later) {
    start.disabled = true;
    later.disabled = true;
    start.textContent = "جارٍ التحديث...";
    setProgress(0, "جارٍ تجهيز ملفات التحديث");

    let progressListener = null;
    try {
      progressListener = await LiveUpdate.addListener("downloadBundleProgress", (event) => {
        if (event && event.bundleId && event.bundleId !== manifest.bundleId) return;
        const value = Number(event && event.progress);
        if (Number.isFinite(value)) setProgress(value * 100, "جارٍ تحميل التحديث");
      });

      const downloaded = await LiveUpdate.getDownloadedBundles();
      const isDownloaded = Array.isArray(downloaded.bundleIds) && downloaded.bundleIds.includes(manifest.bundleId);
      if (!isDownloaded) {
        await LiveUpdate.downloadBundle({
          artifactType: "zip",
          url: manifest.url,
          bundleId: manifest.bundleId,
          checksum: manifest.checksum,
          signature: manifest.signature
        });
      }

      setProgress(100, "اكتمل التحميل والتحقق من سلامة التحديث");
      await LiveUpdate.setNextBundle({ bundleId: manifest.bundleId });
      start.textContent = "جارٍ فتح النسخة الجديدة...";
      setProgress(100, "يتم تطبيق التحديث الآن");
      await LiveUpdate.reload();
    } catch (error) {
      if (progressListener) await progressListener.remove().catch(() => {});
      start.disabled = false;
      later.disabled = false;
      start.textContent = "إعادة المحاولة";
      setProgress(0, "تعذر تثبيت التحديث. النسخة الحالية ما زالت تعمل بأمان.");
    }
    if (progressListener) await progressListener.remove().catch(() => {});
  }
})();