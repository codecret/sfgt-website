import { Resend } from "resend";
import nodemailer from "nodemailer";
import { company } from "@/features/catalogue/catalogue";
import { env } from "@/lib/env";
import type { EnquiryValues } from "../types";
import { formatEnquiryMessage, sendEnquiryMessageStatus } from "./enquiry-message";
import { sendSmtpEnquiryStatus, sendSmtpMessage } from "./enquiry-smtp";
import { enquiryAcknowledgement } from "./enquiry-acknowledgement";
import { enquiryReference, type EnquirySendStatus } from "./enquiry-submission";
import { sendMxrouteMessage, type MailboxCredentials } from "./enquiry-mxroute";

function mailboxCredentials(): MailboxCredentials | undefined {
  const {
    CONTACT_SMTP_HOST: server,
    CONTACT_SMTP_USER: username,
    CONTACT_SMTP_PASSWORD: password,
  } = env;
  if (server && username && password) return { server, username, password };
}

export function getEnquiryDeliveryEnabled(): boolean {
  if (env.CONTACT_MAIL_TRANSPORT === "mxroute-api") {
    return Boolean(env.CONTACT_FROM_EMAIL && mailboxCredentials());
  }
  return Boolean(
    env.CONTACT_FROM_EMAIL && (mailboxCredentials() || env.RESEND_API_KEY)
  );
}

function smtpTransport({ server, username, password }: MailboxCredentials) {
  const port = Number(env.CONTACT_SMTP_PORT ?? "465");
  return nodemailer.createTransport({
    host: server,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: username, pass: password },
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

  // Never fail over automatically: an uncertain send could duplicate the enquiry.
  const credentials = mailboxCredentials();
  if (env.CONTACT_MAIL_TRANSPORT === "mxroute-api") {
    if (!credentials) return "failed";
    const reference = enquiryReference(requestId);
    return sendMxrouteMessage(credentials, {
      from: env.CONTACT_FROM_EMAIL,
      to: company.email,
      subject: `${reference} — New website enquiry`,
      text: formatEnquiryMessage(values, reference),
      replyTo: values.email,
    });
  }

  if (credentials) {
    const transport = smtpTransport(credentials);
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
  const credentials = mailboxCredentials();
  if (env.CONTACT_MAIL_TRANSPORT === "mxroute-api") {
    if (!credentials) return "failed";
    return sendMxrouteMessage(credentials, {
      from: env.CONTACT_FROM_EMAIL,
      to: values.email,
      ...content,
    });
  }

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
  if (credentials) {
    const transport = smtpTransport(credentials);
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
