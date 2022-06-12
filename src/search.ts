import { Router } from "https://deno.land/x/oak/mod.ts";
import { search } from "./db.ts";

export let search = new Router();

search.get("/s", async function (ctx) {
});
