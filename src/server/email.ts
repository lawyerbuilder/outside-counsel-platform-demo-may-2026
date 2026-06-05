import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// On free tier, use Resend's test domain
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "SCG Legal <onboarding@resend.dev>";

export type RfpInvitationEmail = {
  to: string;
  firmName: string;
  rfpTitle: string;
  practiceArea: string;
  jurisdiction: string;
  deadline: string | null;
  scopeOfWork: string;
  portalUrl: string;
};

/**
 * Send an RFP invitation email to a firm.
 * Returns true if sent, false if email service unavailable.
 */
export async function sendRfpInvitationEmail(
  data: RfpInvitationEmail,
): Promise<boolean> {
  if (!resend) {
    console.log(`[Email] Resend not configured — skipping email to ${data.to}`);
    return false;
  }

  const deadlineText = data.deadline
    ? new Date(data.deadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "No fixed deadline";

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.to,
      subject: `Request for Proposal: ${data.rfpTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #8B1A1A; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">SCG Legal — Outside Counsel Platform</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Request for Proposal</p>
          </div>

          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
            <p style="margin: 0 0 16px; color: #374151;">Dear <strong>${data.firmName}</strong>,</p>

            <p style="margin: 0 0 16px; color: #374151;">
              The Siam Cement Group Legal team invites your firm to submit a proposal for the following matter:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 120px;">Title</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${data.rfpTitle}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Practice Area</td>
                <td style="padding: 8px 0; color: #111827;">${data.practiceArea}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Jurisdiction</td>
                <td style="padding: 8px 0; color: #111827;">${data.jurisdiction}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Deadline</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${deadlineText}</td>
              </tr>
            </table>

            <div style="background: #f9fafb; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Scope of Work</p>
              <p style="margin: 0; color: #374151; font-size: 14px;">${data.scopeOfWork}</p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${data.portalUrl}" style="display: inline-block; background: #8B1A1A; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Submit Your Proposal
              </a>
            </div>

            <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
              This link is unique to your firm. No login required.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <div style="font-size: 11px; color: #9ca3af;">
              <p style="margin: 0 0 8px;"><strong>CONFIDENTIALITY NOTICE:</strong> This email and the linked portal contain confidential information intended solely for the named recipient firm. If you have received this in error, please notify the sender immediately and delete this email.</p>
              <p style="margin: 0;"><strong>LIABILITY DISCLAIMER:</strong> By accessing the proposal portal, your firm accepts responsibility for the accuracy and completeness of all information submitted. SCG Legal reserves the right to accept or reject any proposal at its sole discretion.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error(`[Email] Failed to send to ${data.to}:`, error);
      return false;
    }

    console.log(`[Email] Sent RFP invitation to ${data.to} for "${data.rfpTitle}"`);
    return true;
  } catch (err) {
    console.error(`[Email] Error sending to ${data.to}:`, err);
    return false;
  }
}

/**
 * Check if email sending is available.
 */
export function isEmailConfigured(): boolean {
  return !!resend;
}
