// This is the most needlessly complicated part of the test suite, but it
// must be done this way for extremely arbitrary reasons we should've
// had the intelligence to fix prior.

import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.144.0/testing/asserts.ts";

// import { basicObjectUpdate } from "../src/db.ts";
// import { federation } from "../federation.json" assert { type: "json" };
import { roles } from "../roles.ts";

// User stuff
const loginData = {
  "username": "bob",
  "password": "subgenius",
};

const tokenRequest = await fetch("http://0.0.0.0:8080/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(loginData),
});

const userJWT = await tokenRequest.text();

// Update user role so these tests actually work.
// TODO: Actually get this shit changed
/*
await basicObjectUpdate("users", {
  "roles": roles["Admin"],
}, "bob");
*/

// All of this is just the *preperation* for the test
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${userJWT}`,
};

const torrent = {
  "type": "Create",
  "name": "Torrent Title!",
  "content": "Specifically, it's from the Blender Project! Cool guys!",
  "tags": "action,adventure,fantasy",
  "href":
    "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
};

const list = {
  "type": "Create",
  "name": "A list!",
  "summary": "Woah! A list! Wow! I'm going to drown myself in battery acid!",
  "tags": "horror,birds,2010",
};

const torrentData = await fetch("http://0.0.0.0:8080/t", {
  method: "POST",
  body: JSON.stringify(torrent),
  headers: headers,
});

const comment = {
  "type": "Create",
  "content": "llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch!",
  "inReplyTo": torrentData.headers.get("Location"),
};

const commentData = await fetch("http://0.0.0.0:8080/x/comment", {
  method: "POST",
  body: JSON.stringify(comment),
  headers: headers,
});

const listData = await fetch("http://0.0.0.0:8080/l", {
  method: "POST",
  body: JSON.stringify({
    ...list,
    "orderedItems": [torrentData.headers.get("Location")],
  }),
  headers: headers,
});

// Now the fun can begin...
Deno.test("Block Instance User", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/u/fart",
      "type": "Block",
      "range": "User",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Block Instance", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/",
      "type": "Block",
      "range": "Instance",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Unblock Instance", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/",
      "type": "Unblock",
      "range": "Instance",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Unblock Instance User", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/u/fart",
      "type": "Unblock",
      "range": "User",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Pool Instance", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/",
      "type": "Pool",
      "range": "Instance",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Unpool Instance", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/federate", {
    method: "POST",
    body: JSON.stringify({
      "id": "https://sickos.social/",
      "type": "Unpool",
      "range": "Instance",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Reassign user role", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/reassign", {
    method: "POST",
    body: JSON.stringify({
      "role": "Banned",
      "id": "larvae",
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Delete Torrent", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/delete", {
    method: "POST",
    body: JSON.stringify({
      "id": torrentData.headers.get("Location"),
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Delete List", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/delete", {
    method: "POST",
    body: JSON.stringify({
      "id": listData.headers.get("Location"),
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});

Deno.test("Delete Comment", async () => {
  const r = await fetch("http://0.0.0.0:8080/a/delete", {
    method: "POST",
    body: JSON.stringify({
      "id": commentData.headers.get("Location"),
    }),
    headers: headers,
  });

  const res = await r.json();

  assertNotEquals(res.err, true);
});
