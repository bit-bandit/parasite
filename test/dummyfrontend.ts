// The following is a fake frontend application that
// will listen on port 8000, and forward all requests
// to the main Parasie API.
// This is dumb, but it's at least more lightweight
// for a testing environment than Caterpillar.
import { serve } from "https://deno.land/std/http/server.ts";

async function handler(
  req: Request,
) {
  const u = new URL((new URL(req.url)).pathname, "http://localhost:8080");

  const params = {
    method: req.method,
    headers: req.headers,
  };

  if (req.method !== "GET") {
    params.body = await req.text();
  }

  const res = await fetch(u.href, params);
  return res;
}

await serve(handler, { port: 8000 });
