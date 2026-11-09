import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import { build } from "esbuild";

const ROOT = process.cwd();
const BASE_URL = (process.env.OTA_BASE_URL || "https://rukn-algharb-main.vercel.app").replace(/\/$/, "");
const SUPABASE_URL = "https://qoeefydvmkdigixsbpuy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_buyanIYkhiKL8rQPw2mZpg_J7c4bXAn";
const APPS = {
  player: {
    appId: "com.ruknalgharb.player",
    keyEnv: "OTA_PLAYER_PRIVATE_KEY",
    manifestUrl: BASE_URL + "/ota/player/latest.json",
    releaseNotes: "تحديث جديد لتطبيق ركن الغرب"
  },
  admin: {
    appId: "com.ruknalgharb.admin",
    keyEnv: "OTA_ADMIN_PRIVATE_KEY",
    manifestUrl: SUPABASE_URL + "/functions/v1/ota-api",
    supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY,
    releaseNotes: "تحديث جديد للوحة المشرف"
  }
};

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function listFiles(directory, relative) {
  const root = relative || "";
  const entries = await readdir(path.join(directory, root), { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const result = [];
  for (const entry of entries) {
    const rel = path.posix.join(root.split(path.sep).join("/"), entry.name);
    const absolute = path.join(directory, rel);
    if (entry.isDirectory()) result.push(...await listFiles(directory, rel));
    else if (entry.isFile()) result.push({ rel: rel.split(path.sep).join("/"), absolute });
  }
  return result;
}

async function makeBundle(directory, app) {
  await rm(path.join(directory, "ota.js"), { force: true });
  await rm(path.join(directory, "ota-config.js"), { force: true });

  const indexPath = path.join(directory, "index.html");
  let html = await readFile(indexPath, "utf8");
  html = html
    .replace(/<script\b[^>]*src=["'][^"']*ota-config\.js[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script\b[^>]*src=["'][^"']*ota\.js[^"']*["'][^>]*><\/script>/gi, "");
  await writeFile(indexPath, html, "utf8");

  await build({
    entryPoints: [path.join(ROOT, "android-wrapper/shared/ota-runtime.js")],
    bundle: true,
    minify: true,
    legalComments: "none",
    platform: "browser",
    format: "iife",
    target: ["es2020"],
    outfile: path.join(directory, "ota.js"),
    logLevel: "info"
  });

  const files = await listFiles(directory);
  const hash = createHash("sha256");
  hash.update(app.appId + "\n");
  for (const file of files) {
    hash.update(file.rel + "\0");
    hash.update(await readFile(file.absolute));
    hash.update("\0");
  }
  const bundleId = hash.digest("hex");

  const config = {
    app: app.name,
    appId: app.appId,
    embeddedVersion: bundleId,
    manifestUrl: app.manifestUrl,
    supabasePublishableKey: app.supabasePublishableKey || null
  };
  await writeFile(
    path.join(directory, "ota-config.js"),
    "window.__RUKN_OTA_CONFIG__=" + JSON.stringify(config) + ";",
    "utf8"
  );

  const tags = '<script src="./ota-config.js"></script><script src="./ota.js"></script>';
  if (!/<\/head>/i.test(html)) throw new Error("index.html is missing </head>.");
  html = html.replace(/<\/head>/i, tags + "</head>");
  await writeFile(indexPath, html, "utf8");
  return bundleId;
}

function zipDirectory(directory) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("warning", (error) => {
      if (error.code === "ENOENT") reject(error);
    });
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.directory(directory, false);
    archive.finalize();
  });
}

async function createSignedBundle(directory, app) {
  const bundleId = await makeBundle(directory, app);
  const zip = await zipDirectory(directory);
  const checksum = createHash("sha256").update(zip).digest("hex");
  const rawKey = process.env[app.keyEnv];
  if (!rawKey) throw new Error("Missing Vercel environment variable " + app.keyEnv);
  const privateKey = createPrivateKey(rawKey.replace(/\\n/g, "\n"));
  if (privateKey.asymmetricKeyType !== "rsa") throw new Error(app.keyEnv + " must be an RSA private key.");

  const appConfigPath = path.join(ROOT, "android-wrapper", app.name, "capacitor.config.json");
  const appConfig = JSON.parse(await readFile(appConfigPath, "utf8"));
  const configuredPublicKey = appConfig?.plugins?.LiveUpdate?.publicKey;
  if (typeof configuredPublicKey !== "string" || !configuredPublicKey.includes("BEGIN PUBLIC KEY")) {
    throw new Error("Missing embedded Live Update public key for " + app.name + ".");
  }
  const derivedPublicKey = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
  const normalizeKey = (value) => value.replace(/\s+/g, "");
  const derivedFingerprint = createHash("sha256").update(normalizeKey(derivedPublicKey)).digest("hex");
  const embeddedFingerprint = createHash("sha256").update(normalizeKey(configuredPublicKey)).digest("hex");
  console.log(app.name + " OTA signing-key fingerprint: private-derived=" + derivedFingerprint + " embedded=" + embeddedFingerprint);
  if (derivedFingerprint !== embeddedFingerprint) {
    throw new Error("OTA signing key does not match the public key embedded in the " + app.name + " APK.");
  }

  const signature = sign("sha256", zip, privateKey).toString("base64");

  return {
    bundleId,
    zip,
    manifest: {
      schemaVersion: 1,
      appId: app.appId,
      bundleId,
      artifactType: "zip",
      url: app.name === "player"
        ? BASE_URL + "/ota/player/" + bundleId + ".zip"
        : null,
      checksum,
      signature,
      releaseNotes: app.releaseNotes,
      publishedAt: new Date().toISOString()
    }
  };
}

async function publishAdminBundle(result) {
  const token = process.env.OTA_PUBLISH_TOKEN;
  if (!token || token.length < 64) throw new Error("Missing Vercel environment variable OTA_PUBLISH_TOKEN.");
  const response = await fetch(SUPABASE_URL + "/functions/v1/ota-publish", {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/zip",
      "x-ota-publish-token": token,
      "x-ota-app-id": result.manifest.appId,
      "x-ota-bundle-id": result.bundleId,
      "x-ota-checksum": result.manifest.checksum,
      "x-ota-signature": result.manifest.signature,
      "x-ota-source-commit": process.env.VERCEL_GIT_COMMIT_SHA || ""
    },
    body: result.zip
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true || payload.bundleId !== result.bundleId) {
    throw new Error("Private admin OTA publish failed: HTTP " + response.status + " " + String(payload.error || "unknown"));
  }
  return payload;
}

async function publishAll() {
  const playerOtaRoot = path.join(ROOT, "ota", "player");
  await rm(playerOtaRoot, { recursive: true, force: true });
  await mkdir(playerOtaRoot, { recursive: true });
  const temporary = await mkdtemp(path.join(os.tmpdir(), "rukn-ota-"));

  try {
    const playerDir = path.join(temporary, "player");
    const adminDir = path.join(temporary, "admin");
    await mkdir(playerDir, { recursive: true });
    await mkdir(adminDir, { recursive: true });

    const playerFiles = [
      "index.html",
      "manifest.webmanifest",
      "install.html",
      "install.js",
      "sw.js",
      "icons/app-icon.svg"
    ];
    for (const relative of playerFiles) {
      const destination = path.join(playerDir, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(ROOT, relative), destination);
    }
    await cp(
      path.join(ROOT, "android-wrapper/shared/pwa-native.js"),
      path.join(playerDir, "pwa.js")
    );

    const adminResponse = await fetch(
      "https://raw.githubusercontent.com/alkhbaralawl-max/in-dex.html/admin-private-domain-fix/admin.html",
      { cache: "no-store" }
    );
    if (!adminResponse.ok) throw new Error("Could not fetch the current admin.html source: HTTP " + adminResponse.status);
    await writeFile(path.join(adminDir, "index.html"), await adminResponse.text(), "utf8");

    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      const playerPreviewId = await makeBundle(playerDir, { ...APPS.player, name: "player" });
      const adminPreviewId = await makeBundle(adminDir, { ...APPS.admin, name: "admin" });
      console.log("preview: player OTA bundle assembled " + playerPreviewId);
      console.log("preview: admin OTA bundle assembled " + adminPreviewId);
      console.log("preview: skipped signing and production publication");
      return;
    }

    const playerResult = await createSignedBundle(playerDir, { ...APPS.player, name: "player" });
    await writeFile(path.join(playerOtaRoot, playerResult.bundleId + ".zip"), playerResult.zip);
    await writeFile(path.join(playerOtaRoot, "latest.json"), JSON.stringify(playerResult.manifest, null, 2) + "\n", "utf8");
    console.log("player: published public bundle " + playerResult.bundleId);

    const adminResult = await createSignedBundle(adminDir, { ...APPS.admin, name: "admin" });
    const adminPublish = await publishAdminBundle(adminResult);
    console.log("admin: uploaded private bundle " + adminPublish.bundleId + " (" + adminPublish.uploadedBytes + " bytes)");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function buildEmbedded() {
  const appName = arg("--app", "");
  const directory = path.resolve(ROOT, arg("--dir", ""));
  if (!APPS[appName]) throw new Error("Use --app player or --app admin.");
  const app = { ...APPS[appName], name: appName };
  const bundleId = await makeBundle(directory, app);
  console.log(appName + ": embedded OTA runtime; bundle " + bundleId);
}

const mode = arg("--mode", "publish");
if (mode === "embedded") {
  await buildEmbedded();
} else if (mode === "publish") {
  await publishAll();
} else {
  throw new Error("Unknown mode: " + mode);
}