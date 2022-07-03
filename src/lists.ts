import { Router } from "https://deno.land/x/oak/mod.ts";
import { getListJSON, getListReplies } from "./db.ts";
import { isValid } from "./auth.ts";

export let lists = new Router();

// Copy paste most of the shit that we wrote in `torrents.ts.`

lists.get("/l/:id", async function (ctx) {
  // Get list of torrents.
});

lists.get("/l/:id/r", async function (ctx) {
  // Get replies to a list.
});

lists.post("/l/", async function (ctx) {
  // Create a list.
});

lists.post("/l/:id", async function (ctx) {
  // Do things with a preexisting list.
});
