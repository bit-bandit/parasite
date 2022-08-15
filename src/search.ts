import { Router } from "https://deno.land/x/oak/mod.ts";
import { genOrderedCollection } from "./activity.ts";
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
search.get("/s", async function (ctx) {
  const searchParams = ctx.request.url.searchParams;

  // Tokenize the query if it exists. (Empty string produces empty tokens obj)
  const tokens = searchTokenize(searchParams.get("q") ?? "");

  // Add existing tags and users
  if (searchParams.has("i")) {
    tokens.tags.unshift(...searchParams.get("i").split(" "));
  }
  if (searchParams.has("u")) {
    tokens.users.unshift(...searchParams.get("u").split(" "));
  }

  const parsedURL = new URL("/s", settings.siteURL);

  if (tokens.text) {
    parsedURL.searchParams.append("q", tokens.text.join("+"));
  }
  if (tokens.tags) {
    parsedURL.searchParams.append("i", tokens.tags.join("+"));
  }
  if (tokens.users) {
    parsedURL.searchParams.append("u", tokens.users.join("+"));
  }

  const res = await searchDB(parsedURL);

  const ordColl = genOrderedCollection(parsedURL.href, res, {
    summary: "Search results",
  });

  ctx.response.body = ordColl;
  ctx.response.type = "application/json";

  if (!res.err) {
    ctx.response.status = 200;
  } else {
    ctx.response.status = 404;
  }
});

search.post("/s/r", async function (ctx) {
  ctx.response.body = {
    "err": true,
    "msg": "That's illegal, you can't do that. Bad!",
  };

  ctx.response.status = 400;
  ctx.response.type = "application/json";
});
