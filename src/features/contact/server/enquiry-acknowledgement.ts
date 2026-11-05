import type { EnquiryValues } from "../types";
import { enquiryReference } from "./enquiry-submission";

export function enquiryAcknowledgement(
  values: EnquiryValues,
  requestId: string
) {
  const reference = enquiryReference(requestId);
  if (values.locale === "ar") {
    return {
      subject: `${reference} — تم استلام استفسارك لدى SFGT`,
      text: [
        "شكراً لتواصلك مع شركة سليمان فاروق للتجارة العامة ذ.م.م.",
        "",
        "لقد استلمنا استفسارك، وسيراجع فريقنا متطلباتك ويتواصل معك.",
        `رقم المرجع: ${reference}`,
        "",
        "يمكنك الرد على هذه الرسالة لمتابعة استفسارك مع فريقنا.",
        "",
        "شركة سليمان فاروق للتجارة العامة ذ.م.م.",
      ].join("\n"),
    };
  }
  return {
    subject: `${reference} — Your SFGT enquiry has been received`,
    text: [
      "Thank you for contacting Sulemane Faruk General Trading LLC.",
      "",
      "We have received your enquiry. Our team will review your requirements and contact you.",
      `Reference: ${reference}`,
      "",
      "Reply to this email to follow up with our team.",
      "",
      "Sulemane Faruk General Trading LLC",
    ].join("\n"),
  };
}
