// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import Fuse from "https://deno.land/x/fuse@v6.4.1/dist/fuse.esm.min.js";
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
  pass        VARCHAR(128)  NOT NULL,
  roles       JSON          NOT NULL,
  inbox       JSON          NOT NULL,
  outbox      JSON          NOT NULL,
  likes       JSON          NOT NULL,
  dislikes    JSON          NOT NULL,
  following   JSON          NOT NULL,
  followers   JSON          NOT NULL,
  logins      JSON          NOT NULL,
  registered  TIMESTAMPTZ   NOT NULL,
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

// Get number of items on a table (Mainly for the '/' endpoint)
export async function tableCount(name: string) {
  await client.connect();
  // ID is present on every table, which makes it a great reference point.
  const res = await client.queryArray(`SELECT COUNT(id) FROM ${name}`);
  await client.end();

  // We have to do this because the DB client returns a bigint by default(!)
  return Number(res.rows[0][0]);
}

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

export async function getULoginInfo(id: string): Promise<> {
  const res = await basicDataQuery(
    `User ${id} not found`,
    "SELECT pass FROM users WHERE id = $1",
    id,
  );

  if (!res.err) {
    return res[0];
  } else {
    return res;
  }
}

export async function ULogin(id: string, time: number) {
  // screw it, not dealing with type shenanigans on this
  const raw = await getUMetaInfo(id);
  const logins: number[] = raw[1];

  if (logins.length >= settings.limits.loginsPerUser) {
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
       dislikes, following, followers, logins, keys, registered)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'now');`,
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

// Remove a user from the database.
export async function deleteUser(id: string) {
  const tables = ["comments", "torrents", "lists", "actions"];

  await client.connect();

  for await (const table of tables) {
    await client.queryArray(
      `DELETE FROM ${table} WHERE uploader = $1`,
      [id],
    );
  }

  await client.queryArray(
    `DELETE FROM users WHERE id = $1`,
    [id],
  );

  await client.end();
}

export async function search(url) {
  // q = Search query
  // i = tags (comma seperated(?))
  // u = Specify user
  const searchParams = url.searchParams;

  // Fuzzy search engine
  const fuseOptions = {
    threshold: 0.5,
    keys: [
      "name",
      "summary",
      "content",
      "tag",
    ],
  };

  let foundObjs: any[] = [];

  const users = searchParams.get("u");
  const tags = searchParams.get("i");
  const query = searchParams.get("q");

  if (
    (!users || !users.length) &&
    (!tags || !tags.length) &&
    (!query || !query.length)
  ) {
    return [];
  }

  // Connect
  await client.connect();

  let torrentResults, listResults;
  let torrentUploads = [], listUploads = [];

  // Okay here's the deal:
  // if a user is specified - Only query the DB for posts by
  // that user, and let the server take care of the rest.
  if (users && users.length) {
    for (const user of users.split("+")) {
      torrentResults = await client.queryArray(
        "SELECT json FROM torrents WHERE uploader = $1;",
        [user],
      );

      listResults = await client.queryArray(
        "SELECT json FROM lists WHERE uploader = $1;",
        [user],
      );

      if (torrentResults.rows.length) {
        torrentUploads.push(...torrentResults.rows);
      }

      if (listResults.rows.length) {
        listUploads.push(...listResults.rows);
      }
    }
  } else {
    // These methods are pretty hackish, all things considered, and may
    // end up causing issues with scalability later on, considering
    // the time it takes for Postgres to spit out all this data for
    // seperate requests.
    // We should probably fix this.
    torrentResults = await client.queryArray("SELECT json FROM torrents;");
    listResults = await client.queryArray("SELECT json FROM lists;");

    if (torrentResults.rows.length) {
      torrentUploads = torrentResults.rows;
    }

    if (listResults.rows.length) {
      listUploads = listResults.rows;
    }
  }

  await client.end();

  torrentUploads = torrentUploads.map((x) => x = x[0]);
  listUploads = listUploads.map((x) => x = x[0]);

  foundObjs = [...torrentUploads, ...listUploads];

  // Make sure we don't waste memory here
  torrentUploads = undefined;
  listUploads = undefined;

  // Filter tags
  if (tags && tags.length) {
    // Use space because + is automatically replaced with space
    for (const tag of tags.split("+")) {
      const tagURL = new URL(`/i/${tag}`, settings.siteURL);

      // Filter out objects that don't include the tag
      foundObjs = foundObjs.filter((obj) => {
        let tagNames: string[] = [];

        for (const entryTag of obj.tag) {
          let curTagURL = new URL(entryTag);
          tagNames.push(curTagURL.pathname);
        }

        return tagNames.includes(tagURL.pathname);
      });
    }
  }

  // Filter strings and sort
  if (query && query.length) {
    const fuse = new Fuse(foundObjs, fuseOptions);
    foundObjs = fuse.search(query);
  }

  // Return final value.
  return foundObjs;
}
