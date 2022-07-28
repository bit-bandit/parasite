import { Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { throwAPIError } from "./utils.ts";

export const media = new Router();

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
    throwAPIError(ctx, "File not found", 404);
  }
});
