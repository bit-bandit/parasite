import { Router } from "https://deno.land/x/oak/mod.ts";
import { getListJSON, getListReplies } from "./db.ts";

export let lists = new Router();

lists.get("/l/:id", async function (ctx) {
  let res = await getListJSON(ctx.params.id);

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

lists.get("/l/:id/r", async function (ctx) {
  let res = await getListReplies(ctx.params.id);

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
