// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { settings } from "../settings.ts";

const db_settings = settings.database.settings;
const client = new Client(db_settings);

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

const tagsTableInit = `
CREATE TABLE IF NOT EXISTS tags (
  name     VARCHAR(37)  NOT NULL,
  created  VARCHAR(37)  NOT NULL,
  aliasof  VARCHAR(37),
  allowed  BOOLEAN      NOT NULL
);
`;

await client.connect();

await client.queryArray(`
  ${userTableInit}
  ${torrentTableInit}
  ${listsTableInit}
  ${commentsTableInit}
  ${tagsTableInit}
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
      JSON.stringify(params.keys)	   
    ],
  );
  await client.end();
}

// ActivityPub  for users.
export async function getUActivity(id: string, objType: string): Promise<> {
  // NOTE: NEVER EVER EVER EVER LET USERS SUBMIT THE `OBJTYPE` IN THIS CURRENT STATE.
  // IT *WILL* LEAD TO AN SQL INJECTION BEING PERFORMED.
  // See examples in `src/users.ts` to an example on how to use it.
  await client.connect();
  const res = await client.queryArray(
    // I'm feeling dangerous and stupid today.
    `SELECT ${objType} FROM users WHERE id = $1`,
    [id],
  );
  await client.end();

  return res.rows[0][0];
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

export async function search(query: string) {
  // q = Search query
  // t = tags (comma seperated(?))
  // u = Specify user
  // s = Sort 'highest/lowest'

  const u = new URLPattern(query);

  if (u.search.length === 0) {
    return {
      "err": true,
      "msg": "Invalid search input",
    };
  }

  const search = new URLSearchParams(u.search);

  // I'm not going to even fucking bother with this, for the time being.
  if (search.has("q")) {
    await client.connect();
    await client.queryArray(
      "SELECT json WHERE json->>'title' ILIKE $1 OR json->>'content' ILIKE $1 OR id = $1;",
      [search.get("q")],
    );
    await client.end();
  }
}
