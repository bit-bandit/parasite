import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.144.0/testing/asserts.ts";

// Global variables we're going to call later on.
let listURL = "";

const torrents: string[] = [];

// You're on your own when it comes to the tokens.
// Hopefully you already registered the `bob` account with the users test.
// If you haven't: Do that. Right now.
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

for (let i = 0; i < 10; i++) {
  const r = await fetch("http://localhost:8080/t/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "type": "Create",
      "name": `Torrent ${i}`,
      "content": "Specifically, it's from the Blender Project! Cool guys!",
      "tags": "action,adventure,fantasy",
      "href":
        "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
    }),
  });

  const res = await r.json();
  if (!res.err) {
    const torrentURL = res.msg.split(" ").pop();
    torrents.push(torrentURL);
  }
}

const listData = {
  "type": "Create",
  "name": "A list!",
  "summary": "Woah! A list! Wow! I'm going to drown myself in battery acid!",
  "tags": "horror,birds,2010",
  "orderedItems": torrents,
};

Deno.test("Upload List", async () => {
  const r = await fetch("http://localhost:8080/l/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify(listData),
  });

  const res = await r.json();

  if (!res.err) {
    listURL = res.msg.split(" ").pop();
  }
  assertNotEquals(res.err, true);
});

Deno.test("Get List", async () => {
  const r = await fetch(listURL, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  // Have to declare this to prevent resource leaking
  await r.json();

  assertEquals(r.status, 200);
});

Deno.test("Attempt to get nonexistent List", async () => {
  const res = await fetch("http://localhost:8080/l/nonexistent", {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  const json = await res.json();
  assertEquals(json.err, true);
});

Deno.test("Update list", async () => {
  const r = await fetch(listURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Update",
      "summary": "Something different",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Comment on list", async () => {
  const r = await fetch("http://localhost:8080/x/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Create",
      "content": "Something different",
      "inReplyTo": listURL,
    }),
  });

  const res = await r.json();
  assertEquals(res.err === true, false);
});

Deno.test("Reply to list Comment", async () => {
  let r = await fetch(listURL, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  let res = await r.json();
  r = await fetch(res.replies, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  res = await r.json();
  r = await fetch(res.orderedItems[0], {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  res = await r.json();

  const req = await fetch("http://localhost:8080/x/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Create",
      "content": "Worms!",
      "inReplyTo": res.id,
    }),
  });

  res = await req.json();
  assertNotEquals(res.err, true);
});

Deno.test("Like Comment", async () => {
  let r = await fetch(listURL, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  let res = await r.json();
  r = await fetch(res.replies, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  res = await r.json();
  r = await fetch(res.orderedItems[0], {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  res = await r.json();

  const req = await fetch("http://localhost:8080/x/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Like",
      "object": res.id,
    }),
  });
  await req.json();

  r = await fetch(res.replies, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  res = await r.json();
  assertNotEquals(res.totalItems, 0);
});

Deno.test("Like List", async () => {
  const r = await fetch("http://localhost:8080/x/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Like",
      "object": listURL,
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Flag list", async () => {
  const r = await fetch(listURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Flag",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Try to like list twice", async () => {
  const r = await fetch("http://localhost:8080/x/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Like",
      "object": listURL,
    }),
  });

  const res = await r.json();
  assertEquals(res.err, true);
});

Deno.test("Dislike list", async () => {
  const r = await fetch("http://localhost:8080/x/dislike", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Dislike",
      "object": listURL,
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Try to dislike list twice", async () => {
  const r = await fetch("http://localhost:8080/x/dislike", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Dislike",
      "object": listURL,
    }),
  });

  const res = await r.json();
  assertEquals(res.err, true);
});

Deno.test("Delete List", async () => {
  const r = await fetch(listURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
      "Accept": "application/activity+json",
    },
    body: JSON.stringify({
      "type": "Remove",
    }),
  });

  const res = await r.json();
  assertNotEquals(res.err, true);
});

Deno.test("Try to get deleted list", async () => {
  const r = await fetch(listURL, {
    headers: {
      "Accept": "application/activity+json",
    },
  });
  const k = await r.json();
  assertEquals(r.status, 404);
});
