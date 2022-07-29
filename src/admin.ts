import { Context, Router } from "https://deno.land/x/oak/mod.ts";

import {
  basicObjectUpdate,
  deleteComment,
  deleteList,
  deleteTorrent,
  getUActivity,
  getUMetaInfo,
} from "./db.ts";

import {
  authData,
  genUUID,
  checkInstanceBlocked,
  throwAPIError,
} from "./utils.ts";

import { settings } from "../settings.ts";
import { roles } from "../roles.ts";

export const admin = new Router();

// Add instance
admin.post("/a/federate", async function (ctx: Context) {
  // expected HTTP payload:
  // {
  //   type: "Ban" | "Unban" | "Pool",
  //   range: "User" | "Instance",
  //   id: "https://www.example.com/"
  // }

  const data = await authData(ctx);
  const requestJSON = data.request;

  if (
    requestJSON.range === undefined ||
    requestJSON.id === undefined
  ) {
    return throwAPIError(ctx, "Invalid data", 400);
  }

  const requesterRole = await getUActivity(data.decoded.name, "roles");
  const targetURL = new URL(requestJSON.id);

  if (!requesterRole.manageFederation) {
    return throwAPIError(
      ctx,
      "Not permitted to manage federation settings",
      400,
    );
  }

  // TODO: Make this shit persistant.
  switch (requestJSON.type) {
    case ("Ban"): {
      const u = new URL(requestJSON.id);

      if (
        settings.federationParams.blocked.includes(u.host) ||
        settings.federationParams.blocked.includes(u.href)
      ) {
        return throwAPIError(ctx, "Item already banned", 400);
      }

      settings.federationParams.blocked.push(u.origin);
      ctx.response.body = {
        "msg": `'${u.href}' banned.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case ("Unban"): {
      const u = new URL(requestJSON.id);
      if (
        !settings.federationParams.blocked.includes(u.host) ||
        !settings.federationParams.blocked.includes(u.href)
      ) {
        return throwAPIError(ctx, "Item not banned", 400);
      }

      // There really shouldn't be two of this, but whatever.
      const hrefIndex = userLikes.orderedItems.indexOf(u.href);
      const hostIndex = userLikes.orderedItems.indexOf(u.host);

      // Yuck.
      if (hrefIndex !== -1) {
        settings.federationParams.blocked.splice(hrefIndex, 1);
      } else if (hostIndex !== -1) {
        settings.federationParams.blocked.splice(hostIndex, 1);
      }
      ctx.response.body = {
        "msg": `'${u.href}' unbanned.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case ("Pool"): {
      if (requestJSON.range === "User") {
        return throwAPIError(ctx, "Cannot pool with individual user", 400);
      }

      const u = new URL(requestJSON.id);
      settings.federationParams.pooled.push(u.origin);
      ctx.response.body = {
        "msg": `'${u.href}' pooled.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    default: {
      return throwAPIError(ctx, "Invalid type", 400);
    }
  }
});

// Reassign user role - Via URL
admin.post("/a/reassign", async function (ctx: Context) {
  /**
    expected HTTP payload (Not including headers):
    {
      id: "https://www.example.com/u/bill",
      role: "Role"
    }
  */

  const data = await authData(ctx);
  const requestJSON = data.request;

  const requesterRole = await getUActivity(data.decoded.name, "roles");
  const targetURL = new URL(requestJSON.id);

  if (targetURL.origin !== settings.siteURL) {
    return throwAPIError(
      ctx,
      "You can't assign roles to users outside of your local instance",
      400,
    );
  }

  if (requesterRole.assignableRoles.length === 0) {
    return throwAPIError(ctx, "You can't assign roles", 400);
  }

  if (!requesterRole.assignableRoles.includes(requestJSON.role)) {
    return throwAPIError(ctx, "You can't assign the specified role", 400);
  }

  if (!roles[requestJSON.role]) {
    return throwAPIError(ctx, `Role '${requestJSON.role}' does not exist`, 400);
  }
  // I should probably do something better than this...
  const targetUsername = targetURL.pathname.split("/")[2];

  const targetRole = await getUActivity(targetUsername, "roles");

  // This blows but it's as far as I'm gonna go with this at the moment.
  if (JSON.stringify(targetRole) === JSON.stringify(roles[requestJSON.role])) {
    return throwAPIError(
      ctx,
      `User '${targetUsername}' already has role '${requestJSON.role}'`,
      400,
    );
  }

  await basicObjectUpdate("users", {
    "roles": roles[requestJSON.role],
  }, targetUsername);

  ctx.response.body = {
    "msg":
      `User '${targetUsername}' role successfully changed to '${requestJSON.role}'`,
  };
  ctx.response.type = "application/json";
  ctx.response.status = 200;
});

// Delete object via URL specified
// This really is just a glorified interface
// to make deleting objects easier, if sending
// a POST request w/ the `remove` type was somehow
// too difficult...
admin.post("/a/delete", async function (ctx: Context) {
  /**
    expected HTTP payload (Not including headers):
    {
      id: "https://www.example.com/p/298402",
    }
  */
  const data = await authData(ctx);
  const requestJSON = data.request;

  const requesterRole = await getUActivity(data.decoded.name, "roles");
  const targetURL = new URL(requestJSON.id);

  if (targetURL.origin !== settings.siteURL) {
    return throwAPIError(
      ctx,
      "You can't delete content outside of your local instance",
      400,
    );
  }

  const targetType = targetURL.pathname.split("/")[1];
  const targetID = targetURL.pathname.split("/")[2];

  switch (targetType) {
    case "t": {
      if (!requesterRole.deleteAnyTorrents) {
        return throwAPIError(ctx, "Deletion not permitted", 400);
      }
      await deleteTorrent(targetID);

      ctx.response.body = {
        "msg": `'${requestJSON.id}' deleted.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case "l": {
      if (!requesterRole.deleteAnyLists) {
        return throwAPIError(ctx, "Deletion not permitted", 400);
      }
      await deleteList(targetID);

      ctx.response.body = {
        "msg": `'${requestJSON.id}' deleted.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case "c": {
      if (!requesterRole.deleteAnyComments) {
        return throwAPIError(ctx, "Deletion not permitted", 400);
      }
      await deleteComment(targetID);

      ctx.response.body = {
        "msg": `'${requestJSON.id}' deleted.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    default: {
      throwAPIError(ctx, "Invalid content type", 400);
    }
  }
});
