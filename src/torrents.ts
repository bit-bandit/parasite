// All torrent related functions.

// Notes:
// -  use `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
//    for all AP/AS related responses.
// -  Don't interact with the database directly - Use `db.ts` for that, instead.

import { Router } from "https://deno.land/x/oak/mod.ts";
import { getKey } from "./crypto.ts";
import { genObj } from "./activity.ts";
import {
  getTorrentJSON,
  getTorrentReplies,
  getUActivity,
  getUMetaInfo,
} from "./db.ts";
import { isValid } from "./auth.ts";
import { genUUID, throwAPIError } from "./utils.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";

export let torrents = new Router();

torrents.get("/t/:id", async function (ctx) {
  let res = await getTorrentJSON(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "Torrent not found.",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
});

torrents.get("/t/:id/r", async function (ctx) {
  let res = await getTorrentReplies(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.respone.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "Torrent not found.",
    };
    ctx.response.status = 404;
    ctx.respone.type = "application/json";
  }
});

// Posting
torrents.post("/t/", async function (ctx) {
  const rawAuth = await ctx.request.headers.get("authorization");
  const auth = rawAuth.split(" ")[1];

  if (!auth) {
    throwAPIError(ctx, "No authorization provided", 401);
  }
  if (!ctx.request.hasBody) {
    throwAPIError(ctx, "No body provided.", 400);
  }

  let raw = await ctx.request.body();
  if (raw.type !== "json") {
    throwAPIError(ctx, "Invalid content type (Must be application/json)", 400);
  }

  const requestJSON = await raw.value;
  const decodedAuth = await verify(auth, await getKey());

  if (!decodedAuth.name) {
    throwAPIError(ctx, "No name provided", 400);
  }

  const userInfo = await getUMetaInfo(decodedAuth.name);

  if (!userInfo[1].includes(decodedAuth.iat)) {
    throwAPIError(ctx, "Invalid issue date.", 400);
  }

  if (requestJSON.type !== "Create") {
    throwAPIError(ctx, "Invalid activity type", 400);
  }

  const info = await getUActivity(decodedAuth.name, "info");
  const url = ``;
  // TODO: Use `genobj` to get this shit taken care of.
});

torrents.post("/t/:id", async function (ctx) {
  if (!ctx.request.hasBody) {
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid content type",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
  }

  let requestJSON = await raw.value();

  switch (requestJSON.type) {
    // Voting
    case "Like":
      break;
    case "Dislike":
      break;
    // Creating a comment.
    case "Create":
      break;
    // Updating
    case "Update":
      break;
    // Delete/Remove
    case "Delete":
    case "Remove":
      break;
    case "Flag":
      break;
    // In case none of the above were met:
    default:
      ctx.response.body = {
        "err": true,
        "msg": "Invalid Activity type",
      };
      ctx.response.status = 400;
      ctx.response.type = "application/json";
  }
});
