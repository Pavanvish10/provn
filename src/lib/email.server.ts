// Server-only transactional email via Resend's REST API (no SDK dependency).
// Import this ONLY from other *.server.ts files — never from client code,
// since it reads a secret API key from process.env.

const RESEND_API_URL = "https://api.resend.com/emails";
// The app's brand name is "Provn" but the actually-owned/verified domain is
// "provnn.in" (double n — matches the live site, www.provnn.in). An earlier
// fix ("Fix Resend sender domain") changed this to "provn.in" (single n),
// which was never actually verified with Resend — confirmed live via a
// direct Resend API call: provn.in returns 403 "domain is not verified",
// provnn.in sends successfully. Every transactional email in this app
// (OTP codes, interview scheduling, application updates, job invitations)
// has been silently failing until this fix.
const FROM_ADDRESS = "Provn <notifications@provnn.in>";

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<{
  sent: boolean;
  error?: string;
}> {
  // TODO(API_KEY): set RESEND_API_KEY (https://resend.com) in the environment to enable
  // transactional email. Every call site here (interview scheduling, application status,
  // job invitations, business-emails.server.ts) already degrades gracefully without it.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not configured — skipped email to ${input.to}: ${input.subject}`,
    );
    return { sent: false, error: "Email is not configured yet (missing RESEND_API_KEY)." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body);
      return { sent: false, error: `Email provider returned ${res.status}.` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return { sent: false, error: "Could not reach the email provider." };
  }
}

function wrapEmail(title: string, bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6366f1; font-weight: 600;">Provn</div>
      <h1 style="font-size: 20px; margin: 12px 0 16px;">${title}</h1>
      <div style="font-size: 14px; line-height: 1.6; color: #334155;">${bodyHtml}</div>
      <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">You're receiving this because of activity on your Provn account.</p>
    </div>
  `;
}

export async function sendOtpEmail(params: { to: string; code: string }) {
  return sendEmail({
    to: params.to,
    subject: `${params.code} is your Provn sign-in code`,
    html: wrapEmail(
      "Your sign-in code",
      `<p>Enter this code to sign in to Provn:</p>
       <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.15em; margin: 20px 0;">${params.code}</p>
       <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    ),
  });
}

export async function sendConfirmationEmail(params: {
  to: string;
  fullName: string;
  confirmLink: string;
  isBusiness?: boolean;
}) {
  return sendEmail({
    to: params.to,
    subject: params.isBusiness
      ? "Confirm your Provn Business account"
      : "Confirm your Provn account",
    html: wrapEmail(
      "Confirm your email",
      `<p>Hi ${params.fullName || "there"},</p>
       <p>${
         params.isBusiness
           ? "Thanks for registering your company on Provn. Confirm your email to finish setting up your business account."
           : "Thanks for signing up for Provn. Confirm your email to activate your account."
       }</p>
       <p style="margin: 24px 0;">
         <a href="${params.confirmLink}" style="display: inline-block; background: #2563EB; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm email</a>
       </p>
       <p style="color: #94a3b8; font-size: 12px;">Or paste this link into your browser: ${params.confirmLink}</p>
       <p>If you didn't create this account, you can safely ignore this email.</p>`,
    ),
  });
}

export async function sendInterviewScheduledEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: string;
  mode: string;
  meetingLink?: string | null;
  interviewerName?: string | null;
}) {
  const when = new Date(params.scheduledAt).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
  return sendEmail({
    to: params.to,
    subject: `Interview scheduled — ${params.jobTitle}`,
    html: wrapEmail(
      "Your interview is scheduled",
      `<p>Hi ${params.candidateName},</p>
       <p>Your ${params.mode} interview for <b>${params.jobTitle}</b> is scheduled for <b>${when}</b>.</p>
       ${params.interviewerName ? `<p>Interviewer: ${params.interviewerName}</p>` : ""}
       ${params.meetingLink ? `<p>Meeting link: <a href="${params.meetingLink}">${params.meetingLink}</a></p>` : ""}
       <p>Log in to Provn to accept, decline, or request another time.</p>`,
    ),
  });
}

export async function sendApplicationStatusEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  status: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Application update — ${params.jobTitle}`,
    html: wrapEmail(
      "Your application status changed",
      `<p>Hi ${params.candidateName},</p>
       <p>Your application for <b>${params.jobTitle}</b> is now <b>${params.status}</b>.</p>`,
    ),
  });
}

export async function sendPaymentReceiptEmail(params: {
  to: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
}) {
  const amount = `${params.currency === "INR" ? "₹" : params.currency + " "}${(params.amountCents / 100).toFixed(2)}`;
  return sendEmail({
    to: params.to,
    subject: `Receipt — ${params.description}`,
    html: wrapEmail(
      "Payment received",
      `<p>Hi ${params.name || "there"},</p>
       <p>Thanks for your purchase. Here's your receipt:</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         <tr><td style="padding: 8px 0; color: #64748b;">Item</td><td style="padding: 8px 0; text-align: right;">${params.description}</td></tr>
         <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600; border-top: 1px solid #e2e8f0;">${amount}</td></tr>
       </table>
       <p>You can view your full billing history and download invoices anytime from your Provn billing page.</p>`,
    ),
  });
}

export async function sendJobInvitationEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `You're invited to apply — ${params.jobTitle}`,
    html: wrapEmail(
      "You've been invited to apply",
      `<p>Hi ${params.candidateName},</p>
       <p><b>${params.companyName}</b> thinks you'd be a great fit for <b>${params.jobTitle}</b> and invited you to apply on Provn.</p>`,
    ),
  });
}
