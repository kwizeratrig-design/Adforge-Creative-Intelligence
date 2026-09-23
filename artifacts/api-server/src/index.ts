import app from "./app";
import { logger } from "./lib/logger";

// Vercel (and similar platforms) import the Express app as a serverless handler.
// Only bind a port when running as a long-lived Node process.
const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  const rawPort = process.env["PORT"] ?? "5000";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

export default app;
