// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { settings } from "../settings.ts";

const dbsettings = settings.database.settings;

const client = new Client({
  user: dbsettings.user,
  database: dbsettings.database,
  hostname: dbsettings.hostname,
  password: dbsettings.password,
  port: dbsettings.port,
});

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

export async function getTorrentJSON(id: string) {
  return basicDataQuery(
    "No torrent with id ${id} found",
    "SELECT json FROM torrents WHERE id = $1",
    id,
  );
}

export async function getListJSON(id: string) {
  return basicDataQuery(
    "No list with id ${id} found",
    "SELECT json FROM lists WHERE id = $1",
    id,
  );
}

export async function getCommentJSON(id: string) {
  return basicDataQuery(
    "No comment with id ${id} found",
    "SELECT json FROM comments WHERE id = $1",
    id,
  );
}

export async function getTorrentReplies(id: string) {
  return basicDataQuery(
    "No replies on torrent id ${id} found",
    "SELECT replies FROM torrents WHERE id = $1",
    id,
  );
}

export async function getListReplies(id: string) {
  return basicDataQuery(
    "No replies on list id ${id} found",
    "SELECT replies FROM lists WHERE id = $1",
    id,
  );
}

export async function getCommentReplies(id: string) {
  return basicDataQuery(
    "No replies on list id ${id} found",
    "SELECT replies FROM comments WHERE id = $1",
    id,
  );
}

export async function getUserInfo(id: string) {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT info FROM users WHERE id = $1",
    id,
  );
}

// User related information
export async function getUMetaInfo(id: string) {
  return basicDataQuery(
    "User ${id} not found",
    "SELECT id, logins, roles FROM users WHERE id = $1",
    id,
  );
}

export async function getULoginInfo(id: string) {
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

export async function deleteTorrent(id: string) {
  await client.connect();
  await client.queryArray(
    "DELETE json WHERE id = $1;",
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
