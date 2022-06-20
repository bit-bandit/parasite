// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { settings } from "../settings.ts";

let db_settings = settings.database.settings;

const client = new Client(db_settings);

const userTableInit = `
CREATE TABLE IF NOT EXISTS users (
  PRIMARY KEY(id),
  id          VARCHAR(21)   NOT NULL,
  info        JSONB         NOT NULL,
  pass        VARCHAR(256)  NOT NULL,
  roles       JSONB         NOT NULL,
  inbox       JSONB         NOT NULL,
  outbox      JSONB         NOT NULL,
  likes       JSONB         NOT NULL,
  dislikes    JSONB         NOT NULL,
  following   JSONB         NOT NULL,
  followers   JSONB         NOT NULL,
  logins      JSONB         NOT NULL,
  registered  TIMESTAMP     NOT NULL
);
`;

const torrentTableInit = `
CREATE TABLE IF NOT EXISTS torrents (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  activity  JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL,
  flags     JSONB         NOT NULL
);
`;

// Literally just copying the torrent table, here...
const listsTableInit = `
CREATE TABLE IF NOT EXISTS lists (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  activity  JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL,
  flags     JSONB         NOT NULL
);
`;

const commentsTableInit = `
CREATE TABLE IF NOT EXISTS comments (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  activity  JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL,
  flags     JSONB         NOT NULL 
);
`;

const tagsTableInit = `
CREATE TABLE IF NOT EXISTS tags (
  name     VARCHAR(37)  NOT NULL,
  created  TIMESTAMP    NOT NULL,
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
  let res = await client.queryArray(query, args);
  await client.end();

  if (res.rows.length !== 0) {
    return res.rows[0];
  }

  return { "err": true, "msg": msg };
}

export async function getTorrentJSON(id: string): Promise<any> {
  return basicDataQuery(
    "No torrent with id ${id} found",
    "SELECT json FROM torrents WHERE id = $1",
    id,
  );
}

export async function getListJSON(id: string): Promise<any> {
  return basicDataQuery(
    "No list with id ${id} found",
    "SELECT json FROM lists WHERE id = $1",
    id,
  );
}

export async function getCommentJSON(id: string): Promise<any> {
  return basicDataQuery(
    "No comment with id ${id} found",
    "SELECT json FROM comments WHERE id = $1",
    id,
  );
}

export async function getTorrentReplies(id: string): Promise<any> {
  return basicDataQuery(
    "No replies on torrent id ${id} found",
    "SELECT replies FROM torrents WHERE id = $1",
    id,
  );
}

export async function getListReplies(id: string): Promise<any> {
  return basicDataQuery(
    "No replies on list id ${id} found",
    "SELECT replies FROM lists WHERE id = $1",
    id,
  );
}

export async function getCommentReplies(id: string): Promise<any> {
  return basicDataQuery(
    "No replies on list id ${id} found",
    "SELECT replies FROM comments WHERE id = $1",
    id,
  );
}

export async function getUserInfo(id: string): Promise<any> {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT info FROM users WHERE id = $1",
    id,
  );
}

// User related information
export async function getUMetaInfo(id: string): Promise<any> {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT id, logins, roles FROM users WHERE id = $1",
    id,
  );
}

export async function getULoginInfo(id: string): Promise<any> {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT pass FROM users WHERE id = $1",
    id,
  );
}

export async function ULogin(id: string, time: number) {
  // Basically just push to the 'logins' array.
  let newValue: number[];
  await client.connect();
  // screw it, not dealing with type shenanigans on this
  let initialValue: any = await client.queryArray(
    "SELECT logins FROM users WHERE id = $1",
    [id],
  );
  initialValue = initialValue.rows[0];

  if (initialValue.length >= 10) {
    initialValue.shift();
  }

  newValue = initialValue.push(time);

  await client.queryObject(
    "UPDATE users SET logins = $1 WHERE id = $2;",
    [JSON.stringify(newValue), id],
  );
  await client.end();
}

export async function UCheck(id: string) {
  // Check users (For usage in signing up only, as of right now.)
  // Do insensitive lookup of user ID. If an entry doesn't exist,
  // return true, else, return false.
  await client.connect();
  const res = await client.queryArray(
    "SELECT id FROM users WHERE lower(id) = $1",
    [id.toLowerCase()],
  );
  await client.end();

  if (res.rows.length === 0) {
    return true;
  }
  return false;
}

export async function UInit(params: any = {}) {
  await client.connect();
  await client.queryArray(
    `INSERT INTO users (info, pass, roles, inbox, outbox, likes, 
       dislikes, following, followers, logins) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
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
    ],
  );
  await client.end();
}

// Function to add to the DB. Because all the tables - Besides users -
// are virtually identical, we can get away with this.
export async function addToDB(category: string, params: any = {}, id?: string) {
  if (
    category !== "torrents" | category !== "lists" | catagory !== "comments"
  ) {
    throw new Error("Specified type not applicable.");
  }
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
      params.json,
      params.activity,
      params.uploader,
      params.likes,
      params.dislikes,
      params.replies,
      params.flags,
    ],
  );

  if (category === "comments") {
    // let reps = await getCommentReplies(id);
    // reps.orderedItems.push(params.json.id);
    // reps.totalItems = r.orderedItems.length;
    // Add to both comments and torrents(The `replies` column).
    // 'UPDATE torrents SET replies = $1 WHERE id = $2',
    // [JSON.stringify(reps), id]
  }

  await client.end();
}

export async function deleteTorrent(id: string) {
  await client.connect();
  // TODO: Figure out how to delete replies.
  await client.queryArray(
    "DELETE * WHERE id = $1;",
    [id],
  );
  await client.end();
}

export async function search(query: string) {
  // q = Search query
  // t = tags (comma seperated(?))
  // u = Specify user
  // s = Sort 'highest/lowest'

  let u = new URLPattern(query);

  if (u.search.length === 0) {
    return {
      "err": true,
      "msg": "Invalid search input",
    };
  }

  let search = new URLSearchParams(u.search);

  // I'm not going to even fucking bother with this, for the time being.
  if (search.has("q")) {
    await client.connect();
    let res = await client.queryArray(
      "SELECT json WHERE json->>'title' ILIKE $1 OR json->>'content' ILIKE $1 OR id = $1;",
      [search.get("q")],
    );
    await client.end();
  }
}
