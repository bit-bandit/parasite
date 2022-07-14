import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { getJSONfromTags } from './db.ts';

export const tags = new Router();

tags.get('/i/:tag', async function(ctx: Context) {
  const res = await getJSONfromTags(ctx.request.url)
    ctx.response.body = res;
    ctx.response.type = 'application/json';
})
