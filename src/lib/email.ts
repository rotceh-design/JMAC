/**
 * Email service abstraction.
 * Uses Resend if RESEND_API_KEY is set, otherwise logs to console (dev mode).
 * Never import email providers directly — always go through this module.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@jhon-aire.cl",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}

async function sendWithConsole(options: EmailOptions): Promise<EmailResult> {
  console.log("📧 [DEV MODE] Email sent:");
  console.log(`  To: ${options.to}`);
  console.log(`  Subject: ${options.subject}`);
  console.log(`  HTML length: ${options.html.length} chars`);
  return { success: true, messageId: "dev-mode" };
}

/**
 * Send an email. Uses Resend in production, console in development.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(options);
  }
  return sendWithConsole(options);
}
