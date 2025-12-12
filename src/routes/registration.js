import { Type } from "@sinclair/typebox";
import { randomUUID } from "crypto";

/**
 * Registration routes
 */
export default async function registrationRoutes(fastify) {
  const { registrationAttempts: registrationAttemptsRepo } = fastify.repos;

  // POST /api/registration/attempt - Record a registration attempt
  fastify.post(
    "/attempt",
    {
      schema: {
        tags: ["registration"],
        description: "Record a registration attempt",
        summary: "Create registration attempt",
        body: Type.Object({
          phone: Type.Optional(Type.String()),
          email: Type.Optional(Type.String()),
          action: Type.String(),
          result: Type.String(),
          reason: Type.Optional(Type.String()),
          deviceId: Type.Optional(Type.String()),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              id: Type.String(),
              action: Type.String(),
              result: Type.String(),
              createdAt: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { phone, email, action, result, reason, deviceId } = request.body;

      // Get IP from request
      const ip = request.ip;

      // Create registration attempt
      const attempt = await registrationAttemptsRepo.create({
        id: randomUUID(),
        phone,
        email,
        ip,
        deviceId,
        action,
        result,
        reason,
      });

      return reply.code(201).send({
        success: true,
        data: {
          id: attempt.id,
          action: attempt.action,
          result: attempt.result,
          createdAt: attempt.createdAt,
        },
      });
    }
  );

  // GET /api/registration/attempts/:id - Get attempt by ID
  fastify.get(
    "/attempts/:id",
    {
      schema: {
        tags: ["registration"],
        description: "Get registration attempt by ID",
        summary: "Get attempt",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Any(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const attempt = await registrationAttemptsRepo.findById(id);

      if (!attempt) {
        return reply.code(404).send({
          success: false,
          error: "Registration attempt not found",
        });
      }

      return reply.code(200).send({
        success: true,
        data: attempt,
      });
    }
  );

  // GET /api/registration/attempts/email/:email - Get attempts by email
  fastify.get(
    "/attempts/email/:email",
    {
      schema: {
        tags: ["registration"],
        description: "Get registration attempts by email",
        summary: "Get attempts by email",
        params: Type.Object({
          email: Type.String(),
        }),
        querystring: Type.Object({
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(Type.Any()),
            count: Type.Number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.params;
      const { limit = 10 } = request.query;

      const attempts = await registrationAttemptsRepo.findByEmail(email, limit);

      return reply.code(200).send({
        success: true,
        data: attempts,
        count: attempts.length,
      });
    }
  );

  // GET /api/registration/rate-limit/check - Check rate limit
  fastify.post(
    "/rate-limit/check",
    {
      schema: {
        tags: ["registration"],
        description: "Check rate limit for registration attempts",
        summary: "Check rate limit",
        body: Type.Object({
          email: Type.Optional(Type.String()),
          phone: Type.Optional(Type.String()),
          minutes: Type.Optional(Type.Number({ default: 60 })),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              failedAttempts: Type.Number(),
              isLimited: Type.Boolean(),
              message: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, phone, minutes = 60 } = request.body;
      const ip = request.ip;

      // Check recent failures
      const failedAttempts = await registrationAttemptsRepo.countRecentFailures(
        { email, phone, ip },
        minutes
      );

      // Define rate limit threshold (e.g., 5 failed attempts)
      const threshold = 5;
      const isLimited = failedAttempts >= threshold;

      return reply.code(200).send({
        success: true,
        data: {
          failedAttempts,
          isLimited,
          message: isLimited
            ? `Rate limit exceeded. ${failedAttempts} failed attempts in the last ${minutes} minutes.`
            : `${failedAttempts} failed attempts in the last ${minutes} minutes.`,
        },
      });
    }
  );
}
