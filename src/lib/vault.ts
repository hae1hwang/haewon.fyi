// Opens the protected case studies in public/protected/ (see scripts/encrypt-protected.mjs).
// Everything there is encrypted; a correct password unwraps the content key, which lives only in
// memory until the page is left, or lock() is called when the unlock times out.
import type { CaseStudy } from "@/data/caseStudies";

type VaultFile = { iterations: number; keys: { salt: string; iv: string; wrapped: string }[] };
type Payload = { study: CaseStudy; assets: Record<string, { file: string; type: string }> };

let key: CryptoKey | null = null;
let vaultFile: Promise<VaultFile> | null = null;
let studies = new Map<string, Promise<CaseStudy>>();
let blobUrls: string[] = [];

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// iv (12 bytes) followed by the ciphertext
async function open(data: Uint8Array): Promise<ArrayBuffer> {
  if (!key) throw new Error("locked");
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12));
}

// true when the password opens the vault (any one of the passwords will do)
export async function unlock(password: string): Promise<boolean> {
  try {
    vaultFile ??= fetch("/protected/vault.json").then((r) => r.json() as Promise<VaultFile>);
    const vault = await vaultFile;
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.trim()), "PBKDF2", false, ["deriveKey"]);
    for (const entry of vault.keys) {
      try {
        const kek = await crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: decode(entry.salt), iterations: vault.iterations, hash: "SHA-256" },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
        const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(entry.iv) }, kek, decode(entry.wrapped));
        key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
        return true;
      } catch {
        // not this entry's password: try the next
      }
    }
    return false;
  } catch {
    // no Web Crypto (e.g. an insecure page) or no vault: treat it as wrong rather than letting anyone in
    return false;
  }
}

// forget the key and everything decrypted with it
export function lock() {
  key = null;
  studies = new Map();
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls = [];
}

// A protected case study with its images turned into blob: URLs, ready to render
export function getProtectedStudy(folder: string, title: string): Promise<CaseStudy> {
  const name = `${folder}/${title}`;
  let pending = studies.get(name);
  if (!pending) {
    pending = load(name);
    studies.set(name, pending);
    // a failed load shouldn't stick: let it be tried again
    pending.catch(() => studies.delete(name));
  }
  return pending;
}

async function load(name: string): Promise<CaseStudy> {
  const id = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name))).slice(0, 16);
  const payload: Payload = JSON.parse(new TextDecoder().decode(await open(await fetchBytes(`/protected/${id}.enc`))));
  // decrypt every image once, then point the case study at the decrypted copies
  const urls = new Map<string, string>();
  await Promise.all(
    Object.entries(payload.assets).map(async ([path, asset]) => {
      const bytes = await open(await fetchBytes(`/protected/a/${asset.file}.bin`));
      const url = URL.createObjectURL(new Blob([bytes], { type: asset.type }));
      blobUrls.push(url);
      urls.set(path, url);
    })
  );
  let json = JSON.stringify(payload.study);
  // longest paths first, so one image's name can't be swallowed by another's
  for (const path of [...urls.keys()].sort((a, b) => b.length - a.length)) json = json.split(path).join(urls.get(path)!);
  return JSON.parse(json) as CaseStudy;
}
