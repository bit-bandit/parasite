import { Context, Router } from "https://deno.land/x/oak/mod.ts";

import {
  basicObjectUpdate,
  getUActivity,
  getUMetaInfo,
  deleteTorrent,
  deleteList,
  deleteComment,  
} from "./db.ts";

import {
  authData,
  genUUID,
  isBlockedInstance,
  throwAPIError,
} from "./utils.ts";

import { settings } from "../settings.ts";
import { roles } from "../roles.ts";

export const admin = new Router();

// Add instance
admin.post('/a/federate/', async function(ctx: Context){
    // Ban API:
    // type: "Ban" | "Unban",
    // range: "User" | "Instance",
    // id: string
    // if instance:
    //   add to 'banned'
});

// Reassign user role - Via URL
admin.post('/a/reassign', async function(ctx: Context){
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
  const targetURL = new URL(requestJSON.id)

    if (targetURL.origin !== settings.siteURL) {
	return throwAPIError(ctx, "You can't assign roles to users outside of your local instance", 400);
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
  const targetUsername = targetURL.pathname.split('/')[2]
    
  const targetRole = await getUActivity(targetUsername, "roles");

  // This blows but it's as far as I'm gonna go with this at the moment.
  if (JSON.stringify(targetRole) === JSON.stringify(roles[requestJSON.role])) {
    return throwAPIError(ctx, `User '${targetUsername}' already has role '${requestJSON.role}'`, 400);
  }

  await basicObjectUpdate("users", {
    "roles": roles[requestJSON.role],
  }, targetUsername);

  ctx.response.body = {
      "msg": "User '${targetUsername}' role successfully changed to '${requestJSON.role}'"
  };
  ctx.response.type = 'application/json';
  ctx.response.status = 200;
});

// Delete object via URL specified
// This really is just a glorified interface
// to make deleting objects easier, if sending
// a POST request w/ the `remove` type was somehow
// too difficult...
admin.post('/a/delete/', async function(ctx: Context){
  /**
    expected HTTP payload (Not including headers):
    {
      id: "https://www.example.com/p/298402",
      type: "Torrent" | "List" | "Comment"
    }
  */
  const data = await authData(ctx);
  const requestJSON = data.request;

  const requesterRole = await getUActivity(data.decoded.name, "roles");
  const targetURL = new URL(requestJSON.id)

  const targetURL = new URL(requestJSON.id)

  if (targetURL.origin !== settings.siteURL) {
	return throwAPIError(ctx, "You can't delete content outside of your local instance", 400);
  }

  const targetID = targetURL.pathname.split('/')[2]
    
  switch (requestJSON.type) {
    case "Torrent" {
        await deleteTorrent(targetID)	  	  
	break;
    }
    case "List" {
        await deleteList(targetID)	  	  
	break;
    }
    case "Comment" {
        await deleteComment(targetID)	  
	break;
    }
    default: {
      throwAPIError(ctx, "Invalid content type", 400);
    }
  }
});
