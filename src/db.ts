// Database queries and related functions.

import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { settings } from "../settings.ts";

const torrentTableInit = `
CREATE TABLE IF NOT EXISTS torrents (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL
  flags     JSONB         NOT NULL, 
);
`;

// Literally just copying the torrent table, here...
let listsTableInit = `
CREATE TABLE IF NOT EXISTS lists (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL
  flags     JSONB         NOT NULL, 
);`;

let commentsTableInit = `
CREATE TABLE IF NOT EXISTS comments (
  PRIMARY KEY(id),
  id        VARCHAR(256)  NOT NULL,
  json      JSONB         NOT NULL,
  uploader  VARCHAR(256)  NOT NULL,
  likes     JSONB         NOT NULL,
  dislikes  JSONB         NOT NULL,
  replies   JSONB         NOT NULL
  flags     JSONB         NOT NULL, 
);`;

const client = new Client({
  user: settings.user,
  database: settings.database,
  hostname: settings.hostname,
  password: settings.password,
  port: settings.port,
});

export async function getTorrentJSON(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT json FROM torrents WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No torrent with id ${id} found",
  };
}

export async function getListJSON(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT json FROM lists WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No list with id ${id} found",
  };
}

export async function getCommentJSON(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT json FROM comments WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No comment with id ${id} found",
  };
}

export async function getTorrentReplies(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT replies FROM torrents WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No replies on torrent id ${id} found",
  };
}

export async function getListReplies(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT replies FROM lists WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No replies on list id ${id} found",
  };
}

export async function getCommentReplies(id: string) {
  await client.connect();
  let res = await client.queryArray(
    "SELECT replies FROM comments WHERE id = $1",
    [id],
  );
  await client.end();

  if (res.length !== 0) {
    return res[0][0];
  }

  return {
    "err": true,
    "msg": "No replies on list id ${id} found",
  };
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
      "SELECT json WHERE WHERE json->>'title' ILIKE $1 OR json->>'content' ILIKE $1 OR id = $1;",
      [search.get("q")],
    );
    await client.end();
  }
}
