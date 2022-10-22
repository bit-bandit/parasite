import { Context } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";
import { settings } from "../settings.ts";
import { getJWTKey } from "./crypto.ts";
import { getUActivity } from "./db.ts";

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
  if (!ctx.request.headers.has("Authorization")) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }

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

  const userInfo = [
    await getUActivity(decodedAuth.name, "id"),
    await getUActivity(decodedAuth.name, "logins"),
    await getUActivity(decodedAuth.name, "roles"),
  ];

  if (!userInfo[1].includes(decodedAuth.iat)) {
    return throwAPIError(ctx, "Invalid issue date.", 400);
  }

  return {
    "decoded": decodedAuth,
    "request": requestJSON,
  };
}

/**
 * Parse incoming HTTP signatures
 * @param msg HTTP signature
 */
export function parseHTTPSig(msg: string) {
  const res = {};

  msg.split(",").map((x) => {
    const c = x.split("=");
    c[1] = c[1].substring(1, c[1].length - 1);
    res[`${c[0]}`] = c[1];
  });

  return res;
}

/**
 * Ensure that a string is within an acceptable character range.
 * @param str Character string.
 */
export function properCharRange(str: string): boolean {
  const regex = /^[A-Za-z0-9_-]{1,24}$/;
  return regex.test(str);
}

/**
 * Ensure that a request from an incoming instance is not banned locally.
 * @param str Instance name.
 * @param {Context} ctx Oak context
 */
export function checkInstanceBlocked(str: string, ctx: Context) {
  if (settings.federationParams.blocked.includes(str)) {
    throwAPIError(ctx, "Your instance is banned", 400);
  }
}
