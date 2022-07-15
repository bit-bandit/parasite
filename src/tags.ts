import { Context, Router } from "https://deno.land/x/oak/mod.ts";
import { genOrderedCollection } from "./activity.ts";
import { getJSONfromTags } from "./db.ts";

export const tags = new Router();

tags.get("/i/:tag", async function (ctx: Context) {
  let out = await getJSONfromTags(ctx.request.url);

  for (let i in out) {
    out[i] = out[i][0].id;
  }

  ctx.response.body = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": ctx.request.url,
    "type": "Collection",
    "totalItems": out.length,
    "items": out,
  };
  ctx.response.type = "application/activity+json";
});

/*
SELECT json FROM torrents WHERE json->>'tag' ? 'http://localhost:8080/i/action';

SELECT json FROM torrents WHERE json #> '{ tag: ["http://localhost:8080/i/action"]}';

SELECT json
FROM   torrents r, json_array_elements(r.json#>'{tags}') obj
WHERE  obj->>'src' = 'foo.png';

SELECT json FROM torrents WHERE json ->> 'tag' = '["http://localhost:8080/i/action","http://localhost:8080/i/adventure","http://localhost:8080/i/fantasy"]';
*/
