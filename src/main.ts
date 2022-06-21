import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { auth } from "./auth.ts";

let app = new Application();
let media = new Router();

// Uses a somewhat obscure feature of path-to-regexp; it supports capture groups.
// See <https://github.com/pillarjs/path-to-regexp#unnamed-parameters>
media.get("/m/(.*)", async function (ctx) {
  try {
    // send the file at path ctx.params[0], relative to root settings.staticFileDir
    await ctx.send({
      path: `${ctx.params[0]}`,
      root: `${settings.staticFileDir}`,
    });
  } catch {
    ctx.response.status = 404;
  }
});

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
