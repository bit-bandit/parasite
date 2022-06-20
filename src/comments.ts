import { Router } from "https://deno.land/x/oak/mod.ts";
import { getCommentJSON, getCommentReplies } from "./db.ts";
import { isValid } from "./auth.ts";

export let comments = new Router();

comments.get("/c/:id", async function (ctx) {
  let res = await getCommentJSON(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "Comment not found.",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
});

comments.get("/c/:id/r", async function (ctx) {
  let res = await getCommentReplies(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "List not found.",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
});

comments.post("/c/:id", async function (ctx) {
  if (!ctx.request.hasBody) {
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
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
    ctx.response.type = "application/json";
  }

  // Enforce comment depth

  const c = await getCommentJSON(requestJSON.inReplyTo);

  const isCommentChild = (x) => /.*\/c\/.*/i.test(x);
  if (isCommentChild(c.inReplyTo)) {
    ctx.response.body = {
      "err": true,
      "msg": "Cannont reply to a reply",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
  }
});
