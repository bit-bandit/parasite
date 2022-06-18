import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  create,
  decode,
  verify,
} from "https://deno.land/x/djwt@$VERSION/mod.ts";
import { getULoginInfo, getUMetaInfo, UCheck, UInit, ULogin } from "./db.ts";
import { hashPass, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";
import { actorObj, genOrderedCollection } from "./activity.ts";
import { roles } from "../roles.ts";
// This file is comprised of two sections:
// 1. Functions used to validate users within the system.
// 2. Routing for letting users register, or log into accounts.

// Functions

// Exportable
export async function isValid(user: string, token: any) {
  // For verifying tokens.
}

// Routes
export let auth = new Router();

auth.post("/login", async function (ctx) {
  if (!ctx.request.hasBody) {
    throwAPIError(ctx, "No body provided", 404);
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    throwAPIError(ctx, "Invalid content type", 400);
  }

  let requestJSON = await raw.value();

  let info = await getULoginInfo(requestJSON.id);

  if (info.err) {
    ctx.response.body = info;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }

  if (hashPass(requestJSON.password) === info.pass) {
    // Return token, and update logins
    const t = Date.now();
    await ULogin(requestJSON.id, t);
  } else {
    throwAPIError(ctx, "Invalid credentials", 400);
  }
});

auth.post("/register", async function (ctx) {
  // Create new user.
  // When creating, use the resources in `static/m/defaults/`.
  // Make subdirectory in static/m/u/ named after the user ID, with the the
  // following files:
  // - avatar.png
  // - banner.png
  // These can be updated in the future. (See POST /u/:id)
  if (!ctx.request.hasBody) {
    throwAPIError(ctx, "No body provided", 404);
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    throwAPIError(ctx, "Invalid content type", 400);
  }

  let requestJSON = await raw.value();

  if (!requestJSON.password || !requestJSON.username) {
    throwAPIError(ctx, "Either the username or password is missing.", 400);
  }

  // Check if the username is already taken.
  const notTaken = await UCheck(requestJSON.username);

  if (!notTaken) {
    throwAPIError(ctx, "Username already taken.", 400);
  } else {
    // Now we can get the actual user creation started, yes?
    // Use default things to put into user account here..

    // TODO: Add some error handling here.
    const destDir = `${settings.staticFileDir}/m/u/${requestJSON.username}`;
    await Deno.mkdir(destDir);
    await Deno.copyFile(
      `${settings.staticFileDir}avatar.png`,
      `${destDir}/avatar.png`,
    );
    await Deno.copyFile(
      `${settings.staticFileDir}banner.png`,
      `${destDir}/banner.png`,
    );

    const userStatic = `${siteURL}/m/u/${requestJSON.username}`;

    const avatar = `${userStatic}/avatar.png`;
    const banner = `${userStatic}/banner.png`;

    const userAPI = `${settings.siteURL}/u/${requestJSON.username}`;

    const actorInfo = actorObj({
      "id": `${userAPI}/inbox`,
      "following": `${userAPI}/following`,
      "followers": `${userAPI}/followers`,
      "liked": `${userAPI}/liked`,
      "inbox": `${userAPI}/inbox`,
      "outbox": `${userAPI}/outbox`,
      "name": `${requestJSON.username}`,
      "summary": "",
      "icon": [
        avatar,
      ],
      "image": banner,
    });

    await UInit({
      id: requestJSON.username,
      info: actorInfo,
      pass: await hashPass(requestJSON.password),
      roles: roles[settings.defaultRole],
      inbox: genOrderedCollection(`${userAPI}/inbox`),
      outbox: genOrderedCollection(`${userAPI}/outbox`),
      likes: genOrderedCollection(`${userAPI}/likes`),
      dislikes: genOrderedCollection(`${userAPI}/dislikes`),
      following: genOrderedCollection(`${userAPI}/following`),
      followers: genOrderedCollection(`${userAPI}/followers`),
      logins: [], // Tokens will be added next time user logs in. See `/login/`.
      registered: Date.now(),
    });

    ctx.response.body = {
      "msg": "User ${requestJSON.username} created",
    };
    ctx.response.type = "application/json";
    ctx.response.status = 201;
  }
});
