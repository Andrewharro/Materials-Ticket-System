import nodemailer from "nodemailer";
import { db } from "./db";
import { emailLogs } from "@shared/schema";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    })
  : null;

export async function sendTicketEmail(params: {
  ticketId: number;
  messageId?: number;
  toEmail: string;
  subject: string;
  body: string;
}) {
  const { ticketId, messageId, toEmail, subject, body } = params;

  if (!transporter) {
    console.log(`[Email] SMTP not configured. Would send to ${toEmail}: "${subject}"`);
    await db.insert(emailLogs).values({
      ticketId,
      messageId: messageId ?? null,
      toEmail,
      subject,
      bodyPreview: body.substring(0, 500),
      status: "skipped",
      errorText: "SMTP not configured",
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@materials-os.local",
      to: toEmail,
      subject,
      text: body,
    });

    await db.insert(emailLogs).values({
      ticketId,
      messageId: messageId ?? null,
      toEmail,
      subject,
      bodyPreview: body.substring(0, 500),
      status: "sent",
    });
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${toEmail}:`, err.message);
    await db.insert(emailLogs).values({
      ticketId,
      messageId: messageId ?? null,
      toEmail,
      subject,
      bodyPreview: body.substring(0, 500),
      status: "failed",
      errorText: err.message,
    });
  }
}
