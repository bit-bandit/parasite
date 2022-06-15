import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  create,
  decode,
  verify,
} from "https://deno.land/x/djwt@$VERSION/mod.ts";
import { getULoginInfo, getUMetaInfo, UCheck, Uinit, ULogin } from "./db.ts";
import { hashPass } from "./utils.ts";
import { settings } from "../settings.ts";
import { actorObj, genOrderedCollection } from "./activity.ts";
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
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid content type",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
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
    ctx.response.body = {
      "err": true,
      "msg": "invalid credentials",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
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
    ctx.response.body = {
      "err": true,
      "msg": "No body provided",
    };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }

  let raw = await ctx.request.body();

  if (raw.type !== "json") {
    ctx.response.body = {
      "err": true,
      "msg": "Invalid content type",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
  }

  let requestJSON = await raw.value();

  if (!requestJSON.password || !requestJSON.username) {
    ctx.response.body = {
      "err": true,
      "msg": "No password or username field entered.",
    };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
  }

  // Check if the username is already taken.
  const notTaken = await UCheck(requestJSON.username);

  if (!notTaken) {
    ctx.response.body = {
      "err": true,
      "msg": "Username already taken.",
    };
    ctx.response.status = 400;
    ctx.respone.type = "application/json";
  }

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

  const avatar = `${siteURL}/m/u/${requestJSON.username}/avatar.png`;
  const banner = `${siteURL}/m/u/${requestJSON.username}/avatar.png`;

  const actorInfo = actorObj({
    "id": `${settings.siteURL}/u/${requestJSON.username}/inbox`,
    "following": `${settings.siteURL}/u/${requestJSON.username}/following`,
    "followers": `${settings.siteURL}/u/${requestJSON.username}/followers`,
    "liked": `${settings.siteURL}/u/${requestJSON.username}/liked`,
    "inbox": `${settings.siteURL}/u/${requestJSON.username}/inbox`,
    "outbox": `${settings.siteURL}/u/${requestJSON.username}/outbox`,
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
    roles: JSON.stringify(["user"]),
    inbox: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/inbox`,
      ),
    ),
    outbox: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/outbox`,
      ),
    ),
    likes: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/likes`,
      ),
    ),
    dislikes: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/dislikes`,
      ),
    ),
    follwing: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/following`,
      ),
    ),
    followers: JSON.stringify(
      genOrderedCollection(
        `${settings.siteURL}/u/${requestJSON.username}/followers`,
      ),
    ),
    logins: JSON.stringify([]), // Tokens will be added next time user logs in. See `/login/`.
    registered: Date.now(),
  });

  ctx.response.body = {
    "msg": "User ${requestJSON.username} created",
  };
  ctx.response.type = "application/json";
  ctx.response.status = 201;
});
