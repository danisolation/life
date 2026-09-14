import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SESSION_SECRET = "test-secret-value";

const { signSession, verifySessionToken } = await import("./session-token.ts");

test("verifies a token it just signed", () => {
  const token = signSession("user-1");
  assert.deepEqual(verifySessionToken(token), { uid: "user-1" });
});

test("rejects a tampered payload", () => {
  const token = signSession("user-1");
  const [, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ uid: "user-2", exp: 9999999999 })).toString("base64url");
  assert.equal(verifySessionToken(`${forged}.${signature}`), null);
});

test("rejects garbage and expired tokens", () => {
  assert.equal(verifySessionToken("not-a-token"), null);
  assert.equal(verifySessionToken(""), null);
  const expired = signSession("user-1", Date.now() - 40 * 24 * 60 * 60 * 1000);
  assert.equal(verifySessionToken(expired), null);
});
