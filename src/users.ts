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

  if (!res.err) {
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

// TODO: Add webfinger bullshit.
