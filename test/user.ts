import { assertEquals } from "https://deno.land/std@0.144.0/testing/asserts.ts";

const data = { "username": "bob", "password": "subgenius" };
const data2 = { "username": "larvae", "password": "wormswormsworm" };

Deno.test("User registration", async () => {
  const expOut: string = JSON.stringify({ msg: "User bob created" });

  const r = await fetch("http://0.0.0.0:8080/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const re = await r.json();
  const res = JSON.stringify(re);

  assertEquals(res, expOut);
});

Deno.test("Attempted user registration on preexisting account", async () => {
  const expOut: string = JSON.stringify({
    err: true,
    msg: "Username already taken.",
  });

  const r = await fetch("http://0.0.0.0:8080/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const re = await r.json();
  const res = JSON.stringify(re);

  assertEquals(res, expOut);
});

Deno.test("Follow account", async () => {
  let c = await fetch("http://0.0.0.0:8080/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data2),
  });

  await c.json();

  const tokenRequest = await fetch("http://0.0.0.0:8080/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data2),
  });

  const userJWT = await tokenRequest.text();

  const followAttempt = await fetch("http://localhost:8080/x/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      "object": "http://localhost:8080/u/bob",
    }),
  });

  const res = await followAttempt.json();
  assertEquals(res.type, "Accept");
});
