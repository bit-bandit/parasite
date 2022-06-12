import { Router } from "https://deno.land/x/oak/mod.ts";
import { getCommentJSON, getCommentReplies } from "./db.ts";

export let comments = new Router();

comments.get("/c/:id", async function (ctx) {
  let res = await getCommentJSON(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.respone.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "Comment not found.",
    };
    ctx.response.status = 404;
    ctx.respone.type = "application/json";
  }
});

comments.get("/c/:id/r", async function (ctx) {
  let res = await getCommentReplies(ctx.params.id);

  if (!res.err) {
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.respone.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    ctx.response.body = {
      "err": true,
      "msg": "List not found.",
    };
    ctx.response.status = 404;
    ctx.respone.type = "application/json";
  }
});
