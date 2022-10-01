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
export function getJWTKey(): Promise<CryptoKey> {
  return key;
}

// Exports key data.
export async function exportJWTKey() {
  keyStorage.jwk = await crypto.subtle.exportKey("jwk", key);
  const str = JSON.stringify(keyStorage);

  // Store in memory for as short a time as possible
  keyStorage.jwk = {};

  await Deno.writeFile(jwt.keyFile, encoder.encode(str), { mode: 0o600 });
}

// Regenerates a key (just in case you want a new one)
export async function regenerateJWTKey() {
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
  await exportJWTKey();
}

// Import a key from a keyfile.
export async function importJWTKey() {
  let data, str;

  // Try reading directly -- if that fails, regenerate the key.
  try {
    data = await Deno.readFile(jwt.keyFile);
    str = decoder.decode(data);
  } catch {
    await regenerateJWTKey();
    return;
  }

  // No data means we regenerate.
  if (str.length === 0) {
    await regenerateJWTKey();
    return;
  }

  // Move data to keyStorage.
  keyStorage = JSON.parse(str);
  str = "";

  // Is it revokin' time?
  if (Date.now() - keyStorage.creationDate >= jwt.keyLifetime) {
    await regenerateJWTKey();
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
  await exportJWTKey();
}

await importJWTKey();

/**
 * Wrap a key.
 * @param t Type of key. `PUBLIC` or `PRIVATE`.
 * @param s Encoded key.
 * @returns Formatted key.
 */
function wrapKey(t, s) {
  return `-----BEGIN ${t} KEY-----\n${s}\n-----END ${t} KEY-----`;
}

/**
 * Encode binary to ASCII output.
 * @param buf Raw key.
 * @returns Encoded key.
 */
function encode(buf) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
}

// Generates a keypair.
// Returns a public/private keypair.
export async function genKeyPair(): string[] {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const rawPublicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey,
  );

  const rawPrivateKey = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );

  const publicKey = wrapKey("PUBLIC", encode(rawPublicKey));
  const privateKey = wrapKey("PRIVATE", encode(rawPrivateKey));

  return [publicKey, privateKey];
}

// Convert string to array buffer.
// From https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
export function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Extract a key from formatted input.
 * @param keyType Type of Key. `public` or `private`.
 * @param key Formatted key.
 * @returns Crypto Keypair.
 */
export function extractKey(keyType: string, key: string) {
  if (keyType === "public") {
    const keyHeader = "-----BEGIN PUBLIC KEY-----";
    const keyFooter = "-----END PUBLIC KEY-----";
    const keyContents = key.substring(
      keyHeader.length,
      key.length - keyFooter.length,
    );

    const binaryString = atob(keyContents);
    const keyToImport = str2ab(binaryString);

    return crypto.subtle.importKey(
      "spki",
      keyToImport,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      true,
      ["verify"],
    );
  } else if (keyType === "private") {
    const keyHeader = "-----BEGIN PRIVATE KEY-----";
    const keyFooter = "-----END PRIVATE KEY-----";
    const keyContents = key.substring(
      keyHeader.length,
      key.length - keyFooter.length,
    );

    const binaryString = atob(keyContents);
    const keyToImport = str2ab(binaryString);

    return window.crypto.subtle.importKey(
      "pkcs8",
      keyToImport,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      true,
      ["sign"],
    );
  } else {
    throw new Error("Invalid key type");
  }
}

// TODO: Add interface for these

// HTTP Boilerplate function.
// Mainly used for internal sending functions.
export function genHTTPSigBoilerplate(params: string = {}) {
  return (`(request-target): ${params.target}
host: ${params.host}
date: ${params.date}`);
}

// Basic function to sign a message using a key.
// Returns: Signed message.
export async function simpleSign(msg: string, privateKey: unknown) {
  const enc = new TextEncoder();
  const encoded = enc.encode(msg);

  return await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    encoded,
  );
}

// Basic function to verify a message using a key.
// Returns: Boolean
export async function simpleVerify(
  publicKey: unknown,
  msg: string,
  signature: unknown,
) {
  const enc = new TextEncoder();
  const encoded = enc.encode(msg);

  return await window.crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    signature,
    encoded,
  );
}
