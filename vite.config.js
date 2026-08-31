/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Serves POST /api/contact during `npm run dev` by mounting the SAME handler
 * module the deployed function uses (api/_contact.js), so local dev exercises
 * the real validation, honeypot, rate limiting and payload building.
 * Dev only; nothing here reaches the client bundle. RESEND_* load with the
 * empty prefix so they stay unprefixed and unreachable from the browser.
 */
function contactApiDevServer() {
  return {
    name: "contact-api-dev-server",
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), "") };
      server.middlewares.use("/api/contact", async (req, res) => {
        const send = (status, body) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return send(405, { ok: false, error: "Method not allowed." });

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        let payload;
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        } catch {
          return send(400, { ok: false, error: "Malformed request." });
        }
        const { handleContact } = await server.ssrLoadModule("/api/_contact.js");
        const result = await handleContact(payload, env, req.socket.remoteAddress ?? "dev");
        send(result.status, result.body);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), contactApiDevServer()],
  test: {
    // Pure lib tests run in Node (fast). Component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
