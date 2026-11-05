import type { SendMailOptions, SentMessageInfo } from "nodemailer";
import type { EnquiryValues } from "../types";
import { formatEnquiryMessage } from "./enquiry-message";
import { enquiryReference, type EnquirySendStatus } from "./enquiry-submission";

type SendSmtp = (
  message: SendMailOptions
) => Promise<Pick<SentMessageInfo, "messageId" | "accepted" | "rejected">>;

export async function sendSmtpMessage({
  message,
  to,
  send,
}: {
  message: SendMailOptions;
  to: string;
  send: SendSmtp;
}): Promise<EnquirySendStatus> {
  try {
    const result = await send(message);
    const accepted = result.accepted?.some(
      (recipient: string | { address: string }) =>
        (typeof recipient === "string"
          ? recipient
          : recipient.address
        ).toLowerCase() === to.toLowerCase()
    );
    if (result.messageId && accepted) return "sent";
    const rejected = result.rejected?.some(
      (recipient: string | { address: string }) =>
        (typeof recipient === "string"
          ? recipient
          : recipient.address
        ).toLowerCase() === to.toLowerCase()
    );
    return rejected ? "failed" : "unknown";
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "EAUTH" || error.code === "EENVELOPE")
    ) {
      // Authentication/envelope rejection happens before message acceptance.
      return "failed";
    }
    // A connection can fail after SMTP accepted the message. Keep that
    // uncertainty visible in the receipt instead of automatically resending.
    return "unknown";
  }
}

type EnquirySmtpInput = {
  values: EnquiryValues;
  requestId: string;
  from: string;
  to: string;
  send: SendSmtp;
};

export async function sendSmtpEnquiry(
  input: EnquirySmtpInput
): Promise<boolean> {
  return (await sendSmtpEnquiryStatus(input)) === "sent";
}

export async function sendSmtpEnquiryStatus({
  values,
  requestId,
  from,
  to,
  send,
}: EnquirySmtpInput): Promise<EnquirySendStatus> {
  const reference = enquiryReference(requestId);
  return sendSmtpMessage({
    to,
    send,
    message: {
      from,
      to,
      replyTo: values.email,
      subject: `${reference} — New website enquiry`,
      text: formatEnquiryMessage(values, reference),
      // Stable on retry, but SMTP does not provide provider-level idempotency.
      messageId: `<sfgt-enquiry-${requestId}@${from.split("@")[1]}>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    },
  });
}
