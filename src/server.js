import "../instrument.js"; // Initialize Sentry before anything else

import Fastify from "fastify";
import * as Sentry from "@sentry/node";

import { config } from "./config/config.js";
import { getLoggerConfig } from "./config/logger.js";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./routes/index.js";
import { HealthResponse } from "./schemas/common.js";

const fastify = Fastify({
  logger: getLoggerConfig(),
}).withTypeProvider();

fastify.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    tags: { route: request.routerPath || request.url },
    extra: {
      method: request.method,
      url: request.url,
      requestId: request.id,
    },
  });

  // Keep Fastify default error response behavior
  reply.send(error);
});

// Register app plugins and routes
await registerPlugins(fastify);
await registerRoutes(fastify);

fastify.get(
  "/health",
  {
    schema: {
      tags: ["health"],
      description: "Check if the API is running",
      summary: "Health check",
      response: {
        200: HealthResponse,
      },
    },
  },
  (request, reply) => {
    // Log context
    const ctx = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };

    // Fastify local log (see this in console)
    request.log.info(ctx, "GET /health hit");

    // end something visible to Sentry
    Sentry.withScope((scope) => {
      scope.setContext("http", ctx);
      Sentry.captureMessage("GET /health hit", "info");
    });

    return reply.code(200).send({
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
);

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });
    fastify.log.info(`Server listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await fastify.close();
    process.exit(0);
  });
});
