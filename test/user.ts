import { assertEquals } from "https://deno.land/std@0.144.0/testing/asserts.ts";

const data = { "username": "bob", "password": "subgenius" };

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

