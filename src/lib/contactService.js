/**
 * Posts the contact form to TextUtils' own endpoint (`/api/contact`), which
 * sends the mail. Nothing secret passes through here — the API key and the
 * destination address live only in the endpoint's environment; the browser
 * sees this JSON body and an ok/error back.
 *
 * Throws on failure with a message safe to show, so ContactView's try/catch
 * drives its error state.
 */
export async function submitContact(values) {
  let response;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    throw new Error("Couldn't reach the network. Please try again.");
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error ?? "Unable to send right now.");
  }
}
