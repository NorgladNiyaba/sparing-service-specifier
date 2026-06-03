// Email via Microsoft Graph API — client credentials flow (no user sign-in required).
// Required env vars (set in .env.local, and in your hosting platform's env config):
//   AZURE_TENANT_ID       — Azure AD Directory (tenant) ID
//   AZURE_CLIENT_ID       — App registration Application (client) ID
//   AZURE_CLIENT_SECRET   — App registration client secret value
//   EMAIL_FROM_ADDRESS    — Mailbox to send from (e.g. hello@sparingconsulting.com)
//
// No-ops gracefully when any of the above are missing (dev / pre-config).

const TENANT_ID     = process.env.AZURE_TENANT_ID;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const FROM_ADDRESS  = process.env.EMAIL_FROM_ADDRESS;

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.sparingconsulting.com";

function isConfigured() {
  return !!(TENANT_ID && CLIENT_ID && CLIENT_SECRET && FROM_ADDRESS);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        scope:         "https://graph.microsoft.com/.default",
      }),
    },
  );
  if (!res.ok) throw new Error(`Graph token request failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ── Send ─────────────────────────────────────────────────────────────────────

async function sendMail({
  to,
  subject,
  html,
  fromAddress = FROM_ADDRESS!,
  fromName    = "Sparing Consulting",
}: {
  to:           string;
  subject:      string;
  html:         string;
  fromAddress?: string;
  fromName?:    string;
}) {
  const token = await getAccessToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/sendMail`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          from: { emailAddress: { address: fromAddress, name: fromName } },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,  // appears in advisor's Sent Items in Outlook
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${body}`);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

function newDocumentHtml({
  clientFirstName,
  docName,
  folder,
  docType,
  advisorName,
  advisorEmail,
}: {
  clientFirstName: string;
  docName:         string;
  folder:          string;
  docType:         string;
  advisorName:     string;
  advisorEmail:    string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>New document shared</title>
</head>
<body style="margin:0;padding:0;background:#f3f3f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #ebecef;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0f0f11 0%,#1c0a09 55%,#0f0f11 100%);padding:28px 32px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#d61b17;border-radius:8px;width:28px;height:28px;text-align:center;line-height:28px;">
            <span style="color:#fff;font-size:13px;font-weight:700;">S</span>
          </td>
          <td style="padding-left:10px;">
            <span style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">Sparing</span><br/>
            <span style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:500;letter-spacing:0.08em;">CLIENT PORTAL</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">New document</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;letter-spacing:-0.025em;color:#171717;">
        Hi ${clientFirstName}, a new file is ready for you.
      </h1>

      <!-- Doc card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f9;border:1px solid #ebecef;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 20px;">
            <table cellpadding="0" cellspacing="0" width="100%"><tr>
              <td style="width:36px;vertical-align:top;">
                <div style="background:rgba(214,27,23,0.09);border-radius:8px;width:36px;height:36px;text-align:center;line-height:36px;">
                  <span style="color:#d61b17;font-size:9px;font-weight:700;letter-spacing:0.06em;">PDF</span>
                </div>
              </td>
              <td style="padding-left:12px;vertical-align:top;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#171717;">${docName}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
                  <span style="background:rgba(214,27,23,0.08);color:#d61b17;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;">${docType}</span>
                  &nbsp;·&nbsp;${folder}
                </p>
              </td>
            </tr></table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7280;">
        ${advisorName} has shared a new document with you. Sign in to your client portal to view and download it.
      </p>

      <a href="${PORTAL_URL}/portal/documents"
         style="display:inline-block;background:#d61b17;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">
        View in Portal →
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
        You're receiving this because you're a client of Sparing Consulting Inc.<br/>
        Questions? Reply to this email or contact
        <a href="mailto:${advisorEmail}" style="color:#d61b17;">${advisorEmail}</a>.
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
        To stop these notifications, update your preferences in
        <a href="${PORTAL_URL}/portal/settings" style="color:#9ca3af;">Settings</a>.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendNewDocumentNotification({
  toEmail,
  toName,
  docName,
  folder,
  docType,
  advisorName,
  advisorEmail,
  fromAddress,
}: {
  toEmail:      string;
  toName:       string;
  docName:      string;
  folder:       string;
  docType:      string;
  advisorName:  string;
  advisorEmail: string;
  fromAddress?: string;  // override sender — pass advisor's email for multi-advisor
}) {
  if (!isConfigured()) {
    console.info("[email] Azure Graph not configured — skipping notification for", toEmail);
    return;
  }

  try {
    await sendMail({
      to:          toEmail,
      subject:     `New document shared: ${docName}`,
      html:        newDocumentHtml({
        clientFirstName: toName.split(" ")[0] ?? toName,
        docName,
        folder,
        docType,
        advisorName,
        advisorEmail,
      }),
      fromAddress: fromAddress ?? FROM_ADDRESS!,
      fromName:    advisorName,
    });
  } catch (err) {
    console.error("[email] Failed to send new-document notification:", err);
  }
}
