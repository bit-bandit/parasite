import { Router } from "https://deno.land/x/oak/mod.ts";
import { genOrderedCollection } from "./activity.ts";
import { search as searchDB } from "./db.ts";
import { settings } from "../settings.ts";

export const search = new Router();

export interface SearchQuery {
  tags: string[];
  text: string[];
  users: string[];
  range: string;
  sort: string;
  misc: string[];
}

// Primary algorithm for likes/dislikes results.
async function voteRank(arr: unknown[]) {
  // TODO: Tidying.
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].type === "Person") {
      // This is a buggy solution. Fix this in the future.
      const followers = await fetch(arr[i].followers, {
        headers: {
          "Accept": "application/activity+json",
        },
      });
      arr[i].oldLikes = arr[i].likes;
      arr[i].oldDislikes = arr[i].dislikes;
      arr[i].likes = (await followers.json()).totalItems;
      arr[i].dislikes = 0;
    } else {
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
  }

  arr.sort((a, b) =>
    (b.likes ** 2 - b.dislikes ** 2) - (a.likes ** 2 - a.dislikes ** 2)
  );

  for (let i = 0; i < arr.length; i++) {
    delete arr[i].likes;
    delete arr[i].dislikes;
    if (arr[i].oldLikes && arr[i].oldDislikes) {
      arr[i].likes = arr[i].oldLikes;
      arr[i].dislikes = arr[i].oldDislikes;
      delete arr[i].oldDislikes;
      delete arr[i].oldLikes;
    }
  }

  return arr;
}

/**
 * Parse a date range.
s * @param s range string: `/^\d*[dmwy]$/m`, or: `/^\d*[dmwy]-\d*[dmwy]$/m`
 */
function parseRange(s: string) {
  const d = Date.now();

  // Time units
  const timeU = {
    "d": 86400000, // Days
    "w": 604800000, // Weeks
    "m": 2628002000, // Months
    "y": 31536024000, // Yeats
  };

  if (/^\d*[dmwy]-\d*[dmwy]$/m.test(s)) {
    let [range1, range2] = s.split("-");
    // Formats
    const r1f = /(\d*)([dwmy])/.exec([range1])[2];
    const r2f = /(\d*)([dwmy])/.exec([range2])[2];
    // Numbers
    const r1n = parseInt(/(\d*)([dwmy])/.exec([range1])[1]);
    const r2n = parseInt(/(\d*)([dwmy])/.exec([range2])[1]);

    if (!timeU[r1f] || !timeU[r2f]) {
      return 0;
    }

    range1 = d - (r1n * timeU[r1f]);
    range2 = d - (r2n * timeU[r2f]);

    // Ensure that the larger value will always be [0]
    if (range2 > range1) {
      return [range2, range1];
    }
    return [range1, range2];
  }

  const n = parseInt(s.split(/[a-z]/)[0]);
  const t = s.split("").pop();

  // Time units
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
  const misc: string[] = [];

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
      case "&": {
        misc.push(token.slice(1));
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
    "misc": misc,
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
  if (searchParams.has("m")) {
    tokens.misc.unshift(...searchParams.get("m").split(" "));
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
  if (tokens.misc) {
    parsedURL.searchParams.append("m", tokens.misc.join("+"));
  }

  const res = await searchDB(parsedURL);

  const ordColl = genOrderedCollection(parsedURL.href, res, {
    summary: "Search results",
  });

  if (!tokens.misc.includes("local")) {
    for (const pooled of settings.federationParams.pooled) {
      let f = await fetch(pooled, {
        headers: {
          "Accept": "application/activity+json",
        },
      });
      f = await f.json();
      ordColl.orderedItems.push(...f.orderedItems);
    }
  }

  for (let i = 0; i < ordColl.orderedItems.length; i++) {
    if (ordColl.orderedItems[i].item) {
      ordColl.orderedItems[i] = ordColl.orderedItems[i].item;
    }
  }

  if (searchParams.has("r") || tokens.range) {
    const r = searchParams.get("r") ?? tokens.range;
    const range = parseRange(r);
    if (Array.isArray(range)) {
      ordColl.orderedItems.filter((x) =>
        new Date(x.published).getTime() > range[1] &&
        new Date(x.published).getTime() < range[0]
      );
    } else {
      ordColl.orderedItems.filter((x) =>
        new Date(x.published).getTime() > range
      );
    }
  }

  if (searchParams.has("s") || tokens.sort) {
    const s = searchParams.get("s") ?? tokens.sort;
    if (s === "new") {
      ordColl.orderedItems.sort((a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime()
      );
    }
    if (s === "top") {
      ordColl.orderedItems = await voteRank(ordColl.orderedItems);
    }
  }

  if (tokens.misc.includes("reverse")) {
    ordColl.orderedItems.reverse();
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
