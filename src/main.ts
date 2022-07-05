import { Application } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { auth } from "./auth.ts";
import { comments } from "./comments.ts"
import { media } from "./static.ts";
import { torrents } from "./torrents.ts";
import { users } from "./users.ts";

let app = new Application();

app.use(auth.routes());
app.use(auth.allowedMethods());
app.use(comments.routes());
app.use(comments.allowedMethods());
app.use(media.routes());
app.use(media.allowedMethods());
app.use(torrents.routes());
app.use(torrents.allowedMethods());
app.use(users.routes());
app.use(users.allowedMethods());

app.addEventListener("listen", (evt) => {
  let protocol = (evt.secure ? "https" : "http");
  let hostname = evt.hostname ?? "localhost";
  let port = evt.port;

  console.log(`Listening on: ${protocol}://${hostname}:${port}`);
});

await app.listen({ port: settings.sitePort });
