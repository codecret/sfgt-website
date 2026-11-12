/** Run with: node --import tsx --test scripts/check-enquiry.ts. No network or emails. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CreateEmailResponse } from "resend";
import { createEnquirySchema } from "../src/features/contact/types";
import {
  createEnquiryHandler,
  createEnquiryLimiter,
} from "../src/features/contact/server/enquiry-handler";
import { sendEnquiryMessage } from "../src/features/contact/server/enquiry-message";
import { sendMxrouteMessage } from "../src/features/contact/server/enquiry-mxroute";
import {
  sendSmtpEnquiry,
  sendSmtpEnquiryStatus,
} from "../src/features/contact/server/enquiry-smtp";
import {
  createEnquirySubmission,
  enquiryReference,
} from "../src/features/contact/server/enquiry-submission";
import { enquiryAcknowledgement } from "../src/features/contact/server/enquiry-acknowledgement";
import { mergeEnquiryProduct } from "../src/features/contact/product-selection";
import { splitSupplierHomeContent } from "../src/features/landing/supplier-home-content";
import markup from "../src/features/landing/supplier-home-markup.json";

const values = {
  name: "Example Buyer",
  division: "toshiba" as const,
  email: "buyer@example.com",
  company: "Example Company",
  product: "AA batteries",
  quantity: "100 packs",
  destination: "Dubai",
  message: "Please provide a quotation for our order.",
  website: "",
};
const requestId = "0433f48d-81ab-4f73-8060-f461c694fe10";
const payload = { ...values, requestId };
const origin = "http://localhost:4318";

test("MXroute API sends to the fixed address with escaped text and a buyer reply link", async () => {
  const status = await sendMxrouteMessage(
    { server: "sunfire.mxrouting.net", username: "sales@example.com", password: "fake-password" },
    {
      from: "sales@example.com",
      to: "sales@example.com",
      subject: "Test enquiry",
      text: "First line\n<img src=x>&",
      replyTo: "buyer+test@example.com",
    },
    async (url, init) => {
      assert.equal(url, "https://smtpapi.mxroute.com/");
      assert.equal(init?.redirect, "manual");
      const mail = JSON.parse(String(init?.body));
      assert.equal(mail.to, "sales@example.com");
      assert.match(mail.body, /First line<br>&lt;img src=x&gt;&amp;/);
      assert.match(mail.body, /href="mailto:buyer%2Btest@example\.com"/);
      return Response.json({ success: true });
    }
  );
  assert.equal(status, "sent");
});

test("MXroute API only treats a clear rejection as a failed send", async () => {
  const credentials = { server: "sunfire.mxrouting.net", username: "sales@example.com", password: "fake-password" };
  const message = { from: "sales@example.com", to: "sales@example.com", subject: "Test", text: "Test body" };
  const reject = async () => Response.json({ success: false }, { status: 401 });
  const unavailable = async () => Response.json({ success: false }, { status: 503 });
  const redirect = async () => Response.redirect("https://example.com", 307);
  assert.equal(await sendMxrouteMessage(credentials, message, reject), "failed");
  assert.equal(await sendMxrouteMessage(credentials, message, unavailable), "unknown");
  assert.equal(await sendMxrouteMessage(credentials, message, redirect), "unknown");
});

function request(body: unknown = payload, headers: HeadersInit = {}) {
  return new Request(`${origin}/api/enquiry`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function handler(
  overrides: Partial<Parameters<typeof createEnquiryHandler>[0]> = {}
) {
  return createEnquiryHandler({
    enabled: () => true,
    deliver: async () => true,
    ...overrides,
  });
}

async function expectError(
  response: Response,
  status: number,
  error: string,
  reference?: string
) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), {
    error,
    ...(reference ? { reference } : {}),
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
}

test("valid enquiry reaches delivery with normalized optional fields", async () => {
  let called = false;
  const endpoint = handler({
    deliver: async (submitted, id) => {
      called = true;
      assert.equal(submitted.name, values.name);
      assert.equal(submitted.company, "");
      assert.equal(submitted.phone, "");
      assert.equal(submitted.division, "");
      assert.equal(submitted.destination, "");
      assert.equal(submitted.website, "");
      assert.equal(id, requestId);
      assert.equal("requestId" in submitted, false);
      return true;
    },
  });
  const response = await endpoint(
    request({
      name: ` ${values.name} `,
      email: values.email,
      message: values.message,
      requestId,
    })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    reference: enquiryReference(requestId),
    acknowledgementSent: false,
  });
  assert.equal(called, true);
});

test("optional phone is normalized and included in the delivery message", async () => {
  const phone = "+971 50 123 4567";
  let delivered = false;
  const endpoint = handler({
    deliver: async (submitted, id) => {
      delivered = true;
      assert.equal(submitted.phone, phone);
      return sendEnquiryMessage({
        values: submitted,
        requestId: id,
        from: "website@example.com",
        to: "sales@example.com",
        send: async (mail) => {
          assert.match(mail.text ?? "", /Phone: \+971 50 123 4567/);
          assert.equal(mail.replyTo, values.email);
          return {
            data: { id: "mock-phone-email" },
            error: null,
            headers: null,
          };
        },
      });
    },
  });
  const response = await endpoint(request({ ...payload, phone: ` ${phone} ` }));
  assert.equal(response.status, 200);
  assert.equal(delivered, true);
  assert.equal(createEnquirySchema().safeParse(values).success, true);
  assert.equal(
    createEnquirySchema().safeParse({ ...values, phone: "1".repeat(50) })
      .success,
    true
  );
  assert.equal(
    createEnquirySchema().safeParse({ ...values, phone: "1".repeat(51) })
      .success,
    false
  );
});

test("missing configuration never invokes delivery or claims success", async () => {
  const endpoint = handler({
    enabled: () => false,
    deliver: async () => assert.fail("must not deliver"),
  });
  await expectError(await endpoint(request()), 503, "NOT_CONFIGURED");
});

test("different or absent origin and cross-site requests are rejected", async () => {
  const endpoint = handler({
    deliver: async () => assert.fail("must not deliver"),
  });
  await expectError(
    await endpoint(request(payload, { origin: "https://unrelated.example" })),
    403,
    "FORBIDDEN"
  );
  await expectError(
    await endpoint(request(payload, { origin: "" })),
    403,
    "FORBIDDEN"
  );
  await expectError(
    await endpoint(request(payload, { "sec-fetch-site": "cross-site" })),
    403,
    "FORBIDDEN"
  );
});

test("configured canonical origin is accepted behind a proxy", async () => {
  const endpoint = handler({ canonicalOrigin: "https://sfgt.example" });
  assert.equal(
    (await endpoint(request(payload, { origin: "https://sfgt.example" })))
      .status,
    200
  );
});

test("non-JSON, malformed and oversized bodies cannot reach delivery", async () => {
  const endpoint = handler({
    deliver: async () => assert.fail("must not deliver"),
  });
  await expectError(
    await endpoint(request(payload, { "content-type": "text/plain" })),
    415,
    "INVALID_INPUT"
  );
  const malformed = new Request(`${origin}/api/enquiry`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{bad json",
  });
  await expectError(await endpoint(malformed), 400, "INVALID_INPUT");
  await expectError(
    await endpoint(request({ ...payload, message: "a".repeat(30_000) })),
    400,
    "INVALID_INPUT"
  );
  await expectError(
    await endpoint(request(payload, { "content-length": "30000" })),
    400,
    "INVALID_INPUT"
  );
});

test("invalid fields, filled honeypot and non-UUID request IDs are rejected", async () => {
  const endpoint = handler({
    deliver: async () => assert.fail("must not deliver"),
  });
  for (const change of [
    { email: "not-an-email" },
    { name: "" },
    { message: "short" },
    { destination: "x".repeat(151) },
    { phone: "1".repeat(51) },
    { website: "https://spam.example" },
    { requestId: "not-a-uuid" },
    { recipient: "someone-else@example.com" },
    { division: "unrecognised" },
  ]) {
    await expectError(
      await endpoint(request({ ...payload, ...change })),
      400,
      "INVALID_INPUT"
    );
  }
});

test("provider rejection or exception yields failure, not confirmation", async () => {
  await expectError(
    await handler({ deliver: async () => false })(request()),
    502,
    "DELIVERY_FAILED"
  );
  await expectError(
    await handler({
      deliver: async () => {
        throw new Error("provider unavailable");
      },
    })(request()),
    502,
    "DELIVERY_FAILED"
  );
});

test("repeated submissions are throttled before further provider calls", async () => {
  let calls = 0;
  const endpoint = handler({
    deliver: async () => {
      calls += 1;
      return true;
    },
  });
  for (let i = 0; i < 3; i += 1)
    assert.equal((await endpoint(request())).status, 200);
  const response = await endpoint(request());
  await expectError(response, 429, "RATE_LIMITED");
  assert.equal(response.headers.get("retry-after"), "600");
  assert.equal(calls, 3);
});

test("limiter expires old entries and caps the number of retained keys", () => {
  let time = 0;
  const limit = createEnquiryLimiter(() => time);
  assert.equal(limit("first", 1), true);
  assert.equal(limit("first", 1), false);
  for (let i = 1; i < 1000; i += 1) assert.equal(limit(`key-${i}`, 1), true);
  assert.equal(limit("overflow", 1), false);
  time = 600_001;
  assert.equal(limit("first", 1), true);
  assert.equal(limit("overflow", 1), true);
});

test("delivery uses fixed routing, plain text and request idempotency", async () => {
  const sent = await sendEnquiryMessage({
    values,
    requestId,
    from: "website@example.com",
    to: "sales@example.com",
    send: async (email, options) => {
      assert.equal(email.from, "website@example.com");
      assert.equal(email.to, "sales@example.com");
      assert.equal(email.replyTo, values.email);
      assert.match(email.text ?? "", /Destination: Dubai/);
      assert.match(email.text ?? "", /Division: toshiba/);
      assert.match(email.text ?? "", /Please provide a quotation/);
      assert.equal(email.html, undefined);
      assert.equal(options.idempotencyKey, `sfgt-enquiry/${requestId}`);
      return { data: { id: "mock-email-id" }, error: null, headers: null };
    },
  });
  assert.equal(sent, true);
});

test("product selection retains previous products and prevents duplicates", () => {
  assert.equal(
    mergeEnquiryProduct("High Power AA", "Alpha Power AAA"),
    "High Power AA; Alpha Power AAA"
  );
  assert.equal(
    mergeEnquiryProduct("High Power AA; Alpha Power AAA", " High Power AA "),
    "High Power AA; Alpha Power AAA"
  );
  assert.equal(mergeEnquiryProduct("High Power AA", ""), "High Power AA");
});

test("both homepage locales provide balanced fragments for the shared React form", () => {
  for (const locale of ["en", "ar"] as const) {
    const sections = splitSupplierHomeContent(markup[locale]);
    assert.match(sections.header, /<header/);
    assert.match(sections.sections, /id="toshiba-products"/);
    assert.match(sections.quoteCopy, /id="quote-heading"/);
    assert.match(sections.footer, /<footer/);
    assert.doesNotMatch(
      sections.sections,
      /id="preview-enquiry"|id="quotation"/
    );
    assert.doesNotMatch(sections.quoteCopy, /<form\b|data-supplier-enquiry/);
  }
  assert.throws(() => splitSupplierHomeContent("<main>broken</main>"));
});

test("SMTP sends fixed routing and confirms only accepted company recipient", async () => {
  const input = {
    values,
    requestId,
    from: "website@example.com",
    to: "sales@example.com",
  };
  assert.equal(
    await sendSmtpEnquiry({
      ...input,
      send: async (mail) => {
        assert.equal(mail.from, input.from);
        assert.equal(mail.to, input.to);
        assert.equal(mail.replyTo, values.email);
        assert.equal(mail.messageId, `<sfgt-enquiry-${requestId}@example.com>`);
        assert.match(String(mail.text), /Division: toshiba/);
        assert.equal(mail.disableFileAccess, true);
        assert.equal(mail.disableUrlAccess, true);
        return {
          messageId: "accepted-message",
          accepted: [input.to],
          rejected: [],
        };
      },
    }),
    true
  );
  for (const result of [
    { messageId: "generated-but-rejected", accepted: [], rejected: [input.to] },
    {
      messageId: "accepted-other-address",
      accepted: ["other@example.com"],
      rejected: [],
    },
    { messageId: "", accepted: [input.to], rejected: [] },
  ]) {
    assert.equal(
      await sendSmtpEnquiry({ ...input, send: async () => result }),
      false
    );
  }
  assert.equal(
    await sendSmtpEnquiry({
      ...input,
      send: async () => {
        throw new Error("SMTP unavailable");
      },
    }),
    false
  );
});

test("SDK error results, missing IDs and thrown failures do not count as sent", async () => {
  const failures: CreateEmailResponse[] = [
    {
      data: null,
      error: {
        name: "application_error",
        message: "Mock failure",
        statusCode: 503,
      },
      headers: null,
    },
    { data: { id: "" }, error: null, headers: null },
  ];
  for (const response of failures) {
    assert.equal(
      await sendEnquiryMessage({
        values,
        requestId,
        from: "website@example.com",
        to: "sales@example.com",
        send: async () => response,
      }),
      false
    );
  }
  assert.equal(
    await sendEnquiryMessage({
      values,
      requestId,
      from: "website@example.com",
      to: "sales@example.com",
      send: async () => {
        throw new Error("Mock network failure");
      },
    }),
    false
  );
});

test("form schema keeps optional fields as strings and uses translated errors", () => {
  const schema = createEnquirySchema({
    required: "required",
    invalidEmail: "email",
    messageMin: "message",
    maxLength: "long",
  });
  assert.equal(schema.parse(values).company, values.company);
  const result = schema.safeParse({ ...values, name: "" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues[0].message, "required");
});

test("concurrent submissions and later retries send sales and acknowledgement once", async () => {
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  let sales = 0;
  let acknowledgements = 0;
  const submit = createEnquirySubmission({
    deliver: async () => {
      sales += 1;
      started();
      await waiting;
      return "sent";
    },
    acknowledge: async () => {
      acknowledgements += 1;
      return "sent";
    },
  });
  const first = submit(values, requestId);
  await sending;
  const concurrent = await submit(values, requestId);
  assert.equal(concurrent.status, "pending");
  release();
  const accepted = await first;
  const retry = await submit(values, requestId);
  assert.equal(accepted.status, "sent");
  assert.equal(accepted.acknowledgementSent, true);
  assert.deepEqual(retry, accepted);
  assert.equal(sales, 1);
  assert.equal(acknowledgements, 1);
});

test("an existing request UUID cannot be reused for changed enquiry contents", async () => {
  let sales = 0;
  const submit = createEnquirySubmission({
    deliver: async () => {
      sales += 1;
      return "sent";
    },
    acknowledge: async () => "sent",
  });
  await submit(values, requestId);
  const changed = await submit(
    { ...values, email: "different@example.com" },
    requestId
  );
  assert.equal(changed.status, "conflict");
  assert.equal(sales, 1);
});

test("unknown mail acceptance prevents a resend within the receipt window", async () => {
  let time = 0;
  let sales = 0;
  const submit = createEnquirySubmission({
    now: () => time,
    deliver: async () => {
      sales += 1;
      throw new Error("connection lost after DATA");
    },
    acknowledge: async () =>
      assert.fail("unconfirmed delivery cannot be acknowledged"),
  });
  assert.equal((await submit(values, requestId)).status, "pending");
  time = 30 * 60 * 1000;
  assert.equal((await submit(values, requestId)).status, "pending");
  assert.equal(sales, 1);
});

test("SMTP authentication rejection can be retried using the same email reference", async () => {
  let sales = 0;
  const submit = createEnquirySubmission({
    deliver: async () => {
      return sendSmtpEnquiryStatus({
        values,
        requestId,
        from: "website@example.com",
        to: "sales@example.com",
        send: async () => {
          sales += 1;
          if (sales === 1) {
            throw Object.assign(new Error("Authentication rejected"), {
              code: "EAUTH",
            });
          }
          return {
            messageId: "accepted-after-auth-fix",
            accepted: ["sales@example.com"],
            rejected: [],
          };
        },
      });
    },
    acknowledge: async () => "sent",
  });
  const failed = await submit(values, requestId);
  const accepted = await submit(values, requestId);
  assert.equal(failed.status, "failed");
  assert.equal(accepted.status, "sent");
  assert.equal(failed.reference, accepted.reference);
  assert.equal(sales, 2);
});

test("acknowledgement failure preserves accepted sales delivery and avoids duplicate sends", async () => {
  for (const acknowledgementStatus of ["failed", "unknown"] as const) {
    let sales = 0;
    let acknowledgements = 0;
    const submit = createEnquirySubmission({
      deliver: async () => {
        sales += 1;
        return "sent";
      },
      acknowledge: async () => {
        acknowledgements += 1;
        return acknowledgementStatus;
      },
    });
    const first = await submit(values, requestId);
    const repeated = await submit(values, requestId);
    assert.equal(first.status, "sent");
    assert.equal(first.acknowledgementSent, false);
    assert.deepEqual(repeated, first);
    assert.equal(sales, 1);
    assert.equal(acknowledgements, 1);
  }
});

test("a retry during acknowledgement does not send another acknowledgement", async () => {
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  let acknowledgements = 0;
  const submit = createEnquirySubmission({
    deliver: async () => "sent",
    acknowledge: async () => {
      acknowledgements += 1;
      started();
      await waiting;
      return "sent";
    },
  });
  const first = submit(values, requestId);
  await sending;
  const concurrent = await submit(values, requestId);
  assert.equal(concurrent.status, "sent");
  assert.equal(concurrent.acknowledgementSent, false);
  release();
  assert.equal((await first).acknowledgementSent, true);
  assert.equal(acknowledgements, 1);
});

test("receipt cache stays bounded and frees expired settled receipts", async () => {
  let time = 0;
  let sales = 0;
  const submit = createEnquirySubmission({
    now: () => time,
    deliver: async () => {
      sales += 1;
      return "failed";
    },
    acknowledge: async () =>
      assert.fail("rejected sales cannot be acknowledged"),
  });
  for (let index = 0; index < 1000; index += 1) {
    assert.equal((await submit(values, `request-${index}`)).status, "failed");
  }
  assert.equal(
    (await submit(values, "request-capacity")).status,
    "rate_limited"
  );
  assert.equal(sales, 1000);
  time = 60 * 60 * 1000;
  assert.equal((await submit(values, "request-capacity")).status, "failed");
  assert.equal(sales, 1001);
});

test("unknown receipts expire so a provider incident cannot exhaust cache permanently", async () => {
  let time = 0;
  let providerRecovered = false;
  let sales = 0;
  const submit = createEnquirySubmission({
    now: () => time,
    deliver: async () => {
      sales += 1;
      return providerRecovered ? "sent" : "unknown";
    },
    acknowledge: async () => "sent",
  });
  for (let index = 0; index < 1000; index += 1) {
    assert.equal((await submit(values, `unknown-${index}`)).status, "pending");
  }
  assert.equal((await submit(values, "after-recovery")).status, "rate_limited");
  providerRecovered = true;
  time = 60 * 60 * 1000;
  assert.equal((await submit(values, "after-recovery")).status, "sent");
  assert.equal(sales, 1001);
});

test("receipt cleanup never expires an in-flight send", async () => {
  let release!: () => void;
  let time = 0;
  let sales = 0;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const submit = createEnquirySubmission({
    now: () => time,
    deliver: async () => {
      sales += 1;
      await waiting;
      return "sent";
    },
    acknowledge: async () => "sent",
  });
  const first = submit(values, requestId);
  time = 24 * 60 * 60 * 1000;
  assert.equal((await submit(values, requestId)).status, "pending");
  assert.equal(sales, 1);
  release();
  assert.equal((await first).status, "sent");
});

test("email delivery responses expose a reference and accurate acknowledgement state", async () => {
  const receipt = {
    status: "sent" as const,
    reference: enquiryReference(requestId),
    acknowledgementSent: true,
  };
  const endpoint = handler({
    deliver: async () => assert.fail("submission owns delivery"),
    submit: async (submitted, id) => {
      assert.equal(submitted.name, values.name);
      assert.equal(id, requestId);
      return receipt;
    },
  });
  const response = await endpoint(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    reference: receipt.reference,
    acknowledgementSent: true,
  });
  await expectError(
    await handler({ submit: async () => ({ ...receipt, status: "pending" }) })(
      request()
    ),
    409,
    "DELIVERY_PENDING",
    receipt.reference
  );
  await expectError(
    await handler({
      submit: async () => {
        throw new Error("unexpected interruption");
      },
    })(request()),
    502,
    "DELIVERY_PENDING",
    receipt.reference
  );
});

test("acknowledgements include only fixed receipt text and a stable reference", () => {
  const untrusted = {
    ...values,
    name: "Untrusted recipient name",
    message: "https://untrusted.example/visitor-controlled-message",
  };
  for (const locale of ["en", "ar"] as const) {
    const mail = enquiryAcknowledgement({ ...untrusted, locale }, requestId);
    assert.match(mail.text, new RegExp(enquiryReference(requestId)));
    assert.equal(mail.text.includes(untrusted.name), false);
    assert.equal(mail.text.includes(untrusted.message), false);
    assert.equal(mail.subject.includes(untrusted.email), false);
  }
});
