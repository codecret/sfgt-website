import { z } from "zod";

type EnquiryMessages = {
  required: string;
  invalidEmail: string;
  messageMin: string;
  maxLength: string;
};

export const enquiryDivisions = [
  "toshiba",
  "tekbatt",
  "commodities",
  "distribution",
] as const;

export type EnquiryDivision = (typeof enquiryDivisions)[number] | "";

export const enquiryBuyerTypes = [
  "retailer",
  "wholesaler",
  "distributor",
  "other",
] as const;

export const enquiryContactPreferences = [
  "email",
  "phone",
  "whatsapp",
] as const;

const defaultMessages: EnquiryMessages = {
  required: "This field is required.",
  invalidEmail: "Enter a valid email address.",
  messageMin: "Please include at least 10 characters.",
  maxLength: "Please shorten this field.",
};

export function createEnquirySchema(
  messages: EnquiryMessages = defaultMessages
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, messages.required)
      .max(100, messages.maxLength),
    email: z
      .string()
      .trim()
      .email(messages.invalidEmail)
      .max(254, messages.maxLength),
    division: z.enum(["", ...enquiryDivisions]),
    locale: z.enum(["en", "ar"]).optional().default("en"),
    phone: z.string().trim().max(50, messages.maxLength).optional(),
    companyCountry: z
      .string()
      .trim()
      .max(100, messages.maxLength)
      .optional()
      .default(""),
    buyerType: z
      .enum(["", ...enquiryBuyerTypes])
      .optional()
      .default(""),
    monthlyVolume: z
      .string()
      .trim()
      .max(250, messages.maxLength)
      .optional()
      .default(""),
    contactPreference: z
      .enum(["", ...enquiryContactPreferences])
      .optional()
      .default(""),
    company: z.string().trim().max(150, messages.maxLength),
    product: z.string().trim().max(250, messages.maxLength),
    quantity: z.string().trim().max(250, messages.maxLength),
    destination: z.string().trim().max(150, messages.maxLength),
    message: z
      .string()
      .trim()
      .min(10, messages.messageMin)
      .max(3000, messages.maxLength),
    website: z.string().max(0),
  });
}

export type EnquiryValues = z.input<ReturnType<typeof createEnquirySchema>>;
