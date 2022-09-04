// User pages
import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";
import { addToDB, basicObjectUpdate, getUActivity } from "./db.ts";
import { genInvitationReply } from "./activity.ts";
import { getJWTKey } from "./crypto.ts";
import { genUUID, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";
import {
  extractKey,
  genHTTPSigBoilerplate,
  simpleVerify,
  str2ab,
} from "./crypto.ts";

export const users = new Router();

async function basicGETActivity(ctx: Context, id: string, act: string) {
  const res = await getUActivity(id, act);
  ctx.response.body = res;
  if (!("err" in res)) {
    ctx.response.status = 200;
    return ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  }

  ctx.response.status = 404;
  ctx.response.type = "application/json";
}

// GET activities
users.get("/u", async function (ctx) {
  // Get information about logged-in user
  let auth = await ctx.request.headers.get("Authorization");
  if (!auth) {
    return throwAPIError(
      ctx,
      "No Authorization header provided",
      400,
    );
  }

  auth = auth.split(" ")[1];
  auth = await verify(auth, await getJWTKey());

  const res = await getUActivity(auth.name, "info");

  ctx.response.body = res;
  ctx.response.status = 200;
  ctx.response.type =
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
});

users.get("/u/:id", async function (ctx) {
  // Get information about user.
  await basicGETActivity(ctx, ctx.params.id, "info");
});

users.get("/u/:id/outbox", async function (ctx) {
  await basicGETActivity(ctx, ctx.params.id, "outbox");
});

users.get("/u/:id/inbox", async function (ctx) {
  // Get inbox of user.
  // May require more authentication(?)
  // Will have to deal with that shit in the future, though.
  await basicGETActivity(ctx, ctx.params.id, "inbox");
});

users.get("/u/:id/likes", async function (ctx) {
  await basicGETActivity(ctx, ctx.params.id, "likes");
});

users.get("/u/:id/dislikes", async function (ctx) {
  await basicGETActivity(ctx, ctx.params.id, "dislikes");
});

users.get("/u/:id/following", async function (ctx) {
  await basicGETActivity(ctx, ctx.params.id, "following");
});

users.get("/u/:id/followers", async function (ctx) {
  await basicGETActivity(ctx, ctx.params.id, "followers");
});

users.get("/u/:id/main-key", async function (ctx) {
  const res = await getUActivity(ctx.params.id, "keys");

  if (!("err" in res)) {
    ctx.response.body = res[0];
    ctx.response.status = 200;
    ctx.response.type = "text/plain";
  }

  ctx.response.body = res;
  ctx.response.status = 404;
  ctx.response.type = "application/json";
});

users.post("/u/:id/outbox", async function (ctx) {
  const reqSig = await ctx.request.headers.get("Signature");
  const raw = await ctx.request.body();

  if (raw.type !== "json") {
    return throwAPIError(
      ctx,
      "Invalid content type (Must be application/json)",
      400,
    );
  }

  const actor = await getUActivity(ctx.params.id, "info");
  const follows = await getUActivity(ctx.params.id, "followers");
  const req = await raw.value;

  const foreignActorInfo = await (await fetch(req.actor)).json();
  const foreignKey = await extractKey(
    "public",
    foreignActorInfo.publicKey.publicKeyPem,
  );

  const reqURL = new URL(ctx.request.url);
  const settingsURL = new URL(settings.siteURL);

  const msg = genHTTPSigBoilerplate({
    "target": `post ${reqURL.pathname}`,
    "host": settingsURL.host,
    "date": await ctx.request.headers.get("date"),
  });
  const parsedSig = /(.*)=\"(.*)\",?/mg.exec(reqSig)[2];

  const postSignature = str2ab(atob(parsedSig));

  const validSig = await simpleVerify(
    foreignKey,
    msg,
    postSignature,
  );

  if (!validSig) {
    return throwAPIError(ctx, "Invalid HTTP Signature", 400);
  }

  if (req.type === "Follow") {
    if (!req.actor) {
      return throwAPIError(ctx, "'actor' parameter not present", 400);
    }

    if (follows.orderedItems.includes(req.actor)) {
      return throwAPIError(ctx, "Already following actor.", 400);
    }

    follows.orderedItems.push(req.actor);
    follows.totalItems = follows.orderedItems.length;

    await basicObjectUpdate("users", {
      "followers": follows,
    }, ctx.params.id);

    const id: string = await genUUID(19);
    const url = `${settings.siteURL}/x/${id}`;

    const acceptJSON = genInvitationReply({
      "id": url,
      "actor": actor.id,
      "type": "Accept",
      "summary": `${req.actor} following ${ctx.params.id}`,
      "object": req,
    });

    await addToDB(
      "actions",
      {
        "id": id,
        "json": acceptJSON,
        "activity": {},
        "uploader": ctx.params.id,
        "likes": {},
        "dislikes": {},
        "replies": {},
        "flags": {},
      },
    );

    ctx.response.body = acceptJSON;
    ctx.response.status = 201;
    ctx.response.type = "application/activity+json";
  } else if (req.type === "Undo") {
    if (!follows.orderedItems.includes(requestJSON.actor)) {
      return throwAPIError(ctx, "Already not following actor", 400);
    }

    const followsIndex = follows.orderedItems.indexOf(req.actor);

    follows.orderedItems.splice(followsIndex, 1);

    ctx.response.body = {
      "msg": `${req.actor} not following ${ctx.params.id} anymore.`,
    };
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  }
});

users.post("/u/:id/inbox", async function (ctx) {
  const reqSig = await ctx.request.headers.get("Signature");
  const raw = await ctx.request.body();

  if (raw.type !== "json") {
    return throwAPIError(
      ctx,
      "Invalid content type (Must be application/json)",
      400,
    );
  }
  const follows = await getUActivity(ctx.params.id, "followers");
  const inbox = await getUActivity(ctx.params.id, "inbox");
  const req = await raw.value;

  const foreignActorInfo = await (await fetch(req.actor, {
    headers: {
      "Accept": "application/activity+json",
    },
  })).json();
  const foreignKey = await extractKey(
    "public",
    foreignActorInfo.publicKey.publicKeyPem,
  );

  const reqURL = new URL(ctx.request.url);
  const settingsURL = new URL(settings.siteURL);

  const msg = genHTTPSigBoilerplate({
    "target": `post ${reqURL.pathname}`,
    "host": settingsURL.host,
    "date": await ctx.request.headers.get("date"),
  });

  const parsedSig = /(.*)=\"(.*)\",?/mg.exec(reqSig)[2];

  const postSignature = str2ab(atob(parsedSig));

  const validSig = await simpleVerify(
    foreignKey,
    msg,
    postSignature,
  );

  if (!validSig) {
    return throwAPIError(ctx, "Invalid HTTP Signature", 400);
  }

  if (
    req.type === "Create" ||
    req.type === "Update"
  ) {
    if (!follows.orderedItems.includes(req.actor)) {
      return throwAPIError(ctx, "Recipient is not following user", 400);
    }

    inbox.orderedItems.push(req.id);
    inbox.totalItems = inbox.orderedItems.length;

    await basicObjectUpdate("users", {
      "inbox": inbox,
    }, ctx.params.id);
    // Look into what response should be if it's
    // successful.
  } else {
    return throwAPIError(ctx, "Invalid activity type", 400);
  }
});

users.post("/u/:id/", async function (ctx) {
  // If type === 'Update'
  // Update user information.
  // Seperate into json & form-content:
  //   - JSON: name, bio, etc., icon, banner is UInt8Array.
});

// WebFinger support. See https://www.rfc-editor.org/rfc/rfc7033.
users.get("/.well-known/webfinger", function (ctx) {
  const url: URL = ctx.request.url;
  const resource: string | null = url.searchParams.get("resource");
  const rel: string | null = url.searchParams.get("rel");

  // The spec only allows WebFinger over HTTPS.
  if (!ctx.request.secure) {
    ctx.response.status = 403;
    ctx.response.body = "";
    return;
  }

  if (!resource) {
    ctx.response.status = 400;
    ctx.response.body = "";
    return;
  }

  // Match the 'acct:', 'user', and 'domain.tld' parts of resource.
  const match = resource.match(
    /(acct:)?([a-zA-Z0-9\-\._~:\/\?#\[\]@!\$\&'\(\)\*\+,;=]+)@(.*)$/,
  );

  // Not an acct: URI? We don't have any more info about that.
  if (!match) {
    console.log("Not matching: " + resource);
    ctx.response.status = 404;
    ctx.response.body = "";
    return;
  }

  // Finally split here; if we did it inline TS complains about types.
  const [_all, _acct, user, domain] = match;

  // yes, URL throws a TypeError on invalid URL. it sucks
  try {
    new URL("https://" + domain + "/");
  } catch {
    // Malformed URL? have fun with your 400 status because ur getting it
    console.log("Invalid hostname: " + resource);
    ctx.response.status = 400;
    ctx.response.body = "";
    return;
  }

  // Construct the JSON resource descriptor
  const jrd = {
    "subject": resource,
    "links": [
      {
        "rel": "self",
        "type": "application/activity+json",
        "href": `${url.protocol}//${url.host}/u/${user}`,
      },
    ],
  };

  // If there are no matching link relation types defined for
  // the resource, the "links" array in the JRD will be either absent or
  // empty. (RCF 7033 §4.3)
  if (rel) {
    jrd.links = [];
  }

  ctx.response.status = 200;
  ctx.response.type = "application/jrd+json";
  ctx.response.body = JSON.stringify(jrd);
});
