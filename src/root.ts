// Root page of a Parasite instance
import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { settings } from "../settings.ts";
import { getMetaJSON, tableCount } from "./db.ts";

export const root = new Router();

root.get("/", async function (ctx: Context) {
  const u = new URL(settings.siteURL);
  const userCount = await tableCount("users");
  const torrentCount = await tableCount("torrents");
  const listCount = await tableCount("lists");
  const commentCount = await tableCount("comments");
  const meta = await getMetaJSON();

  ctx.response.body = {
    "name": settings.siteName,
    "host": u.host,
    "users": userCount,
    "torrents": torrentCount,
    "lists": listCount,
    "comments": commentCount,
    "pooledInstances": meta.pooled,
    "blockedInstances": meta.blocked,
  };
  ctx.response.status = 200;
  ctx.response.type = "application/json";
});
