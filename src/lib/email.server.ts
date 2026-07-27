// Server-only transactional email via Resend's REST API (no SDK dependency).
// Import this ONLY from other *.server.ts files — never from client code,
// since it reads a secret API key from process.env.

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Provn <notifications@provn.app>";

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<{
  sent: boolean;
  error?: string;
}> {
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
