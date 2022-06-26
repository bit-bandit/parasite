// All torrent related functions.

// Notes:
// -  use `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
//    for all AP/AS related responses.
// -  Don't interact with the database directly - Use `db.ts` for that, instead.

// TODO:
//   - Add GET routes for all torrent columns.

import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { getKey } from "./crypto.ts";
import { genObj, genOrderedCollection, wrapperCreate } from "./activity.ts";
import {
  addToDB,
  deleteTorrent,
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
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/r", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "replies");
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/activity", async function (ctx) {
  let res = await getTorrentJSON(ctx.params.id, "activity");
  await boilerplateTorrentGet(ctx, res);
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

    let d = new Date();

    const obj = genObj({
      "id": url,
      "type": "Note",
      "published": d.toISOString, // TODO: Set this from locale time to UTC
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

    ctx.response.body = { "msg": `Torrent uploaded at ${url}` };
    ctx.response.status = 201;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
    ctx.response.headers.set("Location", url);
  }
});

torrents.post("/t/:id", async function (ctx) {
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

  let tData: any[] = [];

  try {
    tData = await getTorrentJSON(ctx.params.id, "json, uploader");
  } catch {
    throwAPIError(ctx, "Torrent doesn't exist.", 400);
    err = true;
  }

  if (!err) {
    switch (requestJSON.type) {
      // Voting
      case "Like":
	// If user is local: Add 'like' action to outbox, and torrent. Add post URL to user 'liked'.
	// Else: Webfinger to check if user actually exists. If not, send err. If so,
	// add user to `likes`.
        break;
      case "Dislike":
        break;
      // Creating a comment.
      case "Create":
        break;
      // Updating
      case "Update":
        console.log("Update");
        break;
      // Delete/Remove
      case "Delete":
      case "Remove":
        // In AP, servers can choose to not exactly delete the content,
        // but just replace everything with a tombstone.
        // We think that's stupid, so we're not doing it - Plus we can
        // get away with it, as it's not part of the standard.
        // See Section 6.4 of the ActivityPub standard.
        const userRole = userInfo[2];

        function bpDeleteStatement() {
          ctx.response.body = { "msg": `Torrent ${ctx.params.id} deleted` };
          ctx.response.status = 200;
          ctx.response.type = "application/json";
        }

        // Ensure that the user is either the original poster, or has total deletion privs.
        // Also made sure that the user has the proper role to delete.
        if (!userRole.deleteOwnTorrents || !tData[1] == decodedAuth.name) {
          throwAPIError(ctx, "You aren't allowed to delete this torrent", 400);
        } else if (
          !userRole.deleteOthersTorrents && !tData[1] == decodedAuth.name
        ) {
          await deleteTorrent(ctx.params.id);
          bpDeleteStatement();
        } else {
          await deleteTorrent(ctx.params.id);
          bpDeleteStatement();
        }

        break;
      case "Flag":
        break;
      // In case none of the above were met:
      default:
        throwAPIError(ctx, "Invalid activity type", 400);
    }
  }
});
