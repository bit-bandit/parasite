// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { distance } from "https://deno.land/x/damerau_levenshtein/mod.ts";

import { settings } from "../settings.ts";
import { SearchQuery } from "./search.ts";

const db_settings = settings.database.settings;
const client = new Client(db_settings);

interface Res {
  index: number;
  titleMatch: number;
  contentMatch: number;
  tagMatch: number;
}

const userTableInit = `
CREATE TABLE IF NOT EXISTS users (
  PRIMARY KEY(id),
  id          VARCHAR(21)   NOT NULL,
  info        JSON          NOT NULL,
  pass        VARCHAR(256)  NOT NULL,
  roles       JSON          NOT NULL,
  inbox       JSON          NOT NULL,
  outbox      JSON          NOT NULL,
  likes       JSON          NOT NULL,
  dislikes    JSON          NOT NULL,
  following   JSON          NOT NULL,
  followers   JSON          NOT NULL,
  logins      JSON          NOT NULL,
  registered  VARCHAR(256)  NOT NULL,
  keys        JSON  NOT NULL
);
`;

const torrentTableInit = `
CREATE TABLE IF NOT EXISTS torrents (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSON          NOT NULL,
  activity  JSON          NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSON          NOT NULL,
  dislikes  JSON          NOT NULL,
  replies   JSON          NOT NULL,
  flags     JSON          NOT NULL
);
`;

// Literally just copying the torrent table, here...
const listsTableInit = `
CREATE TABLE IF NOT EXISTS lists (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSON         NOT NULL,
  activity  JSON         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSON         NOT NULL,
  dislikes  JSON         NOT NULL,
  replies   JSON         NOT NULL,
  flags     JSON         NOT NULL
);
`;

const commentsTableInit = `
CREATE TABLE IF NOT EXISTS comments (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSON         NOT NULL,
  activity  JSON         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSON         NOT NULL,
  dislikes  JSON         NOT NULL,
  replies   JSON         NOT NULL,
  flags     JSON         NOT NULL 
);
`;

const actionsTableInit = `
CREATE TABLE IF NOT EXISTS actions (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSON         NOT NULL,
  activity  JSON         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSON         NOT NULL,
  dislikes  JSON         NOT NULL,
  replies   JSON         NOT NULL,
  flags     JSON         NOT NULL 
);
`;

await client.connect();

await client.queryArray(`
  ${userTableInit}
  ${torrentTableInit}
  ${listsTableInit}
  ${commentsTableInit}
  ${actionsTableInit}
`);

await client.end();

async function basicDataQuery(
  msg: string,
  query: string,
  ...args: string[]
) {
  await client.connect();
  const res = await client.queryArray(query, args);
  await client.end();

  if (res.rows.length !== 0) {
    return res.rows[0];
  }

  return { "err": true, "msg": msg };
}
// Main JSON elements for objects

// This should probably be renamed.
export function getTorrentJSON(id: string, t: string): Promise<> {
  return basicDataQuery(
    "No torrent with id ${id} found",
    `SELECT ${t ?? "json"} FROM torrents WHERE id = $1`,
    id,
  );
}

export function getActionJSON(id: string, t: string): Promise<> {
  return basicDataQuery(
    "No action with id ${id} found",
    `SELECT ${t ?? "json"} FROM actions WHERE id = $1`,
    id,
  );
}

export function getListJSON(id: string, t: string): Promise<> {
  return basicDataQuery(
    "No list with id ${id} found",
    `SELECT ${t ?? "json"} FROM lists WHERE id = $1`,
    id,
  );
}

export function getCommentJSON(id: string, t?: string): Promise<> {
  return basicDataQuery(
    "No comment with id ${id} found",
    `SELECT ${t ?? "json"} FROM comments WHERE id = $1`,
    id,
  );
}

export async function getJSONfromTags(t: string): Promise<> {
  await client.connect();
  const res = await client.queryArray(
    `SELECT json FROM torrents WHERE json ->> 'tag' LIKE '[%${t}%';`,
  );

  const list = await client.queryArray(
    `SELECT json FROM lists WHERE json ->> 'tag' LIKE '[%${t}%';`,
  );

  if (list.rows.length > 0) {
    res.rows.push(list.rows[0]);
  }

  await client.end();
  return res.rows;
}

// User related information
export function getUMetaInfo(id: string): Promise<> {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT id, logins, roles FROM users WHERE id = $1",
    id,
  );
}

export function getULoginInfo(id: string): Promise<> {
  return basicDataQuery(
    `User ${id} not found`,
    "SELECT pass, registered FROM users WHERE id = $1",
    id,
  );
}

export async function ULogin(id: string, time: number) {
  // screw it, not dealing with type shenanigans on this
  const raw = await getUMetaInfo(id);
  const logins: number[] = raw[1];

  if (logins.length >= 10) {
    logins.shift();
  }

  logins.push(time);

  await client.connect();
  await client.queryArray(
    "UPDATE users SET logins = $1 WHERE id = $2;",
    [JSON.stringify(logins), id],
  );
  await client.end();
}

export async function UCheck(id: string) {
  await client.connect();
  const res = await client.queryArray(
    "SELECT id FROM users WHERE lower(id) = $1",
    [id.toLowerCase()],
  );
  await client.end();

  if (res.rows.length === 0) {
    return true;
  }
}

export async function UInit(params = {}) {
  await client.connect();
  await client.queryArray(
    `INSERT INTO users (id, info, pass, roles, inbox, outbox, likes, 
       dislikes, following, followers, logins, registered, keys) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
    [
      params.id,
      params.info,
      params.pass,
      JSON.stringify(params.roles),
      JSON.stringify(params.inbox),
      JSON.stringify(params.outbox),
      JSON.stringify(params.likes),
      JSON.stringify(params.dislikes),
      JSON.stringify(params.following),
      JSON.stringify(params.followers),
      JSON.stringify(params.logins),
      params.registered,
      JSON.stringify(params.keys),
    ],
  );
  await client.end();
}

// ActivityPub  for users.
export async function getUActivity(id: string, objType: string): Promise<> {
  // NOTE: NEVER EVER EVER EVER LET USERS SUBMIT THE `OBJTYPE` IN THIS CURRENT STATE.
  // IT *WILL* LEAD TO AN SQL INJECTION BEING PERFORMED.
  // See examples in `src/users.ts` to an example on how to use it.
  let res = await basicDataQuery(
    `User ${id} not found`,
    `SELECT ${objType ?? "json"} FROM users WHERE id = $1`,
    id,
  );
  if (!res.err) {
    return res[0];
  } else {
    return res;
  }
}

// Before you do say anything:
//   - Yes, this is probably the worst piece of code in the entire project.
//   - Hopefully, it will become much better than...this.
export async function basicObjectUpdate(
  category: string,
  params = {},
  id: string,
) {
  await client.connect();

  for (const prop in params) {
    await client.queryArray(
      `UPDATE  ${category} SET ${prop} = $1 WHERE id = $2`,
      [JSON.stringify(params[prop]), id],
    );
  }

  await client.end();
}

// Function to add to the DB. Because all the tables - Besides users -
// are virtually identical, we can get away with this.
// This is so fucking ugly.
export async function addToDB(
  category: string,
  params = {},
) {
  await client.connect();

  // For comments, we're just updating a column to a table. This should
  // really be its own function, but I'm keeping it here
  // because why not.

  // Use `getCommentReplies` to get the JSON of the comments before you update it.

  // Using string literals in this case isn't the worst option.
  await client.queryArray(
    `INSERT INTO ${category}(id, json, activity, uploader, likes, dislikes, replies, flags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.id,
      JSON.stringify(params.json),
      JSON.stringify(params.activity),
      params.uploader,
      JSON.stringify(params.likes),
      JSON.stringify(params.dislikes),
      JSON.stringify(params.replies),
      JSON.stringify(params.flags),
    ],
  );
  await client.end();
  // TODO: Also add to users outbox/followers inbox.
  // Will have to figure out how to do that, though...
}

export async function deleteTorrent(id: string) {
  const tData = await getTorrentJSON(id, "json, uploader");
  const user = tData[1];
  const json = tData[0];

  await client.connect();
  // TODO:
  // - Figure out how to delete replies.
  await client.queryArray(
    "DELETE FROM torrents WHERE id = $1;",
    [id],
  );
  await client.end();
  // Modify outbox
  const outbox = await getUActivity(user, "outbox");

  for (let i = 0; i < outbox.orderedItems.length; i++) {
    if (outbox.orderedItems[i].object.id === json.id) {
      outbox.orderedItems.splice(i, 1);
    }
  }

  outbox.totalItems = outbox.orderedItems.length;

  await basicObjectUpdate("users", {
    "outbox": outbox,
  }, user);
}

export async function deleteComment(id: string) {
  const cData = await getCommentJSON(id, "json, uploader");
  const user = cData[1];
  const json = cData[0];

  await client.connect();
  // TODO:
  // - Figure out how to delete replies.
  await client.queryArray(
    "DELETE FROM comments WHERE id = $1;",
    [id],
  );
  await client.end();
  // Modify outbox
  const outbox = await getUActivity(user, "outbox");

  for (let i = 0; i < outbox.orderedItems.length; i++) {
    if (outbox.orderedItems[i].object.id === json.id) {
      outbox.orderedItems.splice(i, 1);
    }
  }

  outbox.totalItems = outbox.orderedItems.length;

  await basicObjectUpdate("users", {
    "outbox": outbox,
  }, user);
}

export async function deleteList(id: string) {
  const lData = await getListJSON(id, "json, uploader");
  const user = lData[1];
  const json = lData[0];

  await client.connect();
  // TODO:
  // - Figure out how to delete replies.
  await client.queryArray(
    "DELETE FROM lists WHERE id = $1;",
    [id],
  );
  await client.end();
  // Modify outbox
  let outbox = await getUActivity(user, "outbox");

  for (let i = 0; i < outbox.orderedItems.length; i++) {
    if (outbox.orderedItems[i].object.id === json.id) {
      outbox.orderedItems.splice(i, 1);
    }
  }

  outbox.totalItems = outbox.orderedItems.length;

  await basicObjectUpdate("users", {
    "outbox": outbox,
  }, user);
}

export async function search(query) {
  // q = Search query
  // i = tags (comma seperated(?))
  // u = Specify user
  const q = new URL(query);

  // Okay here's the deal:
  // if a user is specified - Only query the DB for posts by
  // that user, and let the server take care of the rest.
  if (
    q.searchParams.has("u") &&
    q.searchParams.has("i") &&
    q.searchParams.has("q")
  ) {
    const users = q.searchParams.get("u");
    // Connect
    await client.connect();

    let usubmissions: any[] = [];

    for (const user of users.split("+")) {
      const torrentUploads = await client.queryArray(
        "SELECT json FROM torrents WHERE uploader = $1;",
        [user],
      );

      const listUploads = await client.queryArray(
        "SELECT json FROM lists WHERE uploader = $1;",
        [user],
      );

      // Format rows properly
      for (let i in listUploads.rows) {
        listUploads.rows[i] = listUploads.rows[i][0];
      }

      for (let i in torrentUploads.rows) {
        torrentUploads.rows[i] = torrentUploads.rows[i][0];
      }

      // Combine rows.
      if (torrentUploads.rows.length > 0) {
        usubmissions.push(...torrentUploads.rows);
      }

      if (listUploads.rows.length > 0) {
        usubmissions.push(...listUploads.rows);
      }
    }
    await client.end();

    // Filter tags, and strings.

    const tags = q.searchParams.get("i");

    // This doesn't work.
    for (const tag of tags.split("+")) {
      const tagURL = new URL(`/i/${tag}`, settings.siteURL);
      usubmissions.filter(function (x) {
        let c: string[] = [];
        for (const entryTag of x.tag) {
          let k = new URL(entryTag);
          c.push(k.pathname);
        }
        return c.includes(tagURL.pathname);
      });
    }

    // Sort
    const results: Res[] = [];
    const searchText: string = q.searchParams.get("q");

    let i = 0;

    for (const entry of usubmissions) {
      const titleRes = distance(searchText, entry.name);

      let contentRes = "";

      if (entry.content) {
        contentRes = distance(
          searchText,
          entry.content,
        );
      } else {
        contentRes = distance(searchText, entry.summary);
      }

      const tagRes = distance(
        searchText,
        entry.tag.join(" "),
      );

      results.push({
        index: i,
        titleMatch: titleRes,
        contentMatch: contentRes,
        tagMatch: tagRes,
      });
      i++;
    }

    results.sort(function (a, b) {
      const sumA = (a.titleMatch + a.contentMatch + a.tagMatch);
      const sumB = (b.titleMatch + b.contentMatch + b.tagMatch);
      return sumB + sumA;
    });

    // This also doesn't work.
    usubmissions.sort(function (a, b) {
      return results.indexOf(a) - results.indexOf(b);
    });

    // Return final value.
    return usubmissions;
  }

  // If a tag is specified, while a user isn't, just query
  // for those tags, and let the server take care of the rest.
  if (q.searchParams.has("i")) {
    const tag = q.searchParams.get("i");
    // Get tags.
    // Combine rows.
    // Fitler tags, with strings.
    // Sort.
    // Return.
  }
  // If just text is specified, do a fuzzy full text search
  // of the torrents, and lists DB, and then get the server
  // involved somewhere, I don't know.
  if (q.searchParams.has("q")) {
    return {
      "type": "String",
      "collection": q.searchParams.get("q"),
    };
  }
}
