import { Router } from "https://deno.land/x/oak/mod.ts";
import { deleteComment, getCommentJSON } from "./db.ts";
import { isValid } from "./auth.ts";
import { authData, genUUID, throwAPIError } from "./utils.ts";

export let comments = new Router();

function boilerplateDeleteStatement(ctx: Context) {
  ctx.response.body = { "msg": `Torrent ${ctx.params.id} deleted` };
  ctx.response.status = 200;
  ctx.response.type = "application/json";
}

function boilerplateCommentGet(ctx: Context, res: any) {
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
  const res = await getCommentReplies(ctx.params.id, "replies");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/activity", async function (ctx) {
  const res = await getCommentReplies(ctx.params.id, "activity");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/likes", async function (ctx) {
  const res = await getCommentReplies(ctx.params.id, "likes");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/dislikes", async function (ctx) {
  const res = await getCommentReplies(ctx.params.id, "dislikes");
  await boilerplateCommentGet(ctx, res);
});

comments.get("/c/:id/flags", async function (ctx) {
  const res = await getCommentReplies(ctx.params.id, "flags");
  await boilerplateCommentGet(ctx, res);
});

comments.post("/c/:id", async function (ctx) {
  const data = await authData(ctx);
  let requestJSON = data.request;

  const userInfo = await getUMetaInfo(data.decoded.name);

  const userActivity = await getUActivity(data.decoded.name, "info");

  const userRole = userInfo[2];

  let cData: any[] = [];
  const d = new Date();

  try {
    cData = await getCommentJSON(ctx.params.id, "json, uploader");
  } catch {
    return throwAPIError(ctx, "Torrent doesn't exist.", 400);
  }

  switch (requestJSON.type) {
    case "Create": {
      const id: string = await genUUID(14);
      const url = `${settings.siteURL}/c/${id}`;

      const comment = genReply({
        "id": url,
        "actor": userActivity.id,
        "published": d.toISOString(),
        "content": marked.parse(requestJSON.content),
        "inReplyTo": cData[0].id,
      });

      const activity = wrapperCreate({
        "id": `${url}/activity`,
        "actor": comment.attributedTo,
        "object": comment,
      });

      await addToDB("comments", {
        "id": id,
        "json": comment,
        "activity": activity,
        "uploader": data.decoded.name,
        "likes": genOrderedCollection(`${url}/likes`),
        "dislikes": genOrderedCollection(`${url}/dislikes`),
        "replies": genOrderedCollection(`${url}/r`),
        "flags": genOrderedCollection(`${url}/flags`),
      }, ctx.params.id);

      const userOutbox = await getUActivity(data.decoded.name, "outbox");

      userOutbox.orderedItems.push(activity);
      userOutbox.totalItems = userOutbox.orderedItems.length;

      await basicObjectUpdate("users", {
        "outbox": userOutbox,
      }, data.decoded.name);

      ctx.response.body = {
        "msg": `Comment ${id} added to Torrent ${ctx.params.id}`,
      };
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", url);
      break;
    }
    case "Like": {
      // Same as above, but with dislikes instead of likes.
      if (!userRole.vote) {
        return throwAPIError(ctx, "Voting not allowed", 400);
      }
      const userLikes = await getUActivity(data.decoded.name, "likes");
      const CommentLikes = (await getCommentJSON(ctx.params.id, "dislikes"))[0];

      if (userLikes.orderedItems.includes(cData[0].id)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }
      userLikes.orderedItems.push(cData[0].id);
      userLikes.totalItems = userLikes.orderedItems.length;

      commentLikes.orderedItems.push(userActivity.id);
      commentLikes.totalItems = commentLikes.orderedItems.length;

      await basicObjectUpdate("users", {
        "likes": userLikes,
      }, data.decoded.name);

      await basicObjectUpdate("comments", {
        "likes": commentLikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Comment ${ctx.params.id} added to dislikes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", userActivity.liked);
      break;
    }

    case "Dislike": {
      // Same as above, but with dislikes instead of likes.
      if (!userRole.vote) {
        return throwAPIError(ctx, "Voting not allowed", 400);
      }
      const userDislikes = await getUActivity(data.decoded.name, "dislikes");
      const CommentDislikes =
        (await getCommentJSON(ctx.params.id, "dislikes"))[0];

      if (userDislikes.orderedItems.includes(cData[0].id)) {
        throwAPIError(ctx, "Already voted on item", 400);
        break;
      }
      userDislikes.orderedItems.push(cData[0].id);
      userDislikes.totalItems = userDislikes.orderedItems.length;

      commentDislikes.orderedItems.push(userActivity.id);
      commentDislikes.totalItems = torrentDislikes.orderedItems.length;

      await basicObjectUpdate("users", {
        "dislikes": userDislikes,
      }, data.decoded.name);

      await basicObjectUpdate("comments", {
        "dislikes": commentDislikes,
      }, ctx.params.id);

      ctx.response.body = {
        "msg": `Comment ${ctx.params.id} added to dislikes collection`,
      };
      // TODO: Actually add federation support.
      ctx.response.status = 201;
      ctx.response.type =
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';
      ctx.response.headers.set("Location", userActivity.liked);
      break;
    }
    case "Update": {
      if (
        cData[1] !== data.decoded.name ||
        !userRole.editUploads
      ) {
        return throwAPIError(ctx, "Not allowed to edit comment", 400);
      }

      if (requestJSON.content) {
        cData[0].content = marked.parse(requestJSON.content);
      }

      cData[0].updated = d.toISOString();

      const activity = wrapperUpdate({
        "id": `${tData[0].id}/activity`,
        "actor": cData[0].attributedTo,
        "object": cData[0],
        "published": cData[0].published,
      });

      await basicObjectUpdate("comments", {
        "activity": activity,
        "json": cData[0],
      }, `${ctx.params.id}`);

      ctx.response.body = { "msg": `Torrent ${ctx.params.id} updated` };
      ctx.response.status = 200;
      ctx.response.type = "application/json";

      break;
    }
    case "Remove":
    case "Delete": {
      if (!userRole.deleteOwnComments || cData[1] !== data.decoded.name) {
        throwAPIError(ctx, "You aren't allowed to delete this comment", 400);
      } else if (
        userRole.deleteOthersComments
      ) {
        await deleteComment(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      } else {
        await deleteComment(ctx.params.id);
        boilerplateDeleteStatement(ctx);
      }
      break;
    }
    default: {
      throwAPIError(ctx, "Invalid activity type", 400);
    }
  }
});
