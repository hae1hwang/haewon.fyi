// Passwords for protected projects. Only salted, deliberately slow hashes are kept here, never
// the passwords themselves, and the check runs in the visitor's browser. Any one of them
// unlocks every protected project.
export const PASSWORD_SALT = "haewon.fyi/projects";
export const PASSWORD_ITERATIONS = 150000;
export const PASSWORD_HASHES = [
  "e1e8949d92a647aa76ceb9a72da5478323bf5912bdc3644337b7e023ddb8b566",
  "f7f9a60b3e1195555f36f2a3ebdbbb910700b86dc35a9273d4808dc93fec39b5",
  "d251d663e9a9d6e08d6804698506a99d7e29c61279c1c271683fc92ac9399514",
];

export async function checkPassword(input: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(input.trim()), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encoder.encode(PASSWORD_SALT), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
      key,
      256
    );
    const hex = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
    return PASSWORD_HASHES.includes(hex);
  } catch {
    // no Web Crypto (e.g. an insecure page): treat it as wrong rather than letting anyone in
    return false;
  }
}
