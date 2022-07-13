import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { basicObjectUpdate, getActionJSON, getUActivity } from "./db.ts";
import { genInvitationReply } from "./activity.ts";
import { extractKey, genKeyPair, simpleSign, simpleVerify } from "./crypto.ts";
import { authData, genUUID, sendToFollowers, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";

export const actions = new Router();

actions.get("/x/:id", async function (ctx) {
  const res = await getActionJSON(id);
  ctx.response.body = res;
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
  const requestJSON = data.request;

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
      "id": id,
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

  const fActor = (await fetch(requestJSON.object)).json();

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
});

// Send 'Undo' object type.
actions.post("/x/unfollow", async function (ctx) {
});
