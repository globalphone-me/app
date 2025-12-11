import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),

    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  // Capture 100% of transactions for now (adjust down if huge traffic)
  tracesSampleRate: 1.0,

  // Define which outgoing requests get the 'sentry-trace' header
  // Add your production API domain here when you deploy!
  tracePropagationTargets: ["localhost", "https://globalphone.me"],

  // SESSION REPLAY
  // 0.0 = Don't record healthy sessions (Saves money/quota)
  replaysSessionSampleRate: 0.0,
  // 1.0 = Record 100% of sessions that crash
  replaysOnErrorSampleRate: 1.0,
});