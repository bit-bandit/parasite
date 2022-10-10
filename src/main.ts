import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import "https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js";

import { settings } from "../settings.ts";

import { actions } from "./actions.ts";
import { admin } from "./admin.ts";
import { auth } from "./auth.ts";
import { comments } from "./comments.ts";
import { lists } from "./lists.ts";
import { media } from "./static.ts";
import { root } from "./root.ts";
import { search } from "./search.ts";
import { tags } from "./tags.ts";
import { torrents } from "./torrents.ts";
import { users } from "./users.ts";

const parasite = new Application();

// Hack to deal with CORS
const cors = new Router();
cors.options("(.*)", function (ctx) {
  ctx.response.headers.set("Connection", "keep-alive");
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "POST, GET, OPTIONS",
  );
  ctx.response.headers.set("Access-Control-Allow-Headers", "*,Authorization");
  ctx.response.status = 204;
});

parasite.use(cors.routes());
parasite.use(cors.allowedMethods());

parasite.use((ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  return next();
});

// All the routes come together here.
parasite.use(actions.routes());
parasite.use(actions.allowedMethods());
parasite.use(admin.routes());
parasite.use(admin.allowedMethods());
parasite.use(auth.routes());
parasite.use(auth.allowedMethods());
parasite.use(comments.routes());
parasite.use(comments.allowedMethods());
parasite.use(lists.routes());
parasite.use(lists.allowedMethods());
parasite.use(media.routes());
parasite.use(media.allowedMethods());
parasite.use(root.routes());
parasite.use(root.allowedMethods());
parasite.use(search.routes());
parasite.use(search.allowedMethods());
parasite.use(tags.routes());
parasite.use(tags.allowedMethods());
parasite.use(torrents.routes());
parasite.use(torrents.allowedMethods());
parasite.use(users.routes());
parasite.use(users.allowedMethods());

// Further checks to see what's going on..
parasite.addEventListener("listen", (evt) => {
  const protocol = (evt.secure ? "https" : "http");
  const hostname = evt.hostname ?? "localhost";
  const port = evt.port;

  console.log(`Listening on: ${protocol}://${hostname}:${port}`);
});

await parasite.listen({ port: settings.sitePort });
