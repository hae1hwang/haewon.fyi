// Locks the protected case studies (private/studies.ts) and the images they use (private/work/…)
// into public/protected/, which is safe to commit: everything in there is AES-256-GCM encrypted.
//
//   npm run encrypt
//
// Passwords: set PROTECTED_PASSWORDS="one,two,three" (or put that line in .env.local, which is
// never committed). Any one password opens every protected project. They are only used here, to
// wrap the content key; they are never written down. The wrapped keys go in vault.json.
//
// The content key itself is kept in private/vault-key.txt (never committed) so re-running this
// only changes the files whose content changed. Delete that file to rotate the key.
import { webcrypto as crypto } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ITERATIONS = 300000;
const enc = new TextEncoder();
const hex = (buf) => Buffer.from(buf).toString("hex");
const b64 = (buf) => Buffer.from(buf).toString("base64");

function passwords() {
  let raw = process.env.PROTECTED_PASSWORDS;
  const envFile = join(root, ".env.local");
  if (!raw && existsSync(envFile)) {
    const m = readFileSync(envFile, "utf8").match(/^PROTECTED_PASSWORDS=(.*)$/m);
    if (m) raw = m[1].trim().replace(/^["']|["']$/g, "");
  }
  const list = (raw ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (list.length === 0) {
    console.error('No passwords. Run:  PROTECTED_PASSWORDS="one,two,three" npm run encrypt');
    process.exit(1);
  }
  return list;
}

async function sha256Hex(data) {
  return hex(await crypto.subtle.digest("SHA-256", data));
}

// the content key: made once, then reused
async function contentKey() {
  const file = join(root, "private", "vault-key.txt");
  if (existsSync(file)) return Buffer.from(readFileSync(file, "utf8").trim(), "base64");
  const raw = crypto.getRandomValues(new Uint8Array(32));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, b64(raw) + "\n");
  return Buffer.from(raw);
}

const raw = await contentKey();
const aesKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
const hmacKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

// iv || ciphertext. The IV comes from the content's own hash, so identical content always
// produces an identical file (no pointless re-uploads) and a changed file always gets a new IV.
async function seal(plain) {
  const digest = await sha256Hex(plain);
  const iv = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, enc.encode("iv:" + digest))).slice(0, 12);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plain));
  const out = new Uint8Array(12 + body.length);
  out.set(iv, 0);
  out.set(body, 12);
  return { bytes: out, digest };
}

// a copy of the content key sealed under each password
async function vault(passwordList) {
  const keys = [];
  for (const pw of passwordList) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
    const kek = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, raw));
    keys.push({ salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped) });
  }
  return { v: 1, iterations: ITERATIONS, keys };
}

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

const { protectedStudies } = await import(pathToFileURL(join(root, "private", "studies.ts")).href);
const outDir = join(root, "public", "protected");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "a"), { recursive: true });

let studyCount = 0;
const assetFiles = new Set();
for (const [name, study] of Object.entries(protectedStudies)) {
  const json = JSON.stringify(study);
  // every image the study points to, wherever it appears (figures, devices, inline hover pictures…)
  const paths = [...new Set(json.match(/\/work\/[A-Za-z0-9_\-/.]+\.(?:jpe?g|png|gif|webp|svg)/gi) ?? [])];
  const assets = {};
  for (const p of paths) {
    const file = join(root, "private", p);
    if (!existsSync(file)) {
      console.error(`Missing image for "${name}": private${p}`);
      process.exit(1);
    }
    const { bytes, digest } = await seal(readFileSync(file));
    const id = digest.slice(0, 24);
    writeFileSync(join(outDir, "a", id + ".bin"), bytes);
    assetFiles.add(id);
    assets[p] = { file: id, type: MIME[p.split(".").pop().toLowerCase()] };
  }
  const { bytes } = await seal(enc.encode(JSON.stringify({ study, assets })));
  // the file name is a hash of the project's name, which the page can work out for itself
  const id = (await sha256Hex(enc.encode(name))).slice(0, 16);
  writeFileSync(join(outDir, id + ".enc"), bytes);
  studyCount++;
  console.log(`${name}: ${paths.length} images`);
}
writeFileSync(join(outDir, "vault.json"), JSON.stringify(await vault(passwords()), null, 1) + "\n");
console.log(`Locked ${studyCount} case studies and ${assetFiles.size} files into public/protected/`);
