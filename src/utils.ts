import { Context } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";
import { settings } from "../settings.ts";
import { getJWTKey } from "./crypto.ts";
import { getUActivity, getUMetaInfo } from "./db.ts";
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
  const hash_hex = hash_arr.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

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
  const uuidPart = genUUID(6);

  return encodeURIComponent(titlePart + "-" + uuidPart);
}

/**
 * Generates a comment ID for identifying comments through a URI.
 * @param {string} inReplyTo
 * @return {string} A comment ID suitable for URIs.
 */
export function genCommentID(inReplyTo: string) {
  return inReplyTo + "-" + genUUID(4);
}

/**
 * Throws a Web API usage error.
 * @param {Context} ctx Oak context.
 * @param {string} message Error message.
 * @param {number} status Response status (Defaults to 404).
 */
export function throwAPIError(ctx: Context, message?: string, status?: number) {
  message ??= "An unknown error occurred.";
  status ??= 400;

  ctx.response.body = {
    "err": true,
    "msg": message,
  };

  ctx.response.status = status;
  ctx.response.type = "application/json";
}

/**
 * Validate incoming POST requests.
 * Will return an object with request data.
 * @param {Context} ctx Oak context
 */
export async function authData(ctx: Context) {
  const rawAuth = await ctx.request.headers.get("Authorization");
  const auth = rawAuth.split(" ")[1];

  if (!auth) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }
  if (!ctx.request.hasBody) {
    return throwAPIError(ctx, "No body provided.", 400);
  }

  const raw = await ctx.request.body();
  if (raw.type !== "json") {
    return throwAPIError(
      ctx,
      "Invalid content type (Must be application/json)",
      400,
    );
  }

  const requestJSON = await raw.value;
  const decodedAuth = await verify(auth, await getJWTKey());

  if (!decodedAuth.name) {
    return throwAPIError(ctx, "No name provided", 400);
  }

  const userInfo = await getUMetaInfo(decodedAuth.name);

  if (!userInfo[1].includes(decodedAuth.iat)) {
    return throwAPIError(ctx, "Invalid issue date.", 400);
  }

  return {
    "decoded": decodedAuth,
    "request": requestJSON,
  };
}

export async function sendToFollowers(id: string, obj: any) {
  /*
  const follows = await getUActivity(id, "followers");
  console.log(follows);

  for (let follower in follows.orderedItems) {
    const u = new URL(follower);

    if (u.origin === settings.siteURL) {
      // Deliver locally, and nothing more.
      const username = u.pathname.split("/").pop();
      // Add to inbox of local user.
      let inbox = await getUActivity(ctx.params.id, "inbox");
      inbox.orderedItems.push(obj.id);
      inbox.totalItems = inbox.orderedItems.length;

      await basicObjectUpdate("users", {
        "inbox": inbox,
      }, username);
    } else {
      // REMINDER:
      // Add HTTP headers, and whatnot.
      // Read below for more details:
      // https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/
      const actInfo = await fetch(follower, {
        headers: {
          "Accept": "application/activity+json",
          "Content-Type": "application/activity+json",
        },
        method: "GET",
      });
      actInfo = await actInfo.json();

      const r = await fetch(actInfo.inbox, {
        headers: {
          "Accept": "application/activity+json",
          "Content-Type": "application/activity+json",
        },
        method: "POST",
        body: JSON.stringify(obj),
      });
    }
  }
  */
}

export function parseHTTPSig(msg: string) {
  let res: any = {};

  msg.split(",").map((x) => {
    let c = x.split("=");
    console.log(c[1]);
    c[1] = c[1].substring(1, c[1].length - 1);
    console.log(c[1]);
    res[`${c[0]}`] = c[1];
  });

  return res;
}

export function properCharRange(m: string): boolean {
  const regex = /^[A-Za-z0-9_]{1,24}$/;
  return regex.test(m);
}

export function checkInstanceBlocked(str: string, ctx: Context) {
  if (settings.federationParams.blocked.includes(str)) {
    throwAPIError(ctx, "Your instance is banned", 400);
  }
}
