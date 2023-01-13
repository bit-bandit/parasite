import { Context } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

import { settings } from "../settings.ts";
import { getJWTKey } from "./crypto.ts";
import { getMetaJSON, getUActivity } from "./db.ts";

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
export async function checkInstanceBlocked(str: string, ctx: Context) {
  const meta = await getMetaJSON();
  if (meta.blocked.includes(str)) {
    throwAPIError(ctx, "Your instance is banned", 400);
  }
}

// TODO:
//   - Add readFile function including local and supabase
//   - Add writeFile function including local and supabase
//
// Both of these should be ~56 SLOC.
// Also change `settings.ts` to something like:
/*
  static: {
    "type": "local" | "supabase",
    "location": filepath | URL,
    "name"?: string, // Supabase only
    "key"?: string, // Supabase only, is like a password
    "options"?: Whatever Supabase uses for this // Supabase only - Obviously!
  }
*/

// Static file content handling.
// These operations are meant to (largely) be agnostic, in terms
// of if it's a flat file structure (Like in Supabase/S3, where
// the '/' are interpreted as being part of the filename), or a
// proper hierarchical filesystem.
//
// For Supabase, we're using the Bucket API. Please read up on the
// documentation before hacking this:
// - https://supabase.com/docs/reference/javascript/storage-createbucket
// - https://supabase.com/docs/guides/storage

/**
 * @description A platform-agnostic way of writing files.
 * @param name A string formatted as something like 'u/bob/avatar.png' - IE, no base directory
 * @param data A Uint8Array containing the data of the file.
 */
export async function writeFile(name: string, data: unknown) {
  if (settings.static.type === "supabase") {
    // Supabase shit.
    const supabase = createClient(
      settings.static.location,
      settings.static.key,
    );

    // First, make sure that the DB exists.
    // We'll automatically create it if it doesn't.
    let res = await supabase.storage.listBuckets();

    if (res.error !== null) {
      return 1;
    }

    // Does the bucket exist?
    let exists = false;

    res.data.map((x) => {
      if (x.name === settings.static.name) {
        exists = true;
      }
    });

    if (!exists) {
      await supabase.storage.createBucket(settings.static.name, {
        public: true,
      });
    }

    // Check if the file already exists. We have to do this,
    // because Supabase doesn't allow clobbering.
    exists = true;

    // Deliberately getting an error like a boss
    res = await supabase.storage.from(settings.static.name).download(name);

    if (res.error) {
      exists = false;
    }

    if (exists) {
      res = await supabase.storage.from(settings.static.name).update(
        name,
        data,
        {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: false,
        },
      );
    } else {
      res = await supabase.storage.from(settings.static.name).upload(
        name,
        data,
        {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: false,
        },
      );
    }
  } else {
    // Check if requested directory exists. If not, create it.
    name = `${settings.static.location}/${name}`;
    let dir = name.split("/");
    dir.pop();
    dir = dir.join("/");

    try {
      Deno.lstat(dir);
    } catch {
      Deno.mkdir(dir);
    }

    await Deno.writeFile(name, data);
  }
}

/**
 * A platform-agnostic way of reading files.
 * @param name A string formatted as something like 'u/bob/avatar.png' - IE, no base directory
 */

export async function readFile(name: string) {
  if (settings.static.type === "supabase") {
    try {
      const supabase = createClient(
        settings.static.location,
        settings.static.key,
      );

      let { data, err } = await supabase.storage.from(settings.static.name)
        .download(name);

      // TODO: Convert `data` blob to UInt8Array
      data = new Uint8Array(await data.arrayBuffer());
      return data;
    } catch {
      return {
        "err": true,
        "msg": "File doesn't exist.",
      };
    }
  } else {
    try {
      const d = await Deno.readFile(name);
      return d;
    } catch {
      return {
        "err": true,
        "msg": "File doesn't exist.",
      };
    }
  }
}
