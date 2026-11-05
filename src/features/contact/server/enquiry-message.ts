import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  CreateEmailResponse,
} from "resend";
import type { EnquiryValues } from "../types";
import { enquiryReference, type EnquirySendStatus } from "./enquiry-submission";

type SendEmail = (
  payload: CreateEmailOptions,
  options: CreateEmailRequestOptions
) => Promise<CreateEmailResponse>;

export async function sendEnquiryMessage(input: {
  values: EnquiryValues;
  requestId: string;
  from: string;
  to: string;
  send: SendEmail;
}): Promise<boolean> {
  return (await sendEnquiryMessageStatus(input)) === "sent";
}

export async function sendEnquiryMessageStatus({
  values,
  requestId,
  from,
  to,
  send,
}: {
  values: EnquiryValues;
  requestId: string;
  from: string;
  to: string;
  send: SendEmail;
}): Promise<EnquirySendStatus> {
  const reference = enquiryReference(requestId);
  const text = formatEnquiryMessage(values, reference);

  try {
    const result = await send(
      {
        from,
        to,
        replyTo: values.email,
        subject: `${reference} — New website enquiry`,
        text,
      },
      { idempotencyKey: `sfgt-enquiry/${requestId}` }
    );
    // A fulfilled SDK call can still contain a provider error.
    if (result.error) {
      return (result.error.statusCode ?? 500) >= 500 ? "unknown" : "failed";
    }
    return result.data?.id ? "sent" : "unknown";
  } catch {
    // Do not log enquiry contents or expose provider details to visitors.
    return "unknown";
  }
}

export function formatEnquiryMessage(
  values: EnquiryValues,
  reference?: string
): string {
  return [
    "New enquiry from the SFGT website",
    ...(reference ? [`Reference: ${reference}`] : []),
    "",
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Phone: ${values.phone || "Not provided"}`,
    `Division: ${values.division || "General enquiry"}`,
    `Company: ${values.company || "Not provided"}`,
    `Company country: ${values.companyCountry || "Not provided"}`,
    `Buyer type: ${values.buyerType || "Not provided"}`,
    `Preferred contact: ${values.contactPreference || "Not provided"}`,
    `Product: ${values.product || "Not provided"}`,
    `Quantity: ${values.quantity || "Not provided"}`,
    `Destination: ${values.destination || "Not provided"}`,
    `Expected monthly volume: ${values.monthlyVolume || "Not provided"}`,
    "",
    values.message,
  ].join("\n");
}
