import { Router } from "https://deno.land/x/oak/mod.ts";
import { search } from "./db.ts";

export const search = new Router();

search.get("/s", async function (ctx) {
  const res = await search(ctx.request.url);
  if (!res.err) {
    // TODO: Implement search queries.
    // See issue #5.

    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  } else {
    ctx.response.body = res;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
});
