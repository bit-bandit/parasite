// All torrent related functions.

// Notes:
// -  use `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
//    for all AP/AS related responses.
// -  Don't interact with the database directly - Use `db.ts` for that, instead.

import { Router } from "https://deno.land/x/oak/mod.ts";
import { getTorrentJSON, getTorrentReplies } from "./db.ts";

export let torrents = new Router();

torrents.get("/t/:id", async function (ctx) {
  let res = await getTorrentJSON(ctx.params.id);

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
  if (!ctx.request.hasBody) {
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 404;
    ctx.respone.type = "application/json";
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid content type",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
  }

  let requestJSON = await raw.value();

  if (requestJSON.type !== "Create") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid Activity type",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
  }
});

torrents.post("/t/:id", async function (ctx) {
  if (!ctx.request.hasBody) {
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid content type",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
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
      ctx.respone.type = "application/json";
  }
});
