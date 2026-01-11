import { RefreshTokenBody, RefreshTokenResponse, AuthErrorResponse } from "../schemas/auth.js";
import { SuccessResponse } from "../schemas/common.js";
import { refreshAccessToken } from "../flow/auth-flow.js";

/**
 * Authentication routes
 * Handles token refresh and authentication-related endpoints
 */
export default async function authRoutes(fastify) {
  /**
   * Refresh access token
   * POST /auth/refresh
   *
   * Exchange a valid refresh token for a new access token and refresh token.
   * Implements token rotation for enhanced security.
   */
  fastify.post(
    "/refresh",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description:
          "Exchange a valid refresh token for a new access token and refresh token. " +
          "The old refresh token becomes invalid after use (token rotation).",
        body: RefreshTokenBody,
        headers: {
          type: "object",
          properties: {
            "x-device-id": {
              type: "string",
              description: "Optional device identifier for tracking",
            },
          },
        },
        response: {
          200: SuccessResponse(RefreshTokenResponse),
          401: AuthErrorResponse,
          403: AuthErrorResponse,
          500: AuthErrorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await refreshAccessToken(request, fastify);

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error({ error }, "Token refresh failed");

        // Handle specific error cases
        if (error.message.includes("expired")) {
          return reply.code(401).send({
            success: false,
            error: "Unauthorized",
            message: "Refresh token has expired",
          });
        }

        if (error.message.includes("inactive")) {
          return reply.code(403).send({
            success: false,
            error: "Forbidden",
            message: "Customer account is inactive",
          });
        }

        if (error.message.includes("Invalid") || error.message.includes("not found")) {
          return reply.code(401).send({
            success: false,
            error: "Unauthorized",
            message: "Invalid refresh token",
          });
        }

        // Generic server error
        return reply.code(500).send({
          success: false,
          error: "Internal Server Error",
          message: "Failed to refresh token",
        });
      }
    }
  );
}
