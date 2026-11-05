import { createHash } from "node:crypto";
import type { EnquiryValues } from "../types";

export type EnquirySendStatus = "sent" | "failed" | "unknown";

export type EnquirySubmissionResult = {
  status: "sent" | "failed" | "pending" | "conflict" | "rate_limited";
  reference: string;
  acknowledgementSent: boolean;
};

type RecentSubmission = {
  payloadHash: string;
  inFlight: boolean;
  expiresAt: number;
  receipt: EnquirySubmissionResult;
};

export function enquiryReference(requestId: string): string {
  return `SFGT-${requestId.toUpperCase()}`;
}

export function createEnquirySubmission({
  deliver,
  acknowledge,
  now = Date.now,
}: {
  deliver: (
    values: EnquiryValues,
    requestId: string
  ) => Promise<EnquirySendStatus>;
  acknowledge: (
    values: EnquiryValues,
    requestId: string
  ) => Promise<EnquirySendStatus>;
  now?: () => number;
}) {
  // This bounded cache keeps hashes and delivery receipts within one process.
  // Provider idempotency and stable mail IDs also help retries, but process
  // restarts or separate server instances can still send another email.
  const recent = new Map<string, RecentSubmission>();
  const retentionMs = 60 * 60 * 1000;

  return async (
    values: EnquiryValues,
    requestId: string
  ): Promise<EnquirySubmissionResult> => {
    const reference = enquiryReference(requestId);
    const result = (
      status: EnquirySubmissionResult["status"],
      acknowledgementSent = false
    ): EnquirySubmissionResult => ({
      status,
      reference,
      acknowledgementSent,
    });
    const time = now();
    for (const [id, entry] of recent) {
      if (!entry.inFlight && entry.expiresAt <= time) recent.delete(id);
    }
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(values))
      .digest("hex");
    let entry = recent.get(requestId);
    if (entry) {
      if (entry.payloadHash !== payloadHash) return result("conflict");
      if (entry.inFlight || entry.receipt.status !== "failed") {
        return { ...entry.receipt };
      }
    } else {
      if (recent.size >= 1000) return result("rate_limited");
      entry = {
        payloadHash,
        inFlight: false,
        expiresAt: Infinity,
        receipt: result("pending"),
      };
      recent.set(requestId, entry);
    }

    // Claim synchronously before contacting the provider. In-flight entries
    // cannot expire while the provider is still processing the message.
    entry.inFlight = true;
    entry.expiresAt = Infinity;
    entry.receipt = result("pending");
    let deliveryStatus: EnquirySendStatus;
    try {
      deliveryStatus = await deliver(values, requestId);
    } catch {
      deliveryStatus = "unknown";
    }
    if (deliveryStatus !== "sent") {
      entry.inFlight = false;
      entry.receipt = result(
        deliveryStatus === "failed" ? "failed" : "pending"
      );
      entry.expiresAt = now() + retentionMs;
      return { ...entry.receipt };
    }

    // Sales has accepted the enquiry. An acknowledgement problem must not turn
    // an accepted enquiry into a delivery failure or trigger another sales send.
    entry.receipt = result("sent");
    let acknowledgementStatus: EnquirySendStatus;
    try {
      acknowledgementStatus = await acknowledge(values, requestId);
    } catch {
      acknowledgementStatus = "unknown";
    }
    entry.receipt = result("sent", acknowledgementStatus === "sent");
    entry.inFlight = false;
    entry.expiresAt = now() + retentionMs;
    return { ...entry.receipt };
  };
}
