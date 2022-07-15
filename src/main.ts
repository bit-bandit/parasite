import { Application } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";

import { actions } from "./actions.ts";
import { auth } from "./auth.ts";
import { comments } from "./comments.ts";
import { lists } from "./lists.ts";
import { media } from "./static.ts";
import { tags } from "./tags.ts";
import { torrents } from "./torrents.ts";
import { users } from "./users.ts";

const app = new Application();

app.use(actions.routes());
app.use(actions.allowedMethods());
app.use(auth.routes());
app.use(auth.allowedMethods());
app.use(comments.routes());
app.use(comments.allowedMethods());
app.use(lists.routes());
app.use(lists.allowedMethods());
app.use(media.routes());
app.use(media.allowedMethods());
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
