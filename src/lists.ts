// List stuff.
import { Router } from "https://deno.land/x/oak/mod.ts";

import {
  genOrderedCollection,
  genReply,
  wrapperCreate,
  wrapperUpdate,
} from "./activity.ts";
import {
  extractKey,
  genHTTPSigBoilerplate,
  genKeyPair,
  getJWTKey,
  simpleSign,
  simpleVerify,
  str2ab,
} from "./crypto.ts";
import {
  addToDB,
  basicObjectUpdate,
  deleteList,
  getListJSON,
  getUActivity,
  getUMetaInfo,
} from "./db.ts";
import {
  authData,
  checkInstanceBlocked,
  genUUID,
  properCharRange,
  sendToFollowers,
  throwAPIError,
} from "./utils.ts";
import { settings } from "../settings.ts";

export const lists = new Router();

function boilerplateDeleteStatement(ctx: Context) {
  ctx.response.body = { "msg": `List ${ctx.params.id} deleted` };
  ctx.response.status = 200;
  ctx.response.type = "application/json";
}

function boilerplateListGet(ctx: Context, res) {
  if (!res.err) {
    ctx.response.body = res[0]; // Have to do this because `basicDataQuery` is designed to return arrays.
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    throwAPIError(ctx, "List not found", 404);
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
}

lists.get("/l/:id", async function (ctx) {
  const res = await getListJSON(ctx.params.id);
  await boilerplateListGet(ctx, res);
});

lists.get("/l/:id/r", async function (ctx) {
  const res = await getListJSON(ctx.params.id, "replies");
  await boilerplateListGet(ctx, res);
});

lists.get("/l/:id/activity", async function (ctx) {
  const res = await getListJSON(ctx.params.id, "activity");
  await boilerplateListGet(ctx, res);
});

lists.get("/l/:id/likes", async function (ctx) {
  const res = await getListJSON(ctx.params.id, "likes");
  await boilerplateListGet(ctx, res);
});

lists.get("/l/:id/dislikes", async function (ctx) {
  const res = await getListJSON(ctx.params.id, "dislikes");
  await boilerplateListGet(ctx, res);
});

lists.get("/l/:id/flags", async function (ctx) {
  const res = await getListJSON(ctx.params.id, "flags");
  await boilerplateListGet(ctx, res);
});

lists.post("/l", async function (ctx) {
  const data = await authData(ctx);

  const requestJSON = data.request;

  if (requestJSON.type !== "Create") {
    return throwAPIError(ctx, "Invalid activity type", 400);
  }

  if (!Array.isArray(requestJSON.orderedItems)) {
    return throwAPIError(ctx, "Invalid items.", 400);
  }

  // TODO: Check if magnet link is actually valid.
  // TODO: Make more spec compliant.
  const info = await getUActivity(data.decoded.name, "info");
  const role = await getUActivity(data.decoded.name, "roles");

  if (!role.createLists) {
    return throwAPIError(ctx, "Action not permitted.", 400);
  }
  // TODO: Only allow for `p`, `em`, `strong`, and `a` tags.
  const parsed = marked.parse(requestJSON.summary);

  const id: string = genUUID(12);
  const url = `${settings.siteURL}/l/${id}`;
  // TODO: Tag checking/creation if not exists.
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

  const obj = genOrderedCollection(url, requestJSON.orderedItems, {
    "published": d.toISOString(), // TODO: Set this from locale time to UTC
    "actor": info.id,
    "name": requestJSON.name,
    "summary": parsed,
    "replies": `${url}/r`,
    "tags": tag,
  });
  const activity = wrapperCreate({
    "id": `${url}/activity`,
    "actor": obj.attributedTo,
    "object": obj,
    "to": info.followers,
  });

  await addToDB("lists", {
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

  const followers = await getUActivity(data.decoded.name, "followers");

  let i = 0;

  for (const follower of followers.orderedItems) {
    const u = new URL(follower);

    if (u.origin === settings.siteURL) {
      // Deliver locally, and nothing more.
      const username = u.pathname.split("/").pop();
      // Add to inbox of local user.
      let inbox = await getUActivity(username, "inbox");

      inbox.orderedItems.push(activity.id);
      inbox.totalItems = inbox.orderedItems.length;

      await basicObjectUpdate("users", {
        "inbox": inbox,
      }, username);
    } else {
      // REMINDER:
      // Add HTTP headers, and whatnot.
      // Read below for more details:
      // https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/

      const actorKeys = await getUActivity(data.decoded.name, "keys");
      const priv = await extractKey("private", actorKeys[1]);
      const time = d.toUTCString();

      const msg = genHTTPSigBoilerplate({
        "target": `post ${u.pathname}`,
        "host": u.host,
        "date": time,
      });

      const signed = await simpleSign(msg, priv);

      const b64sig = btoa(
        String.fromCharCode.apply(null, new Uint8Array(signed)),
      );
      const header =
        `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

      const actInfo = await fetch(follower, {
        headers: {
          "Accept": "application/activity+json",
          "Content-Type": "application/activity+json",
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
        },
        body: JSON.stringify(activity),
      });

      r = await r.json();

      if (r.err) {
        i++;
      }
    }
  }

  let errNo = "";

  if (0 < i) {
    errNo = ` with ${i} followers failing to recieve it`; // Keep the space at the start.
  }

  ctx.response.body = { "msg": `List uploaded at ${url}${errNo}` };
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

lists.post("/l/:id", async function (ctx) {
  const raw = await ctx.request.body();
  const requestJSON = await raw.value;

  let json, uploader;
  const d = new Date();

  try {
    [json, uploader] = await getListJSON(ctx.params.id, "json, uploader");
  } catch {
    return throwAPIError(ctx, "List doesn't exist.", 400);
  }

  switch (requestJSON.type) {
    // Voting
    case "Like": {
      // If user is local: Add user to torrent likes. Add post URL to user 'likes'.
      // Else: Webfinger to check if user actually exists. If not, send err. If so,
      // add user to `likes`.

      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const u = new URL(foreignActorInfo.id);
      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      let postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const listLikes = (await getListJSON(ctx.params.id, "likes"))[0];

      if (listLikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      listLikes.orderedItems.push(requestJSON.actor);
      listLikes.totalItems = listLikes.orderedItems.length;

      await basicObjectUpdate("lists", {
        "likes": listLikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `List ${ctx.request.url} added to likes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);

      break;
    }

    case "Dislike": {
      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const u = new URL(foreignActorInfo.id);
      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      let postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const listDislikes = (await getListJSON(ctx.params.id, "dislikes"))[0];

      if (listDislikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      listDislikes.orderedItems.push(requestJSON.actor);
      listDislikes.totalItems = listDislikes.orderedItems.length;

      await basicObjectUpdate("lists", {
        "dislikes": listDislikes,
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
      checkInstanceBlocked(externalActorURL.host);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const u = new URL(foreignActorInfo.id);
      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      let postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }
      const listReplies = (await getListJSON(ctx.params.id, "replies"))[0];

      listReplies.orderedItems.push(requestJSON.object.id);
      listReplies.totalItems = listReplies.orderedItems.length;

      await basicObjectUpdate("lists", {
        "replies": listReplies,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `List ${ctx.params.id} added to dislikes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);
      break;
    }

    // Updating

    case "Update": {
      const data = await authData(ctx);
      const userInfo = await getUMetaInfo(data.decoded.name);
      const userRole = userInfo[2];

      if (
        uploader !== data.decoded.name ||
        !userRole.editUploads
      ) {
        return throwAPIError(ctx, "Not allowed to edit list", 400);
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

      // Everything here may seem extremely boilerplatey, but it's to prevent
      // people from adding bad values to a list.
      if (requestJSON.title) {
        json.name = requestJSON.title;
      }
      if (requestJSON.summary) {
        json.summary = marked.parse(requestJSON.summary);
      }
      if (requestJSON.href) {
        json.orderedItems = requestJSON.orderedItems;
      }

      json.updated = d.toISOString();

      const activity = wrapperUpdate({
        "id": `${json.id}/activity`,
        "actor": json.attributedTo,
        "object": json,
        "published": json.published,
      });

      await basicObjectUpdate("lists", {
        "activity": activity,
        "json": json,
      }, `${ctx.params.id}`);

      ctx.response.body = { "msg": `List ${ctx.params.id} updated` };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }
    // Delete/Remove
    case "Remove":
    case "Delete": {
      const data = await authData(ctx);
      const userInfo = await getUMetaInfo(data.decoded.name);
      const userRole = userInfo[2];

      if (!userRole.deleteOwnLists || uploader !== data.decoded.name) {
        throwAPIError(ctx, "You aren't allowed to delete this list", 400);
      } else if (
        userRole.deleteAnyLists
      ) {
        await deleteList(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      } else {
        await deleteList(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      }
      break;
    }

    case "Flag": {
      const data = await authData(ctx);
      const userInfo = await getUMetaInfo(data.decoded.name);
      const userRole = userInfo[2];

      if (!userInfo[2].flag) {
        return throwAPIError(ctx, "Flagging not allowed", 400);
      }

      const listFlags = (await getListJSON(ctx.params.id, "flags"))[0];

      if (listFlags.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already flagged item", 400);
        break;
      }

      listFlags.orderedItems.push(requestJSON.actor);
      listFlags.totalItems = listFlags.orderedItems.length;

      await basicObjectUpdate("lists", {
        "flags": listFlags,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `List ${ctx.params.id} flagged`,
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
