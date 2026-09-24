import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// Sprint 34: baseline security headers on every response (pages, server
// functions, and error pages alike). script-src/style-src need
// 'unsafe-inline' because TanStack Router injects inline hydration
// <script> tags (ScriptOnce/Asset) with no nonce mechanism available in
// this version — documented limitation, see SECURITY.md. connect-src is
// scoped to this app's own Supabase project (REST + Realtime websocket)
// since that's the only external endpoint the browser talks to directly;
// every AI/Judge0/Stripe call happens server-side (grepped: zero
// non-.server.ts files fetch an external host).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseWsUrl = supabaseUrl?.replace(/^https:/, "wss:");
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl}` : ""}${supabaseWsUrl ? ` ${supabaseWsUrl}` : ""}`,
].join("; ");

function applySecurityHeaders(response: Response) {
  try {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    );
    response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  } catch {
    // Some response shapes (e.g. an already-sent stream) have immutable
    // headers — skip rather than reconstruct the response and risk
    // breaking SSR streaming.
  }
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const ctx = await next();
  // Cast to unknown: ctx.response's declared type doesn't include the
  // internal SsrResponse wrapper shape ({ response, serverSsrCleanup })
  // that streaming SSR can actually produce at runtime (confirmed by
  // reading @tanstack/router-core's ssr/handlerCallback.js) — this stays
  // a defensive runtime check rather than fighting that narrower type.
  const res: unknown = ctx.response;
  if (res instanceof Response) {
    applySecurityHeaders(res);
  } else if (res && typeof res === "object" && "response" in res) {
    const inner = (res as { response: unknown }).response;
    if (inner instanceof Response) applySecurityHeaders(inner);
  }
  return ctx;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
