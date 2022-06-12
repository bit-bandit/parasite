import { hash, verify } from "https://deno.land/x/argon2/lib/mod.ts";

export async function hashPass(pass: string) {
  const enc = new TextEncoder().encode(
    `${pass.length}${pass.split("").reverse().join("")}${
      pass.length * (pass.length * pass.length)
    }`,
  );
  const buff = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buff));
  const res = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  return res;
}

export function genTorrentID() {
  return crypto.randomUUID().split("-").join("").slice(20);
}

export function genListID(title: string) {
  // dear god.
  return `${
    encodeURIComponent(
      title.split(" ")
        .slice(0, 3)
        .join("")
        .slice(0, 15),
    )
  }-${
    crypto.randomUUID()
      .split("-")
      .join("")
      .slice(20)
  }`;
}

export function genCommentID(inReplyTo: string) {
  return `${inReplyTo}-${crypto.randomUUID().split("-").join("").slice(20)}`;
}
