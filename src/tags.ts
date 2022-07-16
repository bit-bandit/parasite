import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { genOrderedCollection } from "./activity.ts";
import { getJSONfromTags } from "./db.ts";
import { isValidChar, throwAPIError } from "./utils.ts";

export const tags = new Router();

tags.get("/i/:tag", async function (ctx: Context) {
  if (!isValidChar(ctx.params.tag)) {
    return throwAPIError(ctx, "Invalid characters in tag name.", 400);
  }

  let out = await getJSONfromTags(ctx.request.url);

  for (let i in out) {
    out[i] = out[i][0].id;
  }

  ctx.response.body = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": ctx.request.url,
    "type": "Collection",
    "totalItems": out.length,
    "items": out,
  };
  ctx.response.type = "application/activity+json";
});
