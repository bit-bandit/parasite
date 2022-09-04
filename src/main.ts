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

const app = new Application();

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

app.use(cors.routes());
app.use(cors.allowedMethods());

app.use((ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  return next();
});

app.use(actions.routes());
app.use(actions.allowedMethods());
app.use(admin.routes());
app.use(admin.allowedMethods());
app.use(auth.routes());
app.use(auth.allowedMethods());
app.use(comments.routes());
app.use(comments.allowedMethods());
app.use(lists.routes());
app.use(lists.allowedMethods());
app.use(media.routes());
app.use(media.allowedMethods());
app.use(root.routes());
app.use(root.allowedMethods());
app.use(search.routes());
app.use(search.allowedMethods());
app.use(tags.routes());
app.use(tags.allowedMethods());
app.use(torrents.routes());
app.use(torrents.allowedMethods());
app.use(users.routes());
app.use(users.allowedMethods());

app.addEventListener("listen", (evt) => {
  const protocol = (evt.secure ? "https" : "http");
  const hostname = evt.hostname ?? "localhost";
  const port = evt.port;

  console.log(`Listening on: ${protocol}://${hostname}:${port}`);
});

await app.listen({ port: settings.sitePort });
