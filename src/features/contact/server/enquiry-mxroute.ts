import type { EnquirySendStatus } from "./enquiry-submission";

export type MailboxCredentials = {
  server: string;
  username: string;
  password: string;
};

type Message = {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendMxrouteMessage(
  credentials: MailboxCredentials,
  { from, to, subject, text, replyTo }: Message,
  send: typeof fetch = fetch
): Promise<EnquirySendStatus> {
  let body = `<p dir="auto">${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
  if (replyTo) {
    const address = encodeURIComponent(replyTo).replace("%40", "@");
    body += `<p><a href="mailto:${escapeHtml(address)}">Reply to ${escapeHtml(replyTo)}</a></p>`;
  }

  try {
    const response = await send("https://smtpapi.mxroute.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, from, to, subject, body }),
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
    // Never forward the request or its mailbox credentials to a redirect.
    if (response.status >= 300 && response.status < 400) return "unknown";
    // A timeout or server error leaves delivery uncertain. Do not resend.
    if (response.status >= 500 || response.status === 408) return "unknown";
    const result: { success?: boolean } | null = await response.json();
    if (response.ok && result?.success === true) return "sent";
    return result?.success === false ? "failed" : "unknown";
  } catch {
    return "unknown";
  }
}
