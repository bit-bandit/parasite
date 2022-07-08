// Crytography related functions.

import { settings } from "../settings.ts";

interface CryptoKeyStorage {
  creationDate: number;
  signedTestData: ArrayBuffer;
  jwk: Record<string, unknown>;
}

const jwt = settings.jwt;
const signingOracle = "fhqwhgads"; // hahah funny

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let keyStorage: CryptoKeyStorage = {} as CryptoKeyStorage;
let key: CryptoKey;

// The only function most people will use.
export function getKey(): Promise<CryptoKey> {
  return key;
}

// Exports key data.
export async function exportKey() {
  keyStorage.jwk = await crypto.subtle.exportKey("jwk", key);
  const str = JSON.stringify(keyStorage);

  // Store in memory for as short a time as possible
  keyStorage.jwk = {};

  await Deno.writeFile(jwt.keyFile, encoder.encode(str), { mode: 0o600 });
}

// Regenerates a key (just in case you want a new one)
export async function regenerateKey() {
  key = await crypto.subtle.generateKey(
    jwt.keyAlgObj,
    true,
    ["sign", "verify"],
  );

  // For key revocation.
  keyStorage.creationDate = Date.now();

  // For verifying that this is the correct key.
  keyStorage.signedTestData = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingOracle),
  );

  // Autosave.
  await exportKey();
}

// Import a key from a keyfile.
export async function importKey() {
  let data, str;

  // Try reading directly -- if that fails, regenerate the key.
  try {
    data = await Deno.readFile(jwt.keyFile);
    str = decoder.decode(data);
  } catch {
    await regenerateKey();
    return;
  }

  // No data means we regenerate.
  if (str.length === 0) {
    await regenerateKey();
    return;
  }

  // Move data to keyStorage.
  keyStorage = JSON.parse(str);
  str = "";

  // Is it revokin' time?
  if (Date.now() - keyStorage.creationDate >= jwt.keyLifetime) {
    await regenerateKey();
    return;
  }

  // Import it.
  key = await crypto.subtle.importKey(
    "jwk",
    keyStorage.jwk,
    jwt.keyAlgObj,
    true,
    ["sign", "verify"],
  );

  // Clear residual data.
  keyStorage.jwk = {};

  // Autosave.
  await exportKey();
}

await importKey();
