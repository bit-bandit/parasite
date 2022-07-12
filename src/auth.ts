import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt/mod.ts";
import { Algorithm } from "https://deno.land/x/djwt/algorithm.ts";
import { getULoginInfo, UCheck, UInit, ULogin } from "./db.ts";
import { hashPass, throwAPIError } from "./utils.ts";
import { settings } from "../settings.ts";
import { actorObj, genOrderedCollection } from "./activity.ts";
import { roles } from "../roles.ts";
<<<<<<< HEAD
import { genKeyPair, getKey } from "./crypto.ts";
=======
import { getJWTKey, genKeyPair } from "./crypto.ts";
>>>>>>> db14b60cbc1d17e8f48202fa62bc9e7f65389ade
// This file is comprised of two sections:
// 1. Functions used to validate users within the system.
// 2. Routing for letting users register, or log into accounts.

// Functions

// Exportable
export async function isValid(user: string, token: string) {
  try {
    const payload = await verify(token, await getJWTKey());
    return payload.user == user;
  } catch {
    return false;
  }
}

// Routes
export const auth = new Router();

auth.post("/login", async function (ctx) {
  if (!ctx.request.hasBody) {
    return throwAPIError(ctx, "No body provided", 404);
  }

  const raw = await ctx.request.body();

  if (raw.type !== "json") {
    return throwAPIError(ctx, "Invalid content type", 400);
  }

  const requestJSON = await raw.value;

  const info = await getULoginInfo(requestJSON.username);

  if (info.err) {
    ctx.response.body = info;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  const hashed = await hashPass(requestJSON.password, info[1]);

  if (hashed !== info[0]) {
    return throwAPIError(ctx, "Invalid credentials", 400);
  }

  // Return token, and update logins
  const t = Date.now();
  await ULogin(requestJSON.username, t);

  const jwt = await create({
    typ: "JWT",
    alg: settings.jwt.keyAlgStr as Algorithm,
  }, {
    name: requestJSON.username,
    iat: t,
    exp: getNumericDate(settings.jwt.tokenLifetime),
  }, await getJWTKey());

  ctx.response.body = jwt;
  ctx.response.status = 200;
  ctx.response.type = "application/json";
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
    return throwAPIError(ctx, "No body provided", 404);
  }

  const raw = await ctx.request.body();

  if (raw.type !== "json") {
    return throwAPIError(ctx, "Invalid content type", 400);
  }

  const requestJSON = await raw.value;

  if (!requestJSON.password || !requestJSON.username) {
    return throwAPIError(
      ctx,
      "Either the username or password is missing.",
      400,
    );
  }
  // Test if username is safe to use.
  // Should the parameter be in `settings.ts`? Beats me.
  if (!/^[A-Za-z0-9_]{1,24}$/.test(requestJSON.username)) {
    return throwAPIError(ctx, "Provided username not acceptable.", 400);
  }
  // Check if the username is already taken.
  const notTaken = await UCheck(requestJSON.username);

  if (!notTaken) {
    return throwAPIError(ctx, "Username already taken.", 400);
  }

  // Now we can get the actual user creation started, yes?
  // Use default things to put into user account here..

  // TODO: Add some error handling here.
  const destDir = `${settings.staticFileDir}/u/${requestJSON.username}`;
  await Deno.mkdir(destDir, { recursive: true }); // auto-create `/static/u/`
  await Deno.copyFile(
    `${settings.staticFileDir}/defs/avatar.png`,
    `${destDir}/avatar.png`,
  );
  await Deno.copyFile(
    `${settings.staticFileDir}/defs/banner.png`,
    `${destDir}/banner.png`,
  );

  const userStatic = `${settings.siteURL}/m/u/${requestJSON.username}`;

  const avatar = `${userStatic}/avatar.png`;
  const banner = `${userStatic}/banner.png`;

  const userAPI = `${settings.siteURL}/u/${requestJSON.username}`;
  const keys = await genKeyPair();

  const actorInfo = actorObj({
    "actor": userAPI,
    "following": `${userAPI}/following`,
    "followers": `${userAPI}/followers`,
    "liked": `${userAPI}/likes`,
    "inbox": `${userAPI}/inbox`,
    "outbox": `${userAPI}/outbox`,
    "name": requestJSON.username,
    "summary": "",
    "icon": [
      avatar,
    ],
    "banner": banner,
    "keyURL": `${userAPI}/main-key`,
    "key": keys[0],
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
    keys: keys,
  });

  ctx.response.body = {
    "msg": `User ${requestJSON.username} created`,
  };
  ctx.response.type = "application/json";
  ctx.response.status = 201;
});
