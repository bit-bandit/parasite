// All torrent related functions.
import { Context, Router } from "https://deno.land/x/oak/mod.ts";

import {
  genObj,
  genOrderedCollection,
  wrapperCreate,
  wrapperUpdate,
} from "./activity.ts";
import {
  addToDB,
  basicObjectUpdate,
  deleteTorrent,
  getTorrentJSON,
  getUActivity,
} from "./db.ts";
import {
  extractKey,
  genHTTPSigBoilerplate,
  hashFromString,
  simpleSign,
  simpleVerify,
  str2ab,
} from "./crypto.ts";
import {
  authData,
  checkInstanceBlocked,
  genUUID,
  properCharRange,
  throwAPIError,
} from "./utils.ts";
import { settings } from "../settings.ts";

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

function validMagnet(magnet) {
  return /^magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32,40}&dn=.+&tr=.+$/i.test(
    magnet,
  );
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
torrents.post("/t", async function (ctx) {
  const data = await authData(ctx);

  const requestJSON = data.request;

  if (requestJSON.type !== "Create") {
    return throwAPIError(ctx, "Invalid activity type", 400);
  }

  if (!validMagnet(requestJSON.href)) {
    return throwAPIError(ctx, "Bad magnet link.", 400);
  }

  if (requestJSON.name.length > settings.limits.maxTitleLength) {
    return throwAPIError(ctx, "Title too long.", 400);
  }

  if (requestJSON.content.length > settings.limits.maxContentLength) {
    return throwAPIError(ctx, "Description too long.", 400);
  }

  const info = await getUActivity(data.decoded.name, "info");
  const role = await getUActivity(data.decoded.name, "roles");

  if (!role.createTorrents) {
    return throwAPIError(ctx, "Action not permitted.", 400);
  }

  // TODO: Only allow for `p`, `em`, `strong`, and `a` tags.
  const parsed = marked.parse(requestJSON.content);

  const id: string = genUUID(12);
  const url = `${settings.siteURL}/t/${id}`;

  const tag: string[] = [];

  if (requestJSON.tags) {
    requestJSON.tags.split(",").filter((x) => properCharRange(x)).map(
      function (x) {
        x.toLowerCase();
        x.replace(" ", "_");
        tag.push(`${settings.siteURL}/i/${encodeURIComponent(x)}`);
      },
    );
  }

  const d = new Date();

  const obj = genObj({
    "id": url,
    "type": "Note",
    "published": d.toISOString(),
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
    "to": info.followers,
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

  // Send data to followers

  const followers = await getUActivity(data.decoded.name, "followers");

  let i = 0;

  for (const follower of followers.orderedItems) {
    const u = new URL(follower);

    if (u.origin === settings.siteURL) {
      // Deliver locally, and nothing more.
      const username = u.pathname.split("/").pop();
      // Add to inbox of local user.
      const inbox = await getUActivity(username, "inbox");

      inbox.orderedItems.push(activity.id);
      inbox.totalItems = inbox.orderedItems.length;

      await basicObjectUpdate("users", {
        "inbox": inbox,
      }, username);
    } else {
      const actorKeys = await getUActivity(data.decoded.name, "keys");
      const priv = await extractKey("private", actorKeys[1]);
      const time = d.toUTCString();
      const hashedDigest = await hashFromString(parsed);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${u.pathname}`,
        "host": u.host,
        "date": time,
        "digest": `SHA-256=${hashedDigest}`,
      });

      const signed = await simpleSign(msg, priv);

      const b64sig = btoa(
        String.fromCharCode.apply(null, new Uint8Array(signed)),
      );
      const header =
        `keyId="${userActivity.publicKey.id}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${b64sig}"`;

      try {
        const actInfo = await fetch(follower, {
          headers: {
            "Accept": "application/activity+json",
          },
          method: "GET",
        });
        actInfo = await actInfo.json();

        let r = await fetch(actInfo.inbox, {
          method: "POST",
          headers: {
            "Accept": "application/activity+json",
            "Content-Type": "application/json",
            "Signature": header,
            "Date": time,
            "Host": u.host,
            "Digest": `SHA-256=${hashedDigest}`,
          },
          body: JSON.stringify(activity),
        });

        r = await r.json();

        if (r.err) {
          i++;
        }
      } catch {
        continue;
      }
    }
  }

  let errNo = "";

  if (0 < i) {
    errNo = ` with ${i} followers failing to recieve it`; // Keep the space at the start.
  }

  ctx.response.body = { "msg": `Torrent uploaded at ${url}${errNo}` };
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

torrents.post("/t/:id", async function (ctx) {
  const raw = await ctx.request.body();
  const requestJSON = await raw.value;

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
      const foreignActorInfo = await (await fetch(requestJSON.actor, {
        headers: { "Accept": "application/activity+json" },
      })).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const externalActorURL = new URL(requestJSON.actor);

      await checkInstanceBlocked(externalActorURL.host, ctx);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${new URL(requestJSON.object).pathname}`,
        "host": externalActorURL.host,
        "date": await ctx.request.headers.get("date"),
        "digest": await ctx.request.headers.get("digest"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const torrentLikes = (await getTorrentJSON(ctx.params.id, "likes"))[0];

      if (torrentLikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      torrentLikes.orderedItems.push(requestJSON.actor);
      torrentLikes.totalItems = torrentLikes.orderedItems.length;

      await basicObjectUpdate("torrents", {
        "likes": torrentLikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} added to likes collection`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);

      break;
    }

    case "Dislike": {
      const foreignActorInfo = await (await fetch(requestJSON.actor, {
        headers: { "Accept": "application/activity+json" },
      })).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const externalActorURL = new URL(requestJSON.actor);

      await checkInstanceBlocked(externalActorURL.host, ctx);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${new URL(requestJSON.object).pathname}`,
        "host": externalActorURL.host,
        "date": await ctx.request.headers.get("date"),
        "digest": await ctx.request.headers.get("digest"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const torrentDislikes =
        (await getTorrentJSON(ctx.params.id, "dislikes"))[0];

      if (torrentDislikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      torrentDislikes.orderedItems.push(requestJSON.actor);
      torrentDislikes.totalItems = torrentDislikes.orderedItems.length;

      await basicObjectUpdate("torrents", {
        "dislikes": torrentDislikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} added to Dislikes collection`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);
      break;
    }
    // Adding a comment.
    case "Create": {
      const externalActorURL = new URL(requestJSON.actor);
      await checkInstanceBlocked(externalActorURL.host, ctx);

      const foreignActorInfo = await (await fetch(requestJSON.actor, {
        headers: { "Accept": "application/activity+json" },
      })).json();

      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const msg = genHTTPSigBoilerplate({
        "target": `post ${new URL(requestJSON.object.inReplyTo).pathname}`,
        "host": externalActorURL.host,
        "date": await ctx.request.headers.get("date"),
        "digest": await ctx.request.headers.get("digest"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const torrentReplies = await getTorrentJSON(ctx.params.id, "replies");
      torrentReplies[0].orderedItems.push(requestJSON.object.id);
      torrentReplies[0].totalItems = torrentReplies[0].orderedItems.length;

      await basicObjectUpdate("torrents", {
        "replies": torrentReplies[0],
      }, ctx.params.id);

      ctx.response.body = {
        "msg":
          `Comment ${requestJSON.object.id} added to Torrent ${ctx.params.id}`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);
      break;
    }
    // Updating
    case "Update": {
      const data = await authData(ctx);
      const userInfo = [
        await getUActivity(data.decoded.name, "id"),
        await getUActivity(data.decoded.name, "logins"),
        await getUActivity(data.decoded.name, "roles"),
      ];

      const userRole = userInfo[2];

      if (
        uploader !== data.decoded.name ||
        !userRole.editUploads
      ) {
        return throwAPIError(ctx, "Not allowed to edit torrent", 400);
      }

      if (requestJSON.href && !validMagnet(requestJSON.href)) {
        return throwAPIError(ctx, "Bad magnet link.", 400);
      }

      const tag: string[] = [];

      if (requestJSON.tags) {
        requestJSON.tags.split(",").filter((x) => properCharRange(x)).map(
          function (x) {
            x.toLowerCase();
            x.replace(" ", "_");
            tag.push(`${settings.siteURL}/i/${encodeURIComponent(x)}`);
          },
        );
        json.tag = tag;
      }

      if (
        requestJSON.name &&
        requestJSON.name.length <= settings.limits.maxTitleLength
      ) {
        json.name = requestJSON.name;
      }
      if (
        requestJSON.content &&
        requestJSON.content <= settings.limits.maxContentLength
      ) {
        json.content = marked.parse(requestJSON.content);
      }
      if (requestJSON.href && validMagnet(requestJSON.href)) {
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
      const data = await authData(ctx);
      const userInfo = [
        await getUActivity(data.decoded.name, "id"),
        await getUActivity(data.decoded.name, "logins"),
        await getUActivity(data.decoded.name, "roles"),
      ];
      const userRole = userInfo[2];
      // Ensure that the user is either the original poster, or has total deletion privs.
      // Also made sure that the user has the proper role to delete.
      if (!userRole.deleteOwnTorrents || uploader !== data.decoded.name) {
        throwAPIError(ctx, "You aren't allowed to delete this torrent", 400);
      } else if (
        userRole.deleteAnyTorrents
      ) {
        await deleteTorrent(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      } else {
        await deleteTorrent(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      }
      break;
    }
    case "Undo": {
      const foreignActorInfo = await (await fetch(requestJSON.actor, {
        headers: { "Accept": "application/activity+json" },
      })).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const externalActorURL = new URL(requestJSON.actor);

      await checkInstanceBlocked(externalActorURL.host, ctx);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${new URL(requestJSON.object).pathname}`,
        "host": externalActorURL.host,
        "date": await ctx.request.headers.get("date"),
        "digest": await ctx.request.headers.get("digest"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const torrentLikes = (await getTorrentJSON(ctx.params.id, "likes"))[0];
      const torrentDislikes =
        (await getTorrentJSON(ctx.params.id, "dislikes"))[0];

      if (
        !torrentLikes.orderedItems.includes(requestJSON.actor) &&
        !torrentDislikes.orderedItems.includes(requestJSON.actor)
      ) {
        throwAPIError(ctx, "No activity on item found", 400);
        break;
      }

      const likesIndex = torrentLikes.orderedItems.indexOf(requestJSON.actor);
      const dislikesIndex = torrentDislikes.orderedItems.indexOf(
        requestJSON.actor,
      );

      if (likesIndex !== -1) {
        torrentLikes.orderedItems.splice(likesIndex, 1);
        torrentLikes.totalItems = torrentLikes.orderedItems.length;

        await basicObjectUpdate("torrents", {
          "likes": torrentLikes,
        }, ctx.params.id);
      }

      if (dislikesIndex !== -1) {
        torrentDislikes.orderedItems.splice(dislikesIndex, 1);
        torrentDislikes.totalItems = torrentDislikes.orderedItems.length;

        await basicObjectUpdate("torrents", {
          "dislikes": torrentDislikes,
        }, ctx.params.id);
      }

      ctx.response.body = {
        "msg":
          `Actions by ${requestJSON.actor} on Torrent ${ctx.params.id} undone`,
      };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }

    case "Flag": {
      const data = await authData(ctx);
      const userInfo = [
        await getUActivity(data.decoded.name, "id"),
        await getUActivity(data.decoded.name, "logins"),
        await getUActivity(data.decoded.name, "roles"),
      ];
      const userActivity = await getUActivity(data.decoded.name, "info");

      if (!userInfo[2].flag) {
        return throwAPIError(ctx, "Flagging not allowed", 400);
      }

      const torrentFlags = (await getTorrentJSON(ctx.params.id, "flags"))[0];

      if (torrentFlags.orderedItems.includes(userActivity.id)) {
        return throwAPIError(ctx, "Already flagged item", 400);
      }

      torrentFlags.orderedItems.push(userActivity.id);
      torrentFlags.totalItems = torrentFlags.orderedItems.length;

      await basicObjectUpdate("torrents", {
        "flags": torrentFlags,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Torrent ${ctx.params.id} flagged`,
      };

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
