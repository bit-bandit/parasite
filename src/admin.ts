import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import instances from "../federation.json" assert { type: "json" };

import { getJWTKey } from "./crypto.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";

import {
  basicObjectUpdate,
  deleteComment,
  deleteList,
  deleteTorrent,
  deleteUser,
  getUActivity,
} from "./db.ts";

import { authData, throwAPIError } from "./utils.ts";

import { settings } from "../settings.ts";
import { roles } from "../roles.ts";

export const admin = new Router();

// Sanity check
admin.get("/a", async function (ctx: Context) {
  if (!ctx.request.headers.has("Authorization")) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }

  const rawAuth = await ctx.request.headers.get("Authorization");

  const auth = rawAuth.split(" ")[1];

  if (!auth) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }

  const decodedAuth = await verify(auth, await getJWTKey());

  const requesterRole = await getUActivity(decodedAuth.name, "roles");

  if (!requesterRole.adminAPI) {
    return throwAPIError(
      ctx,
      "Admin access not granted",
      405,
    );
  }

  ctx.response.body = {
    "msg": "Admin access is granted.",
  };
  ctx.response.type = "application/json";
});

// Add/Delete instance
admin.post("/a/federate", async function (ctx: Context) {
  // expected HTTP payload:
  // {
  //   type: "Block" | "Unblock" | "Pool" | "Unpool",
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

  if (!requesterRole.manageFederation) {
    return throwAPIError(
      ctx,
      "Not permitted to manage federation settings",
      400,
    );
  }

  switch (requestJSON.type) {
    case ("Block"): {
      const u = new URL(requestJSON.id);

      if (
        instances.blocked.includes(u.host) ||
        instances.blocked.includes(u.href)
      ) {
        return throwAPIError(ctx, "Item already blocked", 400);
      }

      if (requestJSON.range === "User") {
        instances.blocked.push(u.href);
      } else {
        instances.blocked.push(u.origin);
      }

      // We don't need the formatting, but we'll do it anyways.
      await Deno.writeTextFile(
        "../federation.json",
        JSON.stringify(instances, null, 2),
      );

      ctx.response.body = {
        "msg": `'${u.href}' blocked.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case ("Unblock"): {
      const u = new URL(requestJSON.id);

      if (requestJSON.range === "User") {
        if (!instances.blocked.includes(u.href)) {
          return throwAPIError(ctx, "Item not blocked", 400);
        }
      } else {
        if (!instances.blocked.includes(u.host)) {
          return throwAPIError(ctx, "Item not blocked", 400);
        }
      }

      // There really shouldn't be two of this, but whatever.
      const hrefIndex = instances.blocked.indexOf(u.href);
      const hostIndex = instances.blocked.indexOf(u.host);

      // Yuck.
      if (hrefIndex !== -1) {
        instances.blocked.splice(hrefIndex, 1);
      } else if (hostIndex !== -1) {
        instances.blocked.splice(hostIndex, 1);
      }

      await Deno.writeTextFile(
        "../federation.json",
        JSON.stringify(instances, null, 2),
      );

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

      if (instances.pooled.includes(u.origin)) {
        return throwAPIError(ctx, "Instance already pooled.", 400);
      }

      instances.pooled.push(u.origin);
      await Deno.writeTextFile(
        "../federation.json",
        JSON.stringify(instances, null, 2),
      );

      ctx.response.body = {
        "msg": `'${u.origin}' pooled.`,
      };
      ctx.response.type = "application/json";
      ctx.response.status = 200;
      break;
    }
    case ("Unpool"): {
      const u = new URL(requestJSON.id);
      if (!instances.pooled.includes(u.origin)) {
        return throwAPIError(ctx, "Item not pooled", 400);
      }

      const hrefIndex = instances.pooled.indexOf(u.origin);

      instances.pooled.splice(hrefIndex, 1);

      await Deno.writeTextFile(
        "../federation.json",
        JSON.stringify(instances, null, 2),
      );

      ctx.response.body = {
        "msg": `'${u.origin}' unpooled.`,
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

admin.get("/a/roles", async function (ctx: Context) {
  if (!ctx.request.headers.has("Authorization")) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }

  const rawAuth = await ctx.request.headers.get("Authorization");

  const auth = rawAuth.split(" ")[1];

  if (!auth) {
    return throwAPIError(ctx, "No authorization provided", 401);
  }

  const decodedAuth = await verify(auth, await getJWTKey());

  const requesterRole = await getUActivity(decodedAuth.name, "roles");

  if (!requesterRole.adminAPI) {
    return throwAPIError(
      ctx,
      "Not permitted to view this information",
      400,
    );
  }

  ctx.response.body = roles;
  ctx.response.type = "application/json";
  ctx.response.status = 200;
});

// Reassign user role - Via URL
admin.post("/a/reassign", async function (ctx: Context) {
  /*
    expected HTTP payload (Not including headers):
    {
      id: "bill",
      role: "Role"
    }
  */

  const data = await authData(ctx);
  const requestJSON = data.request;

  const requesterRole = await getUActivity(data.decoded.name, "roles");

  if (requesterRole.assignableRoles.length === 0) {
    return throwAPIError(ctx, "You can't assign roles", 400);
  }

  if (!requesterRole.assignableRoles.includes(requestJSON.role)) {
    return throwAPIError(ctx, "You can't assign the specified role", 400);
  }

  if (!roles[requestJSON.role]) {
    return throwAPIError(ctx, `Role '${requestJSON.role}' does not exist`, 400);
  }

  const targetRole = await getUActivity(requestJSON.id, "roles");

  // This blows but it's as far as I'm gonna go with this at the moment.
  if (JSON.stringify(targetRole) === JSON.stringify(roles[requestJSON.role])) {
    return throwAPIError(
      ctx,
      `User '${requestJSON.id}' already has role '${requestJSON.role}'`,
      400,
    );
  }

  await basicObjectUpdate("users", {
    "roles": roles[requestJSON.role],
  }, requestJSON.id);

  ctx.response.body = {
    "msg":
      `User '${requestJSON.id}' role successfully changed to '${requestJSON.role}'`,
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

  if (
    targetURL.origin !== settings.siteURL &&
    targetURL.origin !== settings.frontendURL
  ) {
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
    case "u": {
      if (!requesterRole.deleteUsers) {
        return throwAPIError(ctx, "Deletion not permitted", 400);
      }
      await deleteUser(targetID);
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
