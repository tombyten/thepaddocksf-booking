import { Resend } from "resend";

const PALETTE = {
  cream: "#FFF1DA",
  navy: "#1B2F6B",
  red: "#C0281E",
  orange: "#E8821A",
};

type BookingEmailData = {
  userEmail: string;
  userName: string;
  bayId: number;
  startTime: Date;
  endTime: Date;
};

let cachedClient: Resend | null = null;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

function from(): string {
  return process.env.FROM_EMAIL || "bookings@thepaddocksf.com";
}

function formatRange(start: Date, end: Date): string {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function layout(title: string, accent: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PALETTE.cream};font-family:'Helvetica Neue',Arial,sans-serif;color:${PALETTE.navy};">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:2px solid ${PALETTE.navy};">
        <tr><td style="background:${accent};padding:20px 24px;">
          <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:0.08em;text-transform:uppercase;">${title}</h1>
          <p style="margin:4px 0 0;color:#fff;font-size:13px;opacity:0.85;">The Paddock SF · Lift Bay Booking</p>
        </td></tr>
        <tr><td style="padding:24px;font-size:16px;line-height:1.5;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function detailsBlock(b: BookingEmailData): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:15px;">
    <tr><td style="padding:4px 16px 4px 0;color:${PALETTE.navy};opacity:0.7;">Bay</td><td style="padding:4px 0;"><strong>Bay ${b.bayId}</strong></td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:${PALETTE.navy};opacity:0.7;">When</td><td style="padding:4px 0;"><strong>${formatRange(b.startTime, b.endTime)}</strong></td></tr>
  </table>`;
}

async function send(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resend = client();
  if (!resend) {
    console.warn("[mail] RESEND_API_KEY not set — skipping send to", opts.to);
    return;
  }
  try {
    const result = await resend.emails.send({
      from: from(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (result.error) {
      console.error("[mail] send failed:", result.error);
    }
  } catch (err) {
    console.error("[mail] send threw:", err);
  }
}

export async function sendBookingConfirmation(b: BookingEmailData): Promise<void> {
  const html = layout(
    "Booking confirmed",
    PALETTE.navy,
    `<p>Hi ${b.userName},</p>
     <p>Your lift bay is reserved. See you at The Paddock.</p>
     ${detailsBlock(b)}
     <p style="font-size:13px;opacity:0.7;">Need to cancel? Sign in at ${process.env.APP_URL || ""} and remove it from My Bookings.</p>`,
  );
  await send({ to: b.userEmail, subject: `Booking confirmed · Bay ${b.bayId}`, html });
}

export async function sendBookingCancellation(b: BookingEmailData): Promise<void> {
  const html = layout(
    "Booking cancelled",
    PALETTE.red,
    `<p>Hi ${b.userName},</p>
     <p>Your booking has been cancelled.</p>
     ${detailsBlock(b)}
     <p style="font-size:13px;opacity:0.7;">If this wasn't you, contact an admin.</p>`,
  );
  await send({ to: b.userEmail, subject: `Booking cancelled · Bay ${b.bayId}`, html });
}

export async function sendBookingReminder(b: BookingEmailData): Promise<void> {
  const html = layout(
    "Reminder",
    PALETTE.orange,
    `<p>Hi ${b.userName},</p>
     <p>This is a heads-up that your lift bay booking is coming up in 24 hours.</p>
     ${detailsBlock(b)}`,
  );
  await send({ to: b.userEmail, subject: `Reminder · Bay ${b.bayId} tomorrow`, html });
}

export async function sendPasswordReset(opts: {
  userEmail: string;
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const html = layout(
    "Reset password",
    PALETTE.navy,
    `<p>Hi ${opts.userName},</p>
     <p>Click the link below to set a new password. The link expires in ${opts.expiresInMinutes} minutes.</p>
     <p style="margin:20px 0;">
       <a href="${opts.resetUrl}" style="display:inline-block;background:${PALETTE.orange};color:#fff;text-decoration:none;padding:12px 20px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Reset password</a>
     </p>
     <p style="font-size:13px;opacity:0.7;">If you didn't request this, you can ignore this email — your password won't change.</p>`,
  );
  await send({ to: opts.userEmail, subject: "Reset your Paddock booking password", html });
}
