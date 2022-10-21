import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { search } from "./db.ts";
import { properCharRange, throwAPIError } from "./utils.ts";

export const tags = new Router();

tags.get("/i/:tag", async function (ctx: Context) {
  if (!properCharRange(ctx.params.tag)) {
    return throwAPIError(ctx, "Invalid characters in tag name.", 400);
  }
  const u = new URLSearchParams();
  u.append("i", ctx.params.tag);
  // Dumb placeholder
  let res = await search(new URL(`https://www.example.com/s?${u.toString()}`));

  res = res.map((x) => x = x.id);

  ctx.response.body = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": ctx.request.url,
    "type": "OrderedCollection",
    "totalItems": res.length,
    "orderedItems": res,
  };
  ctx.response.type = "application/activity+json";
});
