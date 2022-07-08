// All torrent related functions.

// Notes:
// -  use `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
//    for all AP/AS related responses.
// -  Don't interact with the database directly - Use `db.ts` for that, instead.

// TODO:
//   - Add GET routes for all torrent columns.

import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import {
  genObj,
  genOrderedCollection,
  genReply,
  wrapperCreate,
  wrapperUpdate,
} from "./activity.ts";
import {
  addToDB,
  basicObjectUpdate,
  deleteTorrent,
  getTorrentJSON,
  getUActivity,
  getUMetaInfo,
} from "./db.ts";
import { authData, genUUID, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts";
import "https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js";

await ammonia.init();
export const torrents = new Router();

// Helper functions
function boilerplateDeleteStatement(ctx: Context) {
  ctx.response.body = { "msg": `Torrent ${ctx.params.id} deleted` };
  ctx.response.status = 200;
  ctx.response.type = "application/json";
}

function boilerplateTorrentGet(ctx: Context, res) {
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

function invalidMagnet(magnet) {
  return /magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/i.test(magnet);
}

// Routes
torrents.get("/t/:id", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id);
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/r", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "replies");
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/activity", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "activity");
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/likes", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "likes");
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/dislikes", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "dislikes");
  await boilerplateTorrentGet(ctx, res);
});

torrents.get("/t/:id/flags", async function (ctx) {
  const res = await getTorrentJSON(ctx.params.id, "flags");
  await boilerplateTorrentGet(ctx, res);
});

// Posting
torrents.post("/t/", async function (ctx) {
  const data = await authData(ctx);

  const requestJSON = data.request;

  if (requestJSON.type !== "Create") {
    return throwAPIError(ctx, "Invalid activity type", 400);
  }

  if (invalidMagnet(requestJSON)) {
    return throwAPIError(ctx, "Bad magnet link.", 400);
  }

  // TODO: Check if magnet link is actually valid.
  // TODO: Make more spec compliant.
  const info = await getUActivity(data.decoded.name, "info");
  // TODO: Only allow for `p`, `em`, `strong`, and `a` tags.
  const parsed = marked.parse(requestJSON.content);

  const id: string = genUUID(12);
  const url = `${settings.siteURL}/t/${id}`;
  // TODO: Tag checking/creation if not exists.
  const tag: string[] = [];
  if (requestJSON.tags) {
    requestJSON.tags.split(",").map((x) =>
      tag.push(`${settings.siteURL}/tags/${x}`)
    );
  }

  const d = new Date();

  const obj = genObj({
    "id": url,
    "type": "Note",
    "published": d.toISOString, // TODO: Set this from locale time to UTC
    "actor": info.id,
    "name": requestJSON.name,
    "content": parsed,
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
    "uploader": data.decoded.name,
    "likes": genOrderedCollection(`${url}/likes`),
    "dislikes": genOrderedCollection(`${url}/dislikes`),
    "replies": genOrderedCollection(`${url}/r`),
    "flags": genOrderedCollection(`${url}/flags`),
  });

  const userOutbox = await getUActivity(data.decoded.name, "outbox");
  userOutbox.orderedItems.push(activity);
  userOutbox.totalItems = userOutbox.orderedItems.length;

  await basicObjectUpdate("users", {
    "outbox": userOutbox,
  }, data.decoded.name);

  ctx.response.body = { "msg": `Torrent uploaded at ${url}` };
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

torrents.post("/t/:id", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = data.request;

  const userInfo = await getUMetaInfo(data.decoded.name);

  const userActivity = await getUActivity(data.decoded.name, "info");

  const userRole = userInfo[2];

  let json, uploader;
  const d = new Date();

  try {
    [json, uploader] = await getTorrentJSON(ctx.params.id, "json, uploader");
  } catch {
    return throwAPIError(ctx, "Torrent doesn't exist.", 400);
  }

  switch (requestJSON.type) {
    // Voting
    case "Like": {
      // If user is local: Add user to torrent likes. Add post URL to user 'likes'.
      // Else: Webfinger to check if user actually exists. If not, send err. If so,
      // add user to `likes`.
      if (!userRole.vote) {
        return throwAPIError(ctx, "Voting not allowed", 400);
      }
      const userLikes = await getUActivity(data.decoded.name, "likes");
      const torrentLikes = (await getTorrentJSON(ctx.params.id, "likes"))[0];

      if (userLikes.orderedItems.includes(json.id)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }
      userLikes.orderedItems.push(json.id);
      userLikes.totalItems = userLikes.orderedItems.length;

      torrentLikes.orderedItems.push(userActivity.id);
      torrentLikes.totalItems = torrentLikes.orderedItems.length;

      await basicObjectUpdate("users", {
        "likes": userLikes,
      }, data.decoded.name);

      await basicObjectUpdate("torrents", {
        "likes": torrentLikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} added to likes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", userActivity.liked);

      break;
    }

    case "Dislike": {
      // Same as above, but with dislikes instead of likes.
      if (!userRole.vote) {
        return throwAPIError(ctx, "Voting not allowed", 400);
      }
      const userDislikes = await getUActivity(data.decoded.name, "dislikes");
      const torrentDislikes =
        (await getTorrentJSON(ctx.params.id, "dislikes"))[0];

      if (userDislikes.orderedItems.includes(json.id)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }
      userDislikes.orderedItems.push(json.id);
      userDislikes.totalItems = userDislikes.orderedItems.length;

      torrentDislikes.orderedItems.push(userActivity.id);
      torrentDislikes.totalItems = torrentDislikes.orderedItems.length;

      await basicObjectUpdate("users", {
        "dislikes": userDislikes,
      }, data.decoded.name);

      await basicObjectUpdate("torrents", {
        "dislikes": torrentDislikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} added to dislikes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", userActivity.liked);
      break;
    }
    // Creating a comment.
    case "Create": {
      const id: string = await genUUID(14);
      const url = `${settings.siteURL}/c/${id}`;

      const comment = genReply({
        "id": url,
        "actor": userActivity.id,
        "published": d.toISOString(),
        "content": marked.parse(requestJSON.content),
        "inReplyTo": json.id,
      });

      const activity = wrapperCreate({
        "id": `${url}/activity`,
        "actor": comment.attributedTo,
        "object": comment,
      });

      await addToDB("comments", {
        "id": id,
        "json": comment,
        "activity": activity,
        "uploader": data.decoded.name,
        "likes": genOrderedCollection(`${url}/likes`),
        "dislikes": genOrderedCollection(`${url}/dislikes`),
        "replies": genOrderedCollection(`${url}/r`),
        "flags": genOrderedCollection(`${url}/flags`),
      });

      const userOutbox = await getUActivity(data.decoded.name, "outbox");

      userOutbox.orderedItems.push(activity);
      userOutbox.totalItems = userOutbox.orderedItems.length;

      await basicObjectUpdate("users", {
        "outbox": userOutbox,
      }, data.decoded.name);

     let torrentReplies = await getTorrentJSON(ctx.params.id, "replies");
	torrentReplies[0].orderedItems.push(url);	
	torrentReplies[0].totalItems = torrentReplies[0].orderedItems.length;
      await basicObjectUpdate("torrents", {
        "replies": torrentReplies[0],
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Comment ${id} added to Torrent ${ctx.params.id}`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", url);
      break;
    }
    // Updating
    case "Update": {
      if (
        uploader !== data.decoded.name ||
        !userRole.editUploads
      ) {
        return throwAPIError(ctx, "Not allowed to edit torrent", 400);
      } else if (invalidMagnet(requestJSON)) {
        return throwAPIError(ctx, "Bad magnet link.", 400);
      }
      const tag: string[] = [];

      if (requestJSON.tags) {
        requestJSON.tags.split(",").map((x) =>
          tag.push(`${settings.siteURL}/tags/${x}`)
        );
        json.tag = tag;
      }

      // Everything here may seem extremely boilerplatey, but it's to prevent
      // people from adding bad values to a torrent.
      if (requestJSON.title) {
        json.name = requestJSON.title;
      }
      if (requestJSON.content) {
        json.content = marked.parse(requestJSON.content);
      }
      if (requestJSON.href) {
        json.href = requestJSON.href;
      }

      json.updated = d.toISOString();

      const activity = wrapperUpdate({
        "id": `${json.id}/activity`,
        "actor": json.attributedTo,
        "object": json,
        "published": json.published,
      });

      await basicObjectUpdate("torrents", {
        "activity": activity,
        "json": json,
      }, `${ctx.params.id}`);

      ctx.response.body = { "msg": `Torrent ${ctx.params.id} updated` };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }
    // Delete/Remove
    case "Remove":
    case "Delete": {
      // In AP, servers can choose to not exactly delete the content,
      // but just replace everything with a tombstone.
      // We think that's stupid, so we're not doing it - Plus we can
      // get away with it, as it's not part of the standard.
      // See Section 6.4 of the ActivityPub standard.

      // Ensure that the user is either the original poster, or has total deletion privs.
      // Also made sure that the user has the proper role to delete.
      if (!userRole.deleteOwnTorrents || uploader !== data.decoded.name) {
        throwAPIError(ctx, "You aren't allowed to delete this torrent", 400);
      } else if (
        userRole.deleteOthersTorrents
      ) {
        await deleteTorrent(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      } else {
        await deleteTorrent(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      }
      break;
    }

    case "Flag": {
      if (!userInfo[2].flag) {
        return throwAPIError(ctx, "Flagging not allowed", 400);
      }

      const torrentFlags = (await getTorrentJSON(ctx.params.id, "flags"))[0];

      if (torrentFlags.orderedItems.includes(userActivity.id)) {
        throwAPIError(ctx, "Already flagged item", 400);
        break;
      }

      torrentFlags.orderedItems.push(userActivity.id);
      torrentFlags.totalItems = torrentFlags.orderedItems.length;

      await basicObjectUpdate("torrents", {
        "flags": torrentFlags,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} flagged`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      break;
    }
    // In case none of the above were met:
    default: {
      throwAPIError(ctx, "Invalid activity type", 400);
    }
  }
});
