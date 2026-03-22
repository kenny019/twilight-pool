import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://o4511088694984704.ingest.de.sentry.io/4511088722313296",
  environment: process.env.NEXT_PUBLIC_TWILIGHT_NETWORK_TYPE || "development",
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
