import { Router } from "https://deno.land/x/oak/mod.ts";
import {
  extractKey,
  genHTTPSigBoilerplate,
  simpleVerify,
  str2ab,
} from "./crypto.ts";
import {
  basicObjectUpdate,
  deleteComment,
  getCommentJSON,
  getUActivity,
} from "./db.ts";
import { authData, checkInstanceBlocked, throwAPIError } from "./utils.ts";
import { wrapperUpdate } from "./activity.ts";

export const comments = new Router();

function boilerplateDeleteStatement(ctx: Context) {
  ctx.response.body = { "msg": `Torrent ${ctx.params.id} deleted` };
  ctx.response.status = 200;
  ctx.response.type = "application/json";
}

function boilerplateCommentGet(ctx: Context, res = {}) {
  if (!res.err) {
    ctx.response.body = res[0]; // Have to do this because `basicDataQuery` is designed to return arrays.
    ctx.response.status = 200;
    ctx.response.type =
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
  } else {
    throwAPIError(ctx, "Comment not found", 404);
    ctx.response.status = 404;
    ctx.response.type = "application/json";
  }
}

comments.get("/c/:id", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id);
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/r", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id, "replies");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/activity", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id, "activity");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/likes", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id, "likes");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/dislikes", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id, "dislikes");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/flags", async function (ctx) {
  const res = await getCommentJSON(ctx.params.id, "flags");
  await boilerplateCommentGet(ctx, res);
});

comments.post("/c/:id", async function (ctx) {
  const raw = await ctx.request.body();
  const requestJSON = await raw.value;

  let json, uploader;
  const d = new Date();

  try {
    [json, uploader] = await getCommentJSON(ctx.params.id, "json, uploader");
  } catch {
    return throwAPIError(ctx, "Torrent doesn't exist.", 400);
  }

  switch (requestJSON.type) {
    case "Create": {
      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host, ctx);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const commentReplies = await getCommentJSON(ctx.params.id, "replies");
      commentReplies[0].orderedItems.push(requestJSON.object.id);
      commentReplies[0].totalItems = commentReplies[0].orderedItems.length;

      await basicObjectUpdate("comments", {
        "replies": commentReplies[0],
      }, ctx.params.id);

      ctx.response.body = {
        "msg":
          `Reply ${requestJSON.object.id} added to comment ${ctx.params.id}`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);
      break;
    }
    case "Like": {
      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host, ctx);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const commentLikes = (await getCommentJSON(ctx.params.id, "likes"))[0];

      if (commentLikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      commentLikes.orderedItems.push(requestJSON.actor);
      commentLikes.totalItems = commentLikes.orderedItems.length;

      await basicObjectUpdate("comments", {
        "likes": commentLikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg":
          `${requestJSON.actor} added to comment ${ctx.request.url}'s like collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", ctx.request.url);
      break;
    }

    case "Dislike": {
      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host, ctx);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const commentDislikes =
        (await getCommentJSON(ctx.params.id, "dislikes"))[0];

      if (commentDislikes.orderedItems.includes(requestJSON.actor)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }

      commentDislikes.orderedItems.push(requestJSON.actor);
      commentDislikes.totalItems = commentDislikes.orderedItems.length;

      await basicObjectUpdate("comments", {
        "dislikes": commentDislikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg":
          `${requestJSON.actor} added to comment ${ctx.request.url}'s dislike collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", foreignActorInfo.likes);
      break;
    }
    case "Update": {
      const data = await authData(ctx);

      if (
        uploader !== data.decoded.name ||
        !userRole.editUploads
      ) {
        return throwAPIError(ctx, "Not allowed to edit comment", 400);
      }

      if (requestJSON.content) {
        json.content = marked.parse(requestJSON.content);
      }

      json.updated = d.toISOString();

      const activity = wrapperUpdate({
        "id": `${json.id}/activity`,
        "actor": json.attributedTo,
        "object": json,
        "published": json.published,
      });

      await basicObjectUpdate("comments", {
        "activity": activity,
        "json": json,
      }, `${ctx.params.id}`);

      ctx.response.body = { "msg": `Torrent ${ctx.params.id} updated` };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }
    case "Remove":
    case "Delete": {
      const data = await authData(ctx);

      const userRole = await getUActivity(data.decoded.name, "roles");

      if (!userRole.deleteOwnComments || uploader !== data.decoded.name) {
        return throwAPIError(
          ctx,
          "You aren't allowed to delete this comment",
          400,
        );
      } else if (
        userRole.deleteAnyComments
      ) {
        await deleteComment(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      } else {
        await deleteComment(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      }
      break;
    }
    case "Undo": {
      const externalActorURL = new URL(requestJSON.actor);
      checkInstanceBlocked(externalActorURL.host, ctx);

      const foreignActorInfo = await (await fetch(requestJSON.actor)).json();
      const foreignKey = await extractKey(
        "public",
        foreignActorInfo.publicKey.publicKeyPem,
      );

      const reqURL = new URL(ctx.request.url);

      const msg = genHTTPSigBoilerplate({
        "target": `post ${reqURL.pathname}`,
        "host": reqURL.host,
        "date": await ctx.request.headers.get("date"),
      });

      const parsedSig =
        /(.*)=\"(.*)\",?/mg.exec(await ctx.request.headers.get("Signature"))[2];

      const postSignature = str2ab(atob(parsedSig));

      const validSig = await simpleVerify(
        foreignKey,
        msg,
        postSignature,
      );

      if (!validSig) {
        return throwAPIError(ctx, "Invalid HTTP Signature", 400);
      }

      const commentLikes = (await getCommentJSON(ctx.params.id, "likes"))[0];
      const commentDislikes =
        (await getCommentJSON(ctx.params.id, "dislikes"))[0];

      if (
        !commentLikes.orderedItems.includes(requestJSON.actor) &&
        !commentDislikes.orderedItems.includes(requestJSON.actor)
      ) {
        throwAPIError(ctx, "No activity on item found", 400);
        break;
      }

      const likesIndex = commentLikes.orderedItems.indexOf(requestJSON.actor);
      const dislikesIndex = commentDislikes.orderedItems.indexOf(
        requestJSON.actor,
      );

      if (likesIndex !== -1) {
        commentLikes.orderedItems.splice(likesIndex, 1);
        commentLikes.totalItems = commentLikes.orderedItems.length;

        await basicObjectUpdate("comments", {
          "likes": commentLikes,
        }, ctx.params.id);
      }

      if (dislikesIndex !== -1) {
        commentDislikes.orderedItems.splice(likesIndex, 1);
        commentDislikes.totalItems = commentDislikes.orderedItems.length;

        await basicObjectUpdate("comments", {
          "dislikes": commentDislikes,
        }, ctx.params.id);
      }

      ctx.response.body = {
        "msg":
          `Actions by ${requestJSON.actor} on object ${ctx.request.url} undone`,
      };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }
    default: {
      throwAPIError(ctx, "Invalid activity type", 400);
    }
  }
});
