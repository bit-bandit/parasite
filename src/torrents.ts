// All torrent related functions.

// Notes:
// -  use `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
//    for all AP/AS related responses.
// -  Don't interact with the database directly - Use `db.ts` for that, instead.

// TODO:
//   - Add GET routes for all torrent columns.

import { Router, Context } from "https://deno.land/x/oak/mod.ts";
import { getKey } from "./crypto.ts";
import { genObj, genOrderedCollection, wrapperCreate } from "./activity.ts";
import {
  addToDB,
  getTorrentJSON,
  getTorrentReplies,
  getUActivity,
  getUMetaInfo,
} from "./db.ts";
import { isValid } from "./auth.ts";
import { genUUID, throwAPIError } from "./utils.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";
import { settings } from "../settings.ts";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts";
import "https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js";

await ammonia.init();
export let torrents = new Router();

async function boilerplateTorrentGet(ctx: Context, res: any) {
  if (!res.err) {
    ctx.response.body = res[0]; // Have to do this because `basicDataQuery` is designed to return arrays.
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    throwAPIError(ctx, "Torrent not found", 404);
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
}

torrents.get("/t/:id", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id);
  await boilerplateTorrentGet(ctx, res)
});

torrents.get("/t/:id/r", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, 'replies');
  await boilerplateTorrentGet(ctx, res)
});

torrents.get("/t/:id/activity", async function (ctx) {
  let res = await getTorrentJSON(ctx.params.id, "activity");
  await boilerplateTorrentGet(ctx, res)
});

// Posting
torrents.post("/t/", async function (ctx) {
  const rawAuth = await ctx.request.headers.get("authorization");
  const auth = rawAuth.split(" ")[1];
  let err = false;
  if (!auth) {
    throwAPIError(ctx, "No authorization provided", 401);
  }
  if (!ctx.request.hasBody) {
    throwAPIError(ctx, "No body provided.", 400);
    err = true;
  }

  let raw = await ctx.request.body();
  if (raw.type !== "json") {
    throwAPIError(ctx, "Invalid content type (Must be application/json)", 400);
    err = true;
  }

  const requestJSON = await raw.value;
  const decodedAuth = await verify(auth, await getKey());

  if (!decodedAuth.name) {
    throwAPIError(ctx, "No name provided", 400);
    err = true;
  }

  const userInfo = await getUMetaInfo(decodedAuth.name);

  if (!userInfo[1].includes(decodedAuth.iat)) {
    throwAPIError(ctx, "Invalid issue date.", 400);
    err = true;
  }

  if (requestJSON.type !== "Create") {
    throwAPIError(ctx, "Invalid activity type", 400);
    err = true;
  }
  // TODO: Check if magnet link is actually valid.
  if (!err) {
    // TODO: Make more spec compliant.
    const info = await getUActivity(decodedAuth.name, "info");
    // TODO: Only allow for `p`, `em`, `strong`, and `a` tags.
    const parse = marked.parse(requestJSON.content);
    
    const id: string = genUUID(12);
    const url = `${settings.siteURL}/t/${id}`;
    // TODO: Tag checking/creation if not exists.
    let tag: string[] = [];
    requestJSON.tags.split(",").map((x) =>
      tag.push(`${settings.siteURL}/tags/${x}`)
    );

    const obj = genObj({
      "id": url,
      "type": "Note",
      "published": "",
      "actor": info.id,
      "name": requestJSON.name,
      "content": marked.parse(requestJSON.content),
      "tags": tag,
      "link": requestJSON.href,
    });
    const activity = wrapperCreate({
      "id": `${url}/activity`,
      "actor": obj.attributedTo,
      "object": obj,
    });
      
    await addToDB("torrents", {
      "id": id,
      "json": obj,
      "activity": activity,
      "uploader": decodedAuth.name,
      "likes": genOrderedCollection(`${url}/likes`),
      "dislikes": genOrderedCollection(`${url}/dislikes`),
      "replies": genOrderedCollection(`${url}/r`),
      "flags": genOrderedCollection(`${url}/flags`),
    });

    ctx.response.body = { "msg": `Torrent uploaded at ${url}`};
    ctx.response.status = 201;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
    ctx.response.headers.set("Location", url);
  }
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
