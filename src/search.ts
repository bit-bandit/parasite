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

// Primary algorithm for likes/dislikes results.
async function voteRank(arr: unknown[]) {
  // TODO: Tidying.

  for (let i = 0; i < arr.length; i++) {
    const likes = await fetch(`${arr[i].id}/likes`, {
      headers: {
        "Accept": "application/activity+json",
      },
    });

    arr[i].likes = (await likes.json()).orderedItems.length;

    const dislikes = await fetch(`${arr[i].id}/dislikes`, {
      headers: {
        "Accept": "application/activity+json",
      },
    });

    arr[i].dislikes = (await dislikes.json()).orderedItems.length;
  }

  arr.sort((a, b) =>
    (b.likes ** 2 - b.dislikes ** 2) - (a.likes ** 2 - a.dislikes ** 2)
  );

  for (let i = 0; i < arr.length; i++) {
    delete arr[i].likes;
    delete arr[i].dislikes;
  }

  return arr;
}

/**
 * Parse a date range.
 * @param s range string: `/\d[dmwy]/`
 */
function parseRange(s: string) {
  const d = Date.now();
  const n = parseInt(s.split(/[a-z]/)[0]);
  const t = s.split("").pop();

  // Time units
  const timeU = {
    "d": 86400000, // Days
    "w": 604800000, // Weeks
    "m": 2628002000, // Months
    "y": 31536024000, // Yeats
  };

  if (!timeU[t]) {
    return 0;
  }

  return d - n * timeU[t];
}

function searchTokenize(packet): SearchQuery {
  // Variables
  const text: string[] = [];
  const users: string[] = [];
  const tags: string[] = [];
  let range = "";
  let sort = "";

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
      case "^":
      case "r:": {
        range = token.slice(1);
        break;
      }
      case "!": {
        sort = token.slice(1);
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
    "range": range,
    "sort": sort,
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

  // Add existing tags, users, ranges, and sorting type.
  if (searchParams.has("i")) {
    tokens.tags.unshift(...searchParams.get("i").split(" "));
  }
  if (searchParams.has("u")) {
    tokens.users.unshift(...searchParams.get("u").split(" "));
  }
  if (searchParams.has("r")) {
    tokens.range = searchParams.get("r");
  }
  if (searchParams.has("s")) {
    tokens.sort = searchParams.get("s");
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
  if (tokens.range) {
    parsedURL.searchParams.append("r", tokens.range);
  }
  if (tokens.sort) {
    parsedURL.searchParams.append("s", tokens.sort);
  }

  const res = await searchDB(parsedURL);

  const ordColl = genOrderedCollection(parsedURL.href, res, {
    summary: "Search results",
  });

  for (const pooled of settings.federationParams.pooled) {
    let f = await fetch(pooled, {
      headers: {
        "Accept": "application/activity+json",
      },
    });
    f = await f.json();
    ordColl.orderedItems.push(...f.orderedItems);
  }

  for (let i = 0; i < ordColl.orderedItems.length; i++) {
    if (ordColl.orderedItems[i].item) {
      ordColl.orderedItems[i] = ordColl.orderedItems[i].item;
    }
  }

  if (searchParams.has("r")) {
    const r = searchParams.get("r");
    const range = parseRange(r);
    ordColl.orderedItems.filter((x) => new Date(x.published).getTime() > range);
  }

  if (searchParams.has("s")) {
    const s = searchParams.get("s");
    if (s === "new") {
      ordColl.orderedItems.sort((a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime()
      );
    }
    if (s === "top") {
      ordColl.orderedItems = await voteRank(ordColl.orderedItems);
    }
  }

  ctx.response.body = ordColl;
  ctx.response.type = "application/json";

  if (!res.err) {
    ctx.response.status = 200;
  } else {
    ctx.response.status = 404;
  }
});

search.post("/s/r", function (ctx) {
  ctx.response.body = {
    "err": true,
    "msg": "That's illegal, you can't do that. Bad!",
  };

  ctx.response.status = 400;
  ctx.response.type = "application/json";
});
