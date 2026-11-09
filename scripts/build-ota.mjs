import { createHash, createPrivateKey, sign } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import { build } from "esbuild";

const ROOT = process.cwd();
const BASE_URL = "https://rukn-algharb-main.vercel.app";
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
    manifestUrl: BASE_URL + "/ota/admin/latest.json",
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
    manifestUrl: app.manifestUrl
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
  const signature = sign("sha256", zip, privateKey).toString("base64");

  return {
    bundleId,
    zip,
    manifest: {
      schemaVersion: 1,
      appId: app.appId,
      bundleId,
      artifactType: "zip",
      url: BASE_URL + "/ota/" + app.name + "/" + bundleId + ".zip",
      checksum,
      signature,
      releaseNotes: app.releaseNotes,
      publishedAt: new Date().toISOString()
    }
  };
}

async function publishAll() {
  const otaRoot = path.join(ROOT, "ota");
  await rm(otaRoot, { recursive: true, force: true });
  await mkdir(otaRoot, { recursive: true });
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

    for (const name of ["player", "admin"]) {
      const app = { ...APPS[name], name };
      const directory = name === "player" ? playerDir : adminDir;
      const result = await createSignedBundle(directory, app);
      const target = path.join(otaRoot, name);
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, result.bundleId + ".zip"), result.zip);
      await writeFile(path.join(target, "latest.json"), JSON.stringify(result.manifest, null, 2) + "\n", "utf8");
      console.log(name + ": published bundle " + result.bundleId);
    }
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