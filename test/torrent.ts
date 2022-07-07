import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.144.0/testing/asserts.ts";

// Global variables we're going to call later on.
let torrentURL = "";

// You're on your own when it comes to the tokens.
// Hopefully you already registered the `bob` account with the users test.
// If ypu haven't: Do that. Right now.
const loginData = {
  "username": "bob",
  "password": "subgenius",
};

let firstTorrentURL = "";

const tokenRequest = await fetch("http://0.0.0.0:8080/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(loginData),
});
const userJWT = await tokenRequest.text();

// ... Now onto the actual Torrent shit.
const torrentData = {
  "type": "Create",
  "name": "Torrent Title!",
  "content": "Specifically, it's from the Blender Project! Cool guys!",
  "tags": "action,adventure,fantasy",
  "href":
    "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
};

Deno.test("Upload Torrent", async () => {
  const r = await fetch("http://0.0.0.0:8080/t/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify(torrentData),
  });

  const res = await r.json();
  if (!res.err) {
    torrentURL = res.msg.split(" ").pop();
  }
  assertNotEquals(res.err, true);
});

Deno.test("Get torrent", async () => {
  const r = await fetch(torrentURL);
  const stat = r.status;

  const j = await r.json();

  firstTorrentURL = j.id;

  assertEquals(r.status, 200);
});

Deno.test("Attempt to get nonexistent torrent", async () => {
  const res = await fetch("http://localhost:8080/t/nonexistent");
  const json = await res.json();
  assertEquals(json.err, true);
});

Deno.test("Update Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Update",
      "content": "Something different",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Comment on Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Create",
      "content": "Something different",
    }),
  });

  const res = await r.json();
  assertEquals(res.err === true, false);
});

Deno.test("Reply to torrent comment", async () => {
  let r = await fetch(torrentURL);
  let res = await r.json();
  r = await fetch(res.replies);
  res = await r.json();
  r = await fetch(res.orderedItems[0]);
  res = await r.json();

  const req = await fetch(res.id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Create",
      "content": "Something even stranger!",
    }),
  });

  let reqJson = await req.json();

  r = await fetch(res.replies)
  res = await r.json(); 
  assertNotEquals(res.totalItems, 0);  
});

Deno.test("Like comment", async () => {
  let r = await fetch(torrentURL);
  let res = await r.json();
  r = await fetch(res.replies);
  res = await r.json();
  r = await fetch(res.orderedItems[0]);
  res = await r.json();

  const req = await fetch(res.id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Like"
    }),
  });

  let reqJson = await req.json();

  r = await fetch(res.replies)
  res = await r.json(); 
  assertNotEquals(res.totalItems, 0);  
});

Deno.test("Like Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Like",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Flag Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Flag",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Try to like Torrent twice", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Like",
    }),
  });

  const res = await r.json();
  assertEquals(res.err, true);
});

Deno.test("Dislike Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Dislike",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Try to dislike Torrent twice", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Dislike",
    }),
  });

  const res = await r.json();
  assertEquals(res.err, true);
});

Deno.test("Delete Torrent", async () => {
  const r = await fetch(torrentURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Delete",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Get deleted torrent", async () => {
  const r = await fetch(torrentURL);
  const stat = r.status;
  // This is purely to stop an error from happening.
  const j = await r.json();
  assertEquals(r.status, 404);
});
