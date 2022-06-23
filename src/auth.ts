import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt/mod.ts";
import { Algorithm } from "https://deno.land/x/djwt/algorithm.ts";
import { getULoginInfo, getUMetaInfo, UCheck, UInit, ULogin } from "./db.ts";
import { hashPass, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";
import { actorObj, genOrderedCollection } from "./activity.ts";
import { roles } from "../roles.ts";
import { getKey } from "./crypto.ts";
// This file is comprised of two sections:
// 1. Functions used to validate users within the system.
// 2. Routing for letting users register, or log into accounts.

// Functions

// Exportable
export async function isValid(user: string, token: string) {
  try {
    let payload = await verify(token, await getKey());
    return payload.user == user;
  } catch {
    return false;
  }
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

  let requestJSON = await raw.value;

  let info = await getULoginInfo(`${requestJSON.username}`);

  if (info.err) {
    ctx.response.body = info;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }

  let hashed = await hashPass(requestJSON.password, info[1]);

  if (hashed === info[0]) {
    // Return token, and update logins
    const t = Date.now();
    await ULogin(requestJSON.username, t);

    let jwt = await create({
      typ: "JWT",
      alg: settings.jwt.keyAlgStr as Algorithm,
    }, {
      name: requestJSON.username,
      iat: t, 	
      exp: getNumericDate(settings.jwt.tokenLifetime),
    }, await getKey());

    ctx.response.body = jwt;
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  } else {
    throwAPIError(ctx, "Invalid credentials", 400);
  }
});

auth.post("/register", async function (ctx) {
  // Create new user.
  // When creating, use the resources in `static/defs/`.
  // Make subdirectory in `static/u/` named after the user ID, with the the
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

  let requestJSON = await raw.value;

  if (!requestJSON.password || !requestJSON.username) {
    throwAPIError(ctx, "Either the username or password is missing.", 400);
  }
  // Test if username is safe to use.
  // Should the parameter be in `sesttings.ts`? Beats me.
  if (!/^[A-Za-z0-9_]{1,24}$/.test(requestJSON.username)) {
    throwAPIError(ctx, "Provided username not acceptable.", 400);
  }
  // Check if the username is already taken.
  const notTaken = await UCheck(requestJSON.username);

  if (!notTaken) {
    throwAPIError(ctx, "Username already taken.", 400);
  } else {
    // Now we can get the actual user creation started, yes?
    // Use default things to put into user account here..

    // TODO: Add some error handling here.
    const destDir = `${settings.staticFileDir}/u/${requestJSON.username}`;
    await Deno.mkdir(destDir, { recursive: true }); // auto-create `/static/u/`
    await Deno.copyFile(
      `${settings.staticFileDir}/defs/avatar.png`,
      `${settings.staticFileDir}/u/avatar.png`,
    );
    await Deno.copyFile(
      `${settings.staticFileDir}/defs/banner.png`,
      `${settings.staticFileDir}/u/banner.png`,
    );

    const userStatic = `${settings.siteURL}/m/u/${requestJSON.username}`;

    const avatar = `${userStatic}/avatar.png`;
    const banner = `${userStatic}/banner.png`;

    const userAPI = `${settings.siteURL}/u/${requestJSON.username}`;

    const actorInfo = actorObj({
      "actor": userAPI,
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
      "banner": banner,
    });

    // pass needs this.
    const registered = Date.now();

    await UInit({
      id: requestJSON.username,
      info: actorInfo,
      pass: await hashPass(requestJSON.password, registered),
      roles: roles[settings.defaultRole],
      inbox: genOrderedCollection(`${userAPI}/inbox`),
      outbox: genOrderedCollection(`${userAPI}/outbox`),
      likes: genOrderedCollection(`${userAPI}/likes`),
      dislikes: genOrderedCollection(`${userAPI}/dislikes`),
      following: genOrderedCollection(`${userAPI}/following`),
      followers: genOrderedCollection(`${userAPI}/followers`),
      logins: [], // Tokens will be added next time user logs in. See `/login/`.
      registered: registered,
    });

    ctx.response.body = {
      "msg": `User ${requestJSON.username} created`,
    };
    ctx.response.type = "application/json";
    ctx.response.status = 201;
  }
});
