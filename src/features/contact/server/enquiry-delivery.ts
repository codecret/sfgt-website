import { Resend } from "resend";
import nodemailer from "nodemailer";
import { company } from "@/features/catalogue/catalogue";
import { env } from "@/lib/env";
import type { EnquiryValues } from "../types";
import { sendEnquiryMessageStatus } from "./enquiry-message";
import { sendSmtpEnquiryStatus, sendSmtpMessage } from "./enquiry-smtp";
import { enquiryAcknowledgement } from "./enquiry-acknowledgement";
import type { EnquirySendStatus } from "./enquiry-submission";

function smtpConfigured(): boolean {
  return Boolean(
    env.CONTACT_SMTP_HOST && env.CONTACT_SMTP_USER && env.CONTACT_SMTP_PASSWORD
  );
}

export function getEnquiryDeliveryEnabled(): boolean {
  return Boolean(
    env.CONTACT_FROM_EMAIL && (smtpConfigured() || env.RESEND_API_KEY)
  );
}

function smtpTransport() {
  const port = Number(env.CONTACT_SMTP_PORT ?? "465");
  return nodemailer.createTransport({
    host: env.CONTACT_SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: env.CONTACT_SMTP_USER, pass: env.CONTACT_SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
}

export async function deliverEnquiry(
  values: EnquiryValues,
  requestId: string
): Promise<boolean> {
  return (await deliverEnquiryStatus(values, requestId)) === "sent";
}

export async function deliverEnquiryStatus(
  values: EnquiryValues,
  requestId: string
): Promise<EnquirySendStatus> {
  if (!env.CONTACT_FROM_EMAIL) return "failed";

  // Prefer the existing mailbox provider when all SMTP settings are present.
  // Never fail over automatically: an uncertain send could duplicate the enquiry.
  if (smtpConfigured()) {
    const transport = smtpTransport();
    return sendSmtpEnquiryStatus({
      values,
      requestId,
      from: env.CONTACT_FROM_EMAIL,
      to: company.email,
      send: (message) => transport.sendMail(message),
    });
  }

  if (!env.RESEND_API_KEY) return "failed";

  const resend = new Resend(env.RESEND_API_KEY);
  return sendEnquiryMessageStatus({
    values,
    requestId,
    from: env.CONTACT_FROM_EMAIL,
    to: company.email,
    send: (payload, options) => resend.emails.send(payload, options),
  });
}

export async function acknowledgeEnquiry(
  values: EnquiryValues,
  requestId: string
): Promise<EnquirySendStatus> {
  if (!env.CONTACT_FROM_EMAIL) return "failed";
  const content = enquiryAcknowledgement(values, requestId);
  const message = {
    from: env.CONTACT_FROM_EMAIL,
    to: values.email,
    replyTo: company.email,
    ...content,
    headers: {
      "Auto-Submitted": "auto-replied",
      "X-Auto-Response-Suppress": "All",
    },
  };
  if (smtpConfigured()) {
    const transport = smtpTransport();
    return sendSmtpMessage({
      to: values.email,
      send: (mail) => transport.sendMail(mail),
      message: {
        ...message,
        messageId: `<sfgt-acknowledgement-${requestId}@${env.CONTACT_FROM_EMAIL.split("@")[1]}>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      },
    });
  }
  if (!env.RESEND_API_KEY) return "failed";
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const response = await resend.emails.send(message, {
      idempotencyKey: `sfgt-acknowledgement/${requestId}`,
    });
    if (response.error) {
      return (response.error.statusCode ?? 500) >= 500 ? "unknown" : "failed";
    }
    return response.data?.id ? "sent" : "unknown";
  } catch {
    return "unknown";
  }
}
