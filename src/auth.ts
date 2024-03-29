import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt/mod.ts";
import { Algorithm } from "https://deno.land/x/djwt/algorithm.ts";
import * as scrypt from "https://deno.land/x/scrypt@v4.2.1/mod.ts";
import { getUActivity, UCheck, UInit, ULogin } from "./db.ts";
import { throwAPIError, writeFile } from "./utils.ts";
import { settings } from "../settings.ts";
import { actorObj, genOrderedCollection } from "./activity.ts";
import { roles } from "../roles.ts";
import { genKeyPair, getJWTKey } from "./crypto.ts";

// This file is comprised of two sections:
// 1. Functions used to validate users within the system.
// 2. Routing for letting users register, or log into accounts.

/**
 * Validate user provided is same as in token.
 * @param user Provided username.
 * @param token JWT Token provided by request.
 */
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

  const role = await getUActivity(requestJSON.username, "roles");

  if (!role.login) {
    return throwAPIError(ctx, "Not permitted to login.", 400);
  }

  const pass = await getUActivity(requestJSON.username, "pass");

  if (pass.err) {
    ctx.response.body = info;
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  if (!await scrypt.verify(requestJSON.password, pass)) {
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
  ctx.response.type = "text/plain";
});

auth.post("/register", async function (ctx) {
  // Create new user.

  if (!settings.allowRegistrations) {
    return throwAPIError(ctx, "Registrations not allowed.", 404);
  }

  if (!ctx.request.hasBody) {
    return throwAPIError(ctx, "No body provided.", 404);
  }

  const raw = await ctx.request.body();

  if (raw.type !== "json") {
    return throwAPIError(ctx, "Invalid content type - Must be JSON.", 400);
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
    return throwAPIError(ctx, "Provided username unacceptable.", 400);
  }
  // Check if the username is already taken.
  const notTaken = await UCheck(requestJSON.username);

  if (!notTaken) {
    return throwAPIError(ctx, "Username already taken.", 400);
  }

  // Now we can get the actual user creation started, yes?
  // Use default things to put into user account here..

  // TODO: Add some error handling here.
  const dest = `u/${requestJSON.username}`;

  console.log(settings.userDefaults.avatar);
  const defaultAvatar = await Deno.readFile(settings.userDefaults.avatar);
  const defaultBanner = await Deno.readFile(settings.userDefaults.banner);

  await writeFile(`${dest}/avatar.png`, defaultAvatar);
  await writeFile(`${dest}/banner.png`, defaultBanner);

  const userStatic = `${settings.siteURL}/m/u/${requestJSON.username}`;

  const userURL = `${settings.siteURL}/u/${requestJSON.username}`;
  const keys = await genKeyPair();

  const actorInfo = actorObj({
    "actor": userURL,
    "following": `${userURL}/following`,
    "followers": `${userURL}/followers`,
    "liked": `${userURL}/likes`,
    "inbox": `${userURL}/inbox`,
    "outbox": `${userURL}/outbox`,
    "name": requestJSON.username,
    "preferredUsername": requestJSON.username,
    "summary": settings.userDefaults.bio,
    "icon": {
      "mediaType": "image/png",
      "type": "Image",
      "url": `${userStatic}/avatar.png`,
    },
    "banner": {
      "type": "Image",
      "mediaType": "image/png",
      "url": `${userStatic}/banner.png`,
    },
    "keyURL": `${userURL}/main-key`,
    "key": keys[0],
  });

  await UInit({
    id: requestJSON.username,
    info: actorInfo,
    pass: await scrypt.hash(requestJSON.password),
    roles: roles[settings.userDefaults.role],
    inbox: genOrderedCollection(`${userURL}/inbox`),
    outbox: genOrderedCollection(`${userURL}/outbox`),
    likes: genOrderedCollection(`${userURL}/likes`),
    dislikes: genOrderedCollection(`${userURL}/dislikes`),
    following: genOrderedCollection(`${userURL}/following`),
    followers: genOrderedCollection(`${userURL}/followers`),
    logins: [], // Tokens will be added next time user logs in. See `/login/`.
    keys: keys,
  });

  ctx.response.body = {
    "msg": `User ${requestJSON.username} created`,
  };
  ctx.response.type = "application/json";
  ctx.response.status = 201;
});
