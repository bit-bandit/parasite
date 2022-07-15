import { Router } from "https://deno.land/x/oak/mod.ts";
import { search } from "./db.ts";

export const search = new Router();

function searchTokenize(packet) {
  // Variables
  let text = string[] = [];
  let users: string[] = [];
  let tags: string[] = [];

  for (let token of packet.split(' ')) {
    switch (token[0]) {
      case '@':
      case '~': {
        users.push(token.slice(1));
        break;
      }
      case '#':
      case ':': {
        tags.push(token.slice(1));
        break;
      }
      default: {
        text.push(token);
        break;
      }
    }
  }
  return {
    "tags": tags,
    "text": text,
    "users": users,
  };
}

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
