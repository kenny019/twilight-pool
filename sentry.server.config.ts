import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f90f1ee4c4fed7a71073bc38e0f97742@o4511088694984704.ingest.de.sentry.io/4511088722313296",
  environment: process.env.NEXT_PUBLIC_TWILIGHT_NETWORK_TYPE || "development",
  tracesSampleRate: 0,
});
