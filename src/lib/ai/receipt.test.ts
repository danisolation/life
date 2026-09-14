import assert from "node:assert/strict";
import { test } from "node:test";
import { RECEIPT_PROMPT, parseReceiptResponse } from "./receipt.ts";

const today = "2026-09-14";

test("reads a clean JSON answer", () => {
  const draft = parseReceiptResponse(
    '{"amount":"125000","date":"2026-09-12","merchant":"Highlands Coffee","kind":"expense"}',
    "VND",
    today
  );

  assert.deepEqual(draft, {
    amount: "125000",
    occurredOn: "2026-09-12",
    note: "Highlands Coffee",
    kind: "expense",
  });
});

test("survives markdown fences and extra prose", () => {
  const fenced = '```json\n{"amount":"48000","merchant":"Circle K"}\n```';
  assert.equal(parseReceiptResponse(fenced, "VND", today)?.amount, "48000");
});

test("accepts separators the model should not have used", () => {
  assert.equal(
    parseReceiptResponse('{"amount":"1.250.000","merchant":"Big C"}', "VND", today)?.amount,
    "1.250.000"
  );
});

test("falls back to today when the date is missing or nonsense", () => {
  assert.equal(
    parseReceiptResponse('{"amount":"50000","merchant":"X"}', "VND", today)?.occurredOn,
    today
  );
  assert.equal(
    parseReceiptResponse('{"amount":"50000","date":"12/09/2026","merchant":"X"}', "VND", today)
      ?.occurredOn,
    today
  );
});

test("refuses anything it cannot turn into a real amount", () => {
  assert.equal(parseReceiptResponse("", "VND", today), null);
  assert.equal(parseReceiptResponse("not json at all", "VND", today), null);
  assert.equal(parseReceiptResponse('{"merchant":"X"}', "VND", today), null);
  assert.equal(parseReceiptResponse('{"amount":"","merchant":"X"}', "VND", today), null);
  assert.equal(parseReceiptResponse('{"amount":"abc","merchant":"X"}', "VND", today), null);
  assert.equal(parseReceiptResponse('{"amount":"0","merchant":"X"}', "VND", today), null);
  assert.equal(parseReceiptResponse("[1,2,3]", "VND", today), null);
});

test("defaults to an expense and trims a long merchant name", () => {
  const draft = parseReceiptResponse(
    `{"amount":"90000","merchant":"${"x".repeat(300)}"}`,
    "VND",
    today
  );
  assert.equal(draft?.kind, "expense");
  assert.equal(draft?.note.length, 200);
});

test("the prompt pins the two things that matter", () => {
  assert.match(RECEIPT_PROMPT, /digits only/);
  assert.match(RECEIPT_PROMPT, /Never guess an amount/);
});
