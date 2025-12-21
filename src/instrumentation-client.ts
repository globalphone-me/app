import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ignore expected/noisy errors
  ignoreErrors: [
    /websocket close event code: 1001/,
  ],

  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  // Capture 100% of transactions for now (adjust down if huge traffic)
  tracesSampleRate: 1.0,

  // Define which outgoing requests get the 'sentry-trace' header
  // Add your production API domain here when you deploy!
  tracePropagationTargets: ["localhost", "https://globalphone.me"],

  // SESSION REPLAY - Disabled to reduce Sentry usage
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,

  // Reduce noise: Filter out console logs that clutter breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    if (breadcrumb.category === 'console') {
      // Example: Filter out generic "log" messages or specific noisy libraries
      // if (breadcrumb.level === 'info') return null;

      // If you want to keep logs but remove the massive ones:
      if (breadcrumb.message && breadcrumb.message.includes('[HMR]')) return null;
    }
    return breadcrumb;
  },
});