export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = { ok: true; provider: string } | { ok: false; error: string };

/**
 * Send transactional email.
 * Priority: RESEND_API_KEY → console log (dev).
 * For SMTP, use Resend's SMTP relay or set RESEND_API_KEY.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "Oushodhwala <noreply@oushodhwala.local>";

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[email:resend]", res.status, body);
        return { ok: false, error: `Resend ${res.status}` };
      }
      return { ok: true, provider: "resend" };
    } catch (err) {
      console.error("[email:resend]", err);
      return { ok: false, error: "Resend request failed" };
    }
  }

  console.info(
    `[email:console] to=${input.to} subject=${JSON.stringify(input.subject)}\n${input.text}`,
  );
  return { ok: true, provider: "console" };
}
