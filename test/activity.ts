import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import { genObj } from "../src/activity.ts";

const expout = { // Expected output
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://torrents.sickos.social/t/500df719166b",
  "type": "Note",
  "published": "2022-02-13T22:33:24.315Z",
  "attributedTo": "https://torrents.sickos.social/u/larvae",
  "name": "Sintel (Torrent)",
  "content":
    "<p>Have a torrent you won't get sued over! Kudos to the Blender foundation for making this one, and for free!</p>",
  "tag": [
    {
      "id": "https://torrents.sickos.social/tags/fantasy",
      "name": "Fantasy",
    },
  ],
  "attachment": {
    "type": "Link",
    "href":
      "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
  },
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "replies": "https://torrents.sickos.social/t/500df719166b/r",
};

Deno.test("User submitted note generation test <genObj>", () => {
  const obj = genObj({
    id: "https://torrents.sickos.social/t/500df719166b",
    published: "2022-02-13T22:33:24.315Z",
    actor: "https://torrents.sickos.social/u/larvae",
    name: "Sintel (Torrent)",
    content:
      "<p>Have a torrent you won't get sued over! Kudos to the Blender foundation for making this one, and for free!</p>",
    link:
      "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
    tags: [{
      "id": "https://torrents.sickos.social/tags/fantasy",
      "name": "Fantasy",
    }],
  });
  assertEquals(
    JSON.stringify(obj, null, "\t"),
    JSON.stringify(expout, null, "\t"),
  );
});
