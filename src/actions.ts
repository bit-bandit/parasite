import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";

import {
  addToDB,
  basicObjectUpdate,
  getActionJSON,
  getUActivity,
} from "./db.ts";
import {
  genInvitationReply,
  genOrderedCollection,
  genReply,
  genVote,
  wrapperCreate,
} from "./activity.ts";
import {
  extractKey,
  genHTTPSigBoilerplate,
  genKeyPair,
  getJWTKey,
  simpleSign,
  simpleVerify,
} from "./crypto.ts";
import { authData, genUUID, sendToFollowers, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";

export const actions = new Router();

/*
Design Notes:
- Check role abilities before request gets sent out.
*/

actions.get("/x/:id", async function (ctx) {
  const res = await getActionJSON(ctx.params.id);
  ctx.response.body = res[0];
  if (!("err" in res)) {
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  }

  ctx.response.status = 404;
  ctx.response.type = "application/json";
});

// POST here to send follow request to Actor.
actions.post("/x/follow", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = await data.request;

  if (!requestJSON.object) {
    return throwAPIError(
      ctx,
      "'object' field must be present and contain a URL",
      400,
    );
  }

  const userActivity = await getUActivity(data.decoded.name, "info");

  const followID = await genUUID(14);
  const followURL = `${settings.siteURL}/x/${followID}`;

  const followJSON = genInvitationReply({
    "id": followURL,
    "actor": userActivity.id,
    "type": "Follow",
    "summary": `${userActivity.id} asks to follow ${requestJSON.object}`,
    "object": requestJSON.object,
  });

  await addToDB(
    "actions",
    {
      "id": followID,
      "json": followJSON,
      "activity": {},
      "uploader": data.decoded.name,
      "likes": {},
      "dislikes": {},
      "replies": {},
      "flags": {},
    },
  );

  const actorKeys = await getUActivity(data.decoded.name, "keys");
  const priv = await extractKey("private", actorKeys[1]);

  const fActor = await (await fetch(requestJSON.object)).json();
  const inboxURL = new URL(fActor.inbox);
  const d = new Date();
  const time = d.toUTCString();

  const msg = genHTTPSigBoilerplate({
    "target": `post ${inboxURL.pathname}`,
    "host": inboxURL.host,
    "date": time,
  });
    
  const signed = await simpleSign(msg, priv);

  const b64sig = btoa(String.fromCharCode.apply(null, new Uint8Array(signed)));
  const header =
    `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

  // We should really specify the `Accept` header because:
  // 1) It's in the standard
  // 2) Reverse proxies exist
  const followAttempt = await fetch(fActor.inbox, {
    method: "POST",
    headers: {
      "Accept": "application/activity+json",
      "Content-Type": "application/json",
      "Signature": header,
      "Date": time,
      "Host": inboxURL.host,
    },
    body: JSON.stringify(followJSON),
  });

  const res = await followAttempt.json();

  if (res.type === "Accept") {
    let userFollowers = await getUActivity(data.decoded.name, "following");

    userFollowers.orderedItems.push(requestJSON.object);
    userFollowers.totalItems = userFollowers.orderedItems.length;

    ctx.response.body = res;

    await basicObjectUpdate("users", {
      "following": userFollowers,
    }, data.decoded.name);
  } else {
    ctx.response.body = res;
    ctx.response.status = 400;
    ctx.response.type = "application/json";
  }
});

// Send 'Undo' object type.
actions.post("/x/undo", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = await data.request;

  if (!requestJSON.object) {
    return throwAPIError(
      ctx,
      "'object' field must be present and contain a URL",
      400,
    );
  }

  const userActivity = await getUActivity(data.decoded.name, "info");

  const userLikes = await getUActivity(data.decoded.name, "likes");
  const userDislikes = await getUActivity(data.decoded.name, "dislikes");

  if (
    !userLikes.orderedItems.includes(requestJSON.object) &&
    !userDislikes.orderedItems.includes(requestJSON.object)
  ) {
    return throwAPIError(ctx, "No user activity on object found.", 400);
  }

  const likesIndex = userLikes.orderedItems.indexOf(requestJSON.object);
  const dislikesIndex = userDislikes.orderedItems.indexOf(requestJSON.object);

  const id: string = await genUUID(14);
  const url = `${settings.siteURL}/x/${id}`;

  let obj = await genVote({
    "type": "Undo",
    "actor": userActivity.id,
    "object": requestJSON.object,
    "to": [userActivity.followers],
  });

  await addToDB(
    "actions",
    {
      "id": id,
      "json": obj,
      "activity": {},
      "uploader": data.decoded.name,
      "likes": {},
      "dislikes": {},
      "replies": {},
      "flags": {},
    },
  );

  if (likesIndex !== -1) {
    userLikes.orderedItems.splice(likesIndex, 1);
  }

  if (dislikesIndex !== -1) {
    userDislikes.orderedItems.splice(dislikesIndex, 1);
  }

  // Send to object

  const d = new Date();

  const u = new URL(requestJSON.object);
  const time = d.toUTCString();
  // Send to object in question
  const msg = genHTTPSigBoilerplate({
    "target": `post ${u.pathname}`,
    "host": u.host,
    "date": time,
  });

  const actorKeys = await getUActivity(data.decoded.name, "keys");
  const priv = await extractKey("private", actorKeys[1]);

  const signed = await simpleSign(msg, priv);

  const b64sig = btoa(String.fromCharCode.apply(null, new Uint8Array(signed)));
  const header =
    `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

  const sendToObject = await fetch(requestJSON.object, {
    method: "POST",
    headers: {
      "Accept": "application/activity+json",
      "Content-Type": "application/json",
      "Signature": header,
      "Date": time,
      "Host": u.host,
      "Authorization": await ctx.request.headers.get("Authorization"),
    },
    body: JSON.stringify(obj),
  });

  const res = await sendToObject.json();

  if (res.err) {
    return throwAPIError(ctx, res.msg, 400);
  }

  if (likesIndex !== -1) {
    await basicObjectUpdate("users", {
      "likes": userLikes,
    }, data.decoded.name);
  }

  if (dislikesIndex !== -1) {
    await basicObjectUpdate("users", {
      "dislikes": userDislikes,
    }, data.decoded.name);
  }

  ctx.response.body = res;
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

actions.post("/x/like", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = await data.request;

  if (!requestJSON.object) {
    return throwAPIError(
      ctx,
      "'object' field must be present and contain a URL",
      400,
    );
  }

  const userActivity = await getUActivity(data.decoded.name, "info");
  const userLikes = await getUActivity(data.decoded.name, "likes");

  if (userLikes.orderedItems.includes(requestJSON.object)) {
    return throwAPIError(ctx, "Already voted on item.", 400);
  }

  const id: string = await genUUID(14);
  const url = `${settings.siteURL}/x/${id}`;

  let obj = await genVote({
    "type": "Like",
    "actor": userActivity.id,
    "object": requestJSON.object,
    "to": [userActivity.followers],
  });

  await addToDB(
    "actions",
    {
      "id": id,
      "json": obj,
      "activity": {},
      "uploader": data.decoded.name,
      "likes": {},
      "dislikes": {},
      "replies": {},
      "flags": {},
    },
  );

  userLikes.orderedItems.push(requestJSON.object);
  userLikes.totalItems = userLikes.orderedItems.length;
  // Send to object

  const d = new Date();

  const u = new URL(requestJSON.object);
  const time = d.toUTCString();
  // Send to object in question
  const msg = genHTTPSigBoilerplate({
    "target": `post ${u.pathname}`,
    "host": u.host,
    "date": time,
  });

  const actorKeys = await getUActivity(data.decoded.name, "keys");
  const priv = await extractKey("private", actorKeys[1]);

  const signed = await simpleSign(msg, priv);

  const b64sig = btoa(String.fromCharCode.apply(null, new Uint8Array(signed)));
  const header =
    `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

  // We should really specify the `Accept` header because:
  // 1) It's in the standard
  // 2) Reverse proxies exist

  const sendToObject = await fetch(requestJSON.object, {
    method: "POST",
    headers: {
      "Accept": "application/activity+json",
      "Content-Type": "application/json",
      "Signature": header,
      "Date": time,
      "Host": u.host,
      "Authorization": await ctx.request.headers.get("Authorization"),
    },
    body: JSON.stringify(obj),
  });

  const res = await sendToObject.json();

  if (res.err) {
    return throwAPIError(ctx, res.msg, 400);
  }

  await basicObjectUpdate("users", {
    "likes": userLikes,
  }, data.decoded.name);

  ctx.response.body = res;
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

actions.post("/x/dislike", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = await data.request;

  if (!requestJSON.object) {
    return throwAPIError(
      ctx,
      "'object' field must be present and contain a URL",
      400,
    );
  }

  const userActivity = await getUActivity(data.decoded.name, "info");
  const userDislikes = await getUActivity(data.decoded.name, "dislikes");

  if (userDislikes.orderedItems.includes(requestJSON.object)) {
    return throwAPIError(ctx, "Already voted on item.", 400);
  }

  const id: string = await genUUID(14);
  const url = `${settings.siteURL}/x/${id}`;

  let obj = await genVote({
    "type": "Dislike",
    "actor": userActivity.id,
    "object": requestJSON.object,
    "to": [userActivity.followers],
  });

  await addToDB(
    "actions",
    {
      "id": id,
      "json": obj,
      "activity": {},
      "uploader": data.decoded.name,
      "likes": {},
      "dislikes": {},
      "replies": {},
      "flags": {},
    },
  );

  userDislikes.orderedItems.push(requestJSON.object);
  userDislikes.totalItems = userDislikes.orderedItems.length;
  // Send to object

  const d = new Date();

  const u = new URL(requestJSON.object);
  const time = d.toUTCString();
  // Send to object in question
  const msg = genHTTPSigBoilerplate({
    "target": `post ${u.pathname}`,
    "host": u.host,
    "date": time,
  });

  const actorKeys = await getUActivity(data.decoded.name, "keys");
  const priv = await extractKey("private", actorKeys[1]);

  const signed = await simpleSign(msg, priv);

  const b64sig = btoa(String.fromCharCode.apply(null, new Uint8Array(signed)));
  const header =
    `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

  // We should really specify the `Accept` header because:
  // 1) It's in the standard
  // 2) Reverse proxies exist

  const sendToObject = await fetch(requestJSON.object, {
    method: "POST",
    headers: {
      "Accept": "application/activity+json",
      "Content-Type": "application/json",
      "Signature": header,
      "Date": time,
      "Host": u.host,
      "Authorization": await ctx.request.headers.get("Authorization"),
    },
    body: JSON.stringify(obj),
  });

  const res = await sendToObject.json();

  if (res.err) {
    return throwAPIError(ctx, res.msg, 400);
  }

  await basicObjectUpdate("users", {
    "dislikes": userDislikes,
  }, data.decoded.name);

  ctx.response.body = res;
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});

// Send a comment.
actions.post("/x/comment", async function (ctx) {
  const data = await authData(ctx);
  const requestJSON = await data.request;

  if (!requestJSON.inReplyTo) {
    return throwAPIError(
      ctx,
      "'object' field must be present and contain a URL",
      400,
    );
  }

  const userActivity = await getUActivity(data.decoded.name, "info");
  const id: string = await genUUID(14);
  const url = `${settings.siteURL}/c/${id}`;
  const d = new Date();

  const comment = genReply({
    "id": url,
    "actor": userActivity.id,
    "published": d.toISOString(),
    "content": marked.parse(requestJSON.content),
    "inReplyTo": requestJSON.inReplyTo,
  });

  const activity = wrapperCreate({
    "id": `${url}/activity`,
    "actor": comment.attributedTo,
    "object": comment,
    "to": userActivity.followers,
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

  // Send to followers
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

      const msgToFollowers = genHTTPSigBoilerplate({
        "target": `post ${u.pathname}`,
        "host": u.host,
        "date": time,
      });

      const signedFollowers = await simpleSign(msgToFollowers, priv);

      const b64sigFollowers = btoa(
        String.fromCharCode.apply(null, new Uint8Array(signedFollowers)),
      );
      const header =
        `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sigFollowers}"`;

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
  const u = new URL(requestJSON.inReplyTo);
  const time = d.toUTCString();
  // Send to object in question
  const msg = genHTTPSigBoilerplate({
    "target": `post ${u.pathname}`,
    "host": u.host,
    "date": time,
  });

  const actorKeys = await getUActivity(data.decoded.name, "keys");
  const priv = await extractKey("private", actorKeys[1]);

  const signed = await simpleSign(msg, priv);

  const b64sig = btoa(String.fromCharCode.apply(null, new Uint8Array(signed)));
  const header =
    `keyId="${userActivity.publicKey.id}",headers="(request-target) host date",signature="${b64sig}"`;

  // We should really specify the `Accept` header because:
  // 1) It's in the standard
  // 2) Reverse proxies exist

  const sendToObject = await fetch(requestJSON.inReplyTo, {
    method: "POST",
    headers: {
      "Accept": "application/activity+json",
      "Content-Type": "application/json",
      "Signature": header,
      "Date": time,
      "Host": u.host,
      "Authorization": await ctx.request.headers.get("Authorization"),
    },
    body: JSON.stringify(activity),
  });

  const res = await sendToObject.json();

  ctx.response.body = {
    "msg": `Comment ${id} added to Torrent ${requestJSON.inReplyTo}`,
  };
  ctx.response.status = 201;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  ctx.response.headers.set("Location", url);
});
