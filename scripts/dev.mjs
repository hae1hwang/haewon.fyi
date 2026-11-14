// `npm run dev`: the Next.js dev server, plus (when the private case studies and their passwords
// are on this machine) a watcher that re-encrypts them whenever private/studies.ts or anything
// in private/work/ changes, so localhost follows your edits. Refresh the page to see them.
// Localhost also skips the password screen: the dev server is handed a password to open it with.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, watch } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function havePasswords() {
  if (process.env.PROTECTED_PASSWORDS) return true;
  const envFile = join(root, ".env.local");
  return existsSync(envFile) && /^PROTECTED_PASSWORDS=\S+/m.test(readFileSync(envFile, "utf8"));
}

// the first password, for localhost to open the protected case studies without asking (it is only
// handed to the dev server, never written to a file or used by a build)
function firstPassword() {
  let all = process.env.PROTECTED_PASSWORDS;
  const envFile = join(root, ".env.local");
  if (!all && existsSync(envFile)) all = readFileSync(envFile, "utf8").match(/^PROTECTED_PASSWORDS=(.*)$/m)?.[1];
  return (all ?? "").split(",")[0].trim().replace(/^["']|["']$/g, "");
}

let running = false;
let again = false;
function encrypt() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  const t = Date.now();
  const child = spawn(process.execPath, ["--no-warnings", join(root, "scripts", "encrypt-protected.mjs")], { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  child.on("exit", (code) => {
    running = false;
    console.log(code === 0 ? `[protected] re-encrypted in ${((Date.now() - t) / 1000).toFixed(1)}s, refresh the page` : "[protected] encrypting failed (see above)");
    if (again) {
      again = false;
      encrypt();
    }
  });
}

if (existsSync(join(root, "private", "studies.ts")) && havePasswords()) {
  encrypt();
  let timer;
  watch(join(root, "private"), { recursive: true }, (_event, name) => {
    if (!name || !(name.startsWith("studies.ts") || name.startsWith("work"))) return;
    clearTimeout(timer);
    timer = setTimeout(encrypt, 500);
  });
  console.log("[protected] watching private/studies.ts and private/work/");
} else if (existsSync(join(root, "private", "studies.ts"))) {
  console.log("[protected] no PROTECTED_PASSWORDS (env or .env.local): not watching the private case studies");
}

const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_DEV_UNLOCK: firstPassword() },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => next.kill(sig));
next.on("exit", (code) => process.exit(code ?? 0));
