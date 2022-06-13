import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";

// Oak can't handle dynamic routing alongside sending static content over.
// Originally, the plan was to have one `static` directory, which would send
// its content over if the `/m/` parameter was matched.
// Instead I have to include the `static` directory in another directory
// called `m` in order to get the results I want without directory traversal
// coming into play.

// I swear to god if I ever see the fucking guy who made Oak in person I'm going to
// [ SECTION EXPUNGED TO PREVENT LEGAL ACTION TAKEN AGAINST US ]
app.use(async function (ctx, next) {
  try {
    await ctx.send({
	root: `${settings.staticFileDir}`,
    });
  } catch {
    await next();
  }
});

app.addEventListener("listen", ({ hostname, port, secure }) => {
  console.log(
    `Listening on: ${secure ? "https://" : "http://"}${
      hostname ??
        "localhost"
    }:${port}`,
  );
});

app.listen({ port: settings.sitePort });
