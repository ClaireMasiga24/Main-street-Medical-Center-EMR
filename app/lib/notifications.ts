import { prisma } from "./prisma";

// ─── Create a notification ────────────────────────────────────────────
export async function createNotification({
  department, userId, patientId, title, message, type, referenceId, referenceType,
}: {
  department?: string;
  userId?: number;
  patientId?: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number;
  referenceType?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        department: department || null,
        userId: userId || null,
        patientId: patientId || null,
        title,
        message,
        type,
        referenceId: referenceId || null,
        referenceType: referenceType || null,
      },
    });
  } catch (err) {
    console.error("[createNotification]", err);
    return null;
  }
}

// ─── Send email notification via Resend ──────────────────────────────
export async function sendLabNotificationEmail({
  to, subject, html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Main Street EMR <notifications@mainstreetemr.com>",
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[sendEmail]", err);
    return false;
  }
}

// ─── Build HTML email for lab result notification ─────────────────────
export function labResultEmailHtml({
  patientName, patientNumber, testName, department, sharedByName, note, reportUrl,
}: {
  patientName: string;
  patientNumber: string;
  testName: string;
  department: string;
  sharedByName: string;
  note?: string;
  reportUrl?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#00703C;padding:24px;text-align:center;color:#fff;">
          <h2 style="margin:0;font-size:20px;">MAIN STREET MEDICAL CENTER</h2>
          <p style="margin:4px 0 0;opacity:0.8;font-size:13px;">Laboratory Information System</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <h3 style="color:#1e293b;margin:0 0 16px;">Lab Result Notification</h3>
          <table width="100%" cellpadding="8" style="background:#f8fafc;border-radius:8px;margin-bottom:16px;">
            <tr><td style="font-size:13px;color:#64748b;">Patient:</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${patientName}</td></tr>
            <tr><td style="font-size:13px;color:#64748b;">Patient #:</td><td style="font-size:13px;font-weight:600;color:#00703C;">${patientNumber}</td></tr>
            <tr><td style="font-size:13px;color:#64748b;">Test:</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${testName}</td></tr>
            <tr><td style="font-size:13px;color:#64748b;">Department:</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${department}</td></tr>
            <tr><td style="font-size:13px;color:#64748b;">Shared by:</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${sharedByName}</td></tr>
            ${note ? `<tr><td style="font-size:13px;color:#64748b;">Note:</td><td style="font-size:13px;color:#1e293b;">${note}</td></tr>` : ""}
          </table>
          <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Laboratory results are now available for review. Please log in to the EMR system to view the full report.</p>
          ${reportUrl ? `<a href="${reportUrl}" style="display:inline-block;background:#00703C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Report</a>` : ""}
          <p style="font-size:11px;color:#94a3b8;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">This is an automated notification from Main Street Medical Center EMR. Do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Get all staff emails for a department ────────────────────────────
export async function getDepartmentEmails(department: string): Promise<string[]> {
  try {
    const staff = await prisma.staff.findMany({
      where: { department },
      include: { User: { select: { email: true } } },
    });
    return staff.map(s => s.User?.email).filter((e): e is string => !!e);
  } catch {
    return [];
  }
}

// ─── Get all staff phone numbers for a department ─────────────────────
export async function getDepartmentPhones(department: string): Promise<string[]> {
  try {
    const staff = await prisma.staff.findMany({
      where: { department },
      select: { phoneNumber: true },
    });
    return staff.map(s => s.phoneNumber).filter((p): p is string => !!p);
  } catch {
    return [];
  }
}
