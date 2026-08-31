/**
 * The contact endpoint's actual work, free of any host framework - the same
 * code runs behind the Vercel handler in api/contact.js and behind the
 * dev-server middleware in vite.config.js. Takes a parsed body + env, returns
 * { status, body }. Knows nothing about req/res shapes.
 *
 * Nothing here reaches the browser bundle. RESEND_API_KEY / CONTACT_EMAIL /
 * EMAIL_FROM live only in the environment of whatever runs this.
 *
 * Ported from the portfolio's api/_contact.ts.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 120, email: 200, message: 5000 };
const RATE_LIMIT = { windowMs: 60000, max: 3 };
const hits = new Map();

export function rateLimit(key, now = Date.now()) {
  const recent = (hits.get(key) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
    }
  }
  return true;
}

function clean(value, max) {
  if (typeof value !== "string") return "";
  // Strip control characters (header-injection guard); keep \n and \t.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "").trim().slice(0, max);
}

function cleanHeader(value, max) {
  return clean(value, max).replace(/[\r\n]+/g, " ");
}

export async function handleContact(payload, env, ip = "unknown") {
  const body = payload && typeof payload === "object" ? payload : {};

  // Honeypot - real people never see this field.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return { status: 200, body: { ok: true } };
  }

  if (!rateLimit(ip)) {
    return { status: 429, body: { ok: false, error: "Too many messages. Please wait a minute." } };
  }

  const name = cleanHeader(body.name, LIMITS.name);
  const email = cleanHeader(body.email, LIMITS.email);
  const message = clean(body.message, LIMITS.message);

  if (name.length < 2 || !EMAIL.test(email) || message.length < 10) {
    return { status: 400, body: { ok: false, error: "Please check the form and try again." } };
  }

  const key = env.RESEND_API_KEY;
  const to = env.CONTACT_EMAIL;
  const from = env.EMAIL_FROM || "TextUtils <onboarding@resend.dev>";
  if (!key || !to) {
    return {
      status: 503,
      body: {
        ok: false,
        error: "The contact form isn't configured on this deployment. Please email directly.",
      },
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `TextUtils - message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });
    if (!res.ok) {
      return { status: 502, body: { ok: false, error: "The mail service rejected the message." } };
    }
  } catch {
    return { status: 502, body: { ok: false, error: "Couldn't reach the mail service." } };
  }

  return { status: 200, body: { ok: true } };
}
