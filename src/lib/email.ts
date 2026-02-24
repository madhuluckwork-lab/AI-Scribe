import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@medscribe.ai";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendNoteShareInvite(params: {
  toEmail: string;
  clinicianName: string;
  noteTitle: string;
  inviteToken: string;
  message?: string;
}) {
  const inviteUrl = `${APP_URL}/invite/${params.inviteToken}`;

  await sgMail.send({
    to: params.toEmail,
    from: { email: FROM_EMAIL, name: "Adit Scribe" },
    subject: `${params.clinicianName} shared a clinical note with you`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #002D42;">
          <span>Adit</span> <span style="color: #F4891F;">Scribe</span>
        </h2>
        <p>Hello,</p>
        <p><strong>${params.clinicianName}</strong> has shared a clinical note with you: <em>${params.noteTitle}</em></p>
        ${params.message ? `<p style="background: #f5f5f5; padding: 12px; border-radius: 6px;">&ldquo;${params.message}&rdquo;</p>` : ""}
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background: #F4891F; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            View Your Note
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you don&rsquo;t have an account yet, you&rsquo;ll be asked to create one. This link expires in 7 days.
        </p>
      </div>
    `,
  });
}
