import { Router } from "https://deno.land/x/oak/mod.ts";
import { search as searchDB } from "./db.ts";
import { settings } from "../settings.ts";

export const search = new Router();

export interface SearchQuery {
  tags: string[];
  text: string[];
  users: string[];
}

function searchTokenize(packet): SearchQuery {
  // Variables
  const text: string[] = [];
  const users: string[] = [];
  const tags: string[] = [];

  for (const token of packet.split(" ")) {
    switch (token[0]) {
      case "@":
      case "~": {
        users.push(token.slice(1));
        break;
      }
      case "#":
      case ":": {
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

// Search architecture:
// POST - Tokenize raw query to
// compatible URL input, redirect to...
// GET - Get search query server will read from
// URL to indicate what to do.
search.post("/s", async function (ctx) {
  const raw = await ctx.request.body();
  const requestJSON = await raw.value;

  const token = searchTokenize(requestJSON.query);

  const u = new URL('/s', settings.siteURL);
    
  if (token.text) {
    u.searchParams.append("q", token.text.join("+"));
  }
  if (token.tags) {
    u.searchParams.append("t", token.tags.join("+"));
  }
  if (token.users) {
    u.searchParams.append("u", token.users.join("+"));
  }

    ctx.response.redirect(u.href);
    ctx.response.body = {
	"msg": `Redirecting to ${u.href}`
    }
    ctx.response.status = 301;
    ctx.response.type = "application/json";
});

search.get("/s", async function (ctx) {
  // const res = await search(ctx.request.url);
    // if (!res.err) {
    const res = await searchDB(ctx.request.url);
    ctx.response.body = res;
    ctx.response.status = 200;
    ctx.response.type = "application/json";
/*
  } else {
    ctx.response.body = res;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
*/
});
