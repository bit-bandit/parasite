import { Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { readFile, throwAPIError } from "./utils.ts";

export const media = new Router();

// Uses a somewhat obscure feature of path-to-regexp; it supports capture groups.
// See <https://github.com/pillarjs/path-to-regexp#unnamed-parameters>
media.get("/m/(.*)", async function (ctx) {
  if (settings.static.type === "supabase") {
    let data = await readFile(ctx.params[0]);
    ctx.response.body = data;
    ctx.response.type = "image/png";
  } else {
    try {
      // send the file at path ctx.params[0], relative to the configured static directory
      await ctx.send({
        path: `${ctx.params[0]}`,
        root: `${settings.static.location}`,
      });
    } catch {
      throwAPIError(ctx, "File not found", 404);
    }
  }
});
