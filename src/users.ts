// User pages

import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { getUActivity } from "./db.ts";

export const users = new Router();

async function basicGETActivity(ctx: Context, id: string, act: string) {
  const res = await getUActivity(id, act);
  ctx.response.body = res;
  if (!("err" in res)) {
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  }

  ctx.response.status = 404;
  ctx.response.type = "application/json";
}

// GET activities
users.get("/u/", async function (ctx) {
  // Get information about logged-in user
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

// POST activities.
users.post("/u/:id/outbox", async function (ctx) {
  // Send message, basically. Side effect of `POST /t/`
});

users.post("/u/:id/inbox", async function (ctx) {
  // Follows of an account get message upon recieving this.
  // Check inbox content, make sure no dupes exist
  // Maybe add max inbox length?
  // If everything is good, add link to inbox.

  const raw = await ctx.request.body();
  if (raw.type !== "json") {
    return throwAPIError(
      ctx,
      "Invalid content type (Must be application/json)",
      400,
    );
  }
  const req = await raw.value();

  const inbox = await getUActivity(ctx.params.id, "inbox");
  const follows = await getUActivity(ctx.params.id, "following");

  // Message should be the URL to an Activity object

  if (!follows.orderedItems.includes(req.actor)) {
    return throwAPIError(ctx, "Recipient is not following user", 400);
  }

  inbox.orderedItems.push(req.id);

  // Update inbox
});

users.post("/u/:id/", async function (ctx) {
  // Update user information.
  // Seperate into json & form-content:
  //   - JSON: name, bio, etc.
  //   - form-content: avatar/pfp.
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
