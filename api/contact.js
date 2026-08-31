import { handleContact } from "./_contact.js";

/** Vercel serverless entry. Deploy with RESEND_API_KEY + CONTACT_EMAIL set. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    res.status(400).json({ ok: false, error: "Malformed request." });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const result = await handleContact(payload, process.env, ip);
  res.status(result.status).json(result.body);
}
