/**
 * Generates up to 32 universally-unique hex digits at a time to use as an ID.
 * @param {number} length A length, up to 32
 * @returns {string} Unique hex digits at the given length
 */
export function genUUID(length: number) {
  let uuid: string = crypto.randomUUID();

  // Remove dashes from UUID.
  uuid = uuid.split("-").join("");

  length ??= 36; // default to 36
  length = Math.min(length, 36); // cap to 36

  return uuid.slice(length);
}

/**
 * Hashes a password.
 * @param {string} pass The plaintext password.
 * @param {number} date A date to salt with.
 * @return {string} A hashed password.
 */
export async function hashPass(pass: string, date: number) {
  // Salt pass with date then encode into bytes.
  const salted_enc = new TextEncoder().encode(date + pass);

  // Create hash as a byte array.
  const hash_bytes = await crypto.subtle.digest("SHA-256", salted_enc);

  // Convert the byte array to a hex string.
  const hash_arr = Array.from(new Uint8Array(hash_bytes));
  const hash_hex = hash_arr.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hash_hex;
}

/**
 * Generates a 20-length hexadecimal ID for identifying torrents through a URI.
 * @return {string} A new torrent ID suitable for URIs.
 */
export function genTorrentID() {
  return genUUID(20);
}

/**
 * Generates a "TitleOfSomething-c0ffee" type ID for identifying lists through a URI.
 * Remember to check for collisions when using this function.
 * @param {string} title The name of the list.
 * @return {string} A list ID suitable for URIs.
 */
export function genListID(title: string) {
  let titlePart: string;

  // Take the first 3 words of the title..
  titlePart = title.split(" ")
    .slice(0, 3)
    .join("");

  // ..then slice down to the first 32 chars
  titlePart = titlePart.slice(0, 32);

  // Just 6 hex bytes are needed
  // I don't think people are gonna upload >16777216 versions of the same list to the same namespace anyway
  let uuidPart = genUUID(6);

  return encodeURIComponent(titlePart + '-' + uuidPart);
}

/**
 * Generates a comment ID for identifying comments through a URI.
 * @param {string} inReplyTo
 * @return {string} A comment ID suitable for URIs.
 */
export function genCommentID(inReplyTo: string) {
  let uuidPart = genUUID(4);
  return inReplyTo + '-' + uuidPart;
}
