// User pages

import { Router } from "https://deno.land/x/oak/mod.ts";
import { getUserInfo } from "./db.ts";

export let users = new Router();

users.get("/u/", async function (ctx) {
  // Get information about logged-in user
});

users.get("/u/:id", async function (ctx) {
  // Get information about user.
  const res = await getUserInfo(ctx.params.id);

  ctx.response.body = res;

  // esoteric syntax because typescript yells at me if i check directly
  if (!("err" in res)) {
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  }

  ctx.response.status = 404;
  ctx.response.type = "application/json";
});

users.get("/u/:id/outbox", async function (ctx) {
  // Get information about user.
});

users.get("/u/:id/inbox", async function (ctx) {
  // Get information about user.
});

users.post("/u/:id/outbox", async function (ctx) {
  // Get information about user.
});

users.post("/u/:id/inbox", async function (ctx) {
  // Get information about user.
});

// WebFinger support. See https://www.rfc-editor.org/rfc/rfc7033.
users.get("/.well-known/webfinger", async function (ctx) {
  const url: URL = ctx.request.url;
  let resource: string | null = url.searchParams.get("resource");
  let rel: string | null = url.searchParams.get("rel");

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
  let match = resource.match(
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
  let [all, acct, user, domain] = match;

  // yes, URL throws a TypeError on invalid URL. it sucks
  try {
    let url: URL = new URL("https://" + domain + "/");
  } catch {
    // Malformed URL? have fun with your 400 status because ur getting it
    console.log("Invalid hostname: " + resource);
    ctx.response.status = 400;
    ctx.response.body = "";
    return;
  }

  // Construct the JSON resource descriptor
  let jrd = {
    "subject": resource,
    "links": [
      {
        "rel": "self",
        "type": "application/activity+json",
        "href": `${url.protocol}//${url.host}/u/${user}`,
      },
    ],
  };

  ctx.response.status = 200;
  ctx.response.type = "application/jrd+json";
  ctx.response.body = JSON.stringify(jrd);
});
