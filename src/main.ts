import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { auth } from "./auth.ts";
import { media } from "./static.ts";

let app = new Application();

app.use(media.routes());
app.use(media.allowedMethods());
app.use(auth.routes());
app.use(auth.allowedMethods());

app.addEventListener("listen", (evt) => {
  let protocol = (evt.secure ? "https" : "http");
  let hostname = evt.hostname ?? "localhost";
  let port = evt.port;

  console.log(`Listening on: ${protocol}://${hostname}:${port}`);
});

await app.listen({ port: settings.sitePort });
