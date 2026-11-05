import { env } from "@/lib/env";
import {
  deliverEnquiry,
  deliverEnquiryStatus,
  acknowledgeEnquiry,
  getEnquiryDeliveryEnabled,
} from "@/features/contact/server/enquiry-delivery";
import { createEnquiryHandler } from "@/features/contact/server/enquiry-handler";
import { createEnquirySubmission } from "@/features/contact/server/enquiry-submission";

export const runtime = "nodejs";
export const maxDuration = 60;

const submit = createEnquirySubmission({
  deliver: deliverEnquiryStatus,
  acknowledge: acknowledgeEnquiry,
});

export const POST = createEnquiryHandler({
  enabled: getEnquiryDeliveryEnabled,
  deliver: deliverEnquiry,
  submit,
  canonicalOrigin: env.NEXT_PUBLIC_SITE_URL ?? env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
