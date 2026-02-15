import fp from "fastify-plugin";
import { verifyAccessToken } from "../lib/jwt.js";

/**
 * Authentication plugin for Fastify.
 * Provides fastify.authenticate decorator for JWT verification.
 */
async function authPlugin(fastify) {
  /**
   * JWT authentication decorator.
   * Verifies the Bearer token from Authorization header and attaches user data to request.
   *
   * @function authenticate
   * @param {Object} request - Fastify request object
   * @param {Object} reply - Fastify reply object
   * @throws {Error} 401 if token is missing, invalid, or expired
   *
   * @example
   * fastify.get('/protected', {
   *   preHandler: fastify.authenticate
   * }, async (request, reply) => {
   *   // request.user is available here
   *   const { customerId, email } = request.user;
   * });
   */
  fastify.decorate("authenticate", async (request, reply) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: "Unauthorized",
          message: "Missing authorization header",
        });
      }

      // Check for Bearer token format
      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return reply.code(401).send({
          success: false,
          error: "Unauthorized",
          message: "Invalid authorization header format. Expected: Bearer <token>",
        });
      }

      const token = parts[1];

      // Verify and decode token
      const decoded = verifyAccessToken(token);
      console.log("decoded: ", decoded);

      // Attach user data to request
      request.user = {
        customerId: decoded.customerId,
        email: decoded.email,
        deviceId: decoded.deviceId,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      fastify.log.error({ error }, "JWT verification failed");

      return reply.code(401).send({
        success: false,
        error: "Unauthorized",
        message: error.message || "Invalid or expired token",
      });
    }
  });

  /**
   * JWT authentication decorator with account verification.
   * Verifies the Bearer token AND checks if the customer has an associated account.
   * If accountId is provided in route params, also verifies ownership.
   * Use this for account-related endpoints.
   *
   * @function authenticateWithAccount
   * @param {Object} request - Fastify request object
   * @param {Object} reply - Fastify reply object
   * @throws {Error} 401 if token is missing, invalid, or expired
   * @throws {Error} 400 if customer has no associated account
   * @throws {Error} 403 if user tries to access/modify another user's account
   *
   * @example
   * // For GET /api/account/profile (no accountId param)
   * fastify.get('/api/account/profile', {
   *   preHandler: fastify.authenticateWithAccount
   * }, async (request, reply) => {
   *   // request.user is available here with verified account
   *   const { customerId, email, account } = request.user;
   * });
   *
   * @example
   * // For PATCH /api/account/:accountId (with accountId param)
   * fastify.patch('/api/account/:accountId', {
   *   preHandler: fastify.authenticateWithAccount
   * }, async (request, reply) => {
   *   // Automatically verifies that params.accountId belongs to this user
   *   const { accountId } = request.params; // Guaranteed to be user's own account
   * });
   */
  fastify.decorate("authenticateWithAccount", async (request, reply) => {
    try {
      // Step 1: Verify JWT token
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          error: "Unauthorized",
          message: "Missing authorization header",
        });
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return reply.code(401).send({
          success: false,
          error: "Unauthorized",
          message: "Invalid authorization header format. Expected: Bearer <token>",
        });
      }

      const token = parts[1];
      const decoded = verifyAccessToken(token);

      // Step 2: Check if customer has an associated account
      const { account: accountRepo } = fastify.repos;
      const account = await accountRepo.findByCustomerId(decoded.customerId);

      if (!account) {
        fastify.log.warn({ customerId: decoded.customerId }, "Customer has no associated account");
        return reply.code(400).send({
          success: false,
          error: "Bad Request",
          message: "No account found for this user. Please contact support.",
        });
      }

      // Step 3: If accountId is in route params, verify ownership
      if (request.params && request.params.accountId) {
        const requestedAccountId = request.params.accountId;

        if (account.id !== requestedAccountId) {
          fastify.log.warn(
            {
              customerId: decoded.customerId,
              userAccountId: account.id,
              requestedAccountId,
            },
            "User attempting to access another user's account"
          );
          return reply.code(403).send({
            success: false,
            error: "Forbidden",
            message: "You are not authorized to access or modify this account.",
          });
        }

        fastify.log.debug(
          { customerId: decoded.customerId, accountId: requestedAccountId },
          "Account ownership verified"
        );
      }

      // Step 4: Attach user data with account info to request
      request.user = {
        customerId: decoded.customerId,
        email: decoded.email,
        deviceId: decoded.deviceId,
        iat: decoded.iat,
        exp: decoded.exp,
        account: {
          id: account.id,
          accountType: account.accountType,
          businessType: account.businessType,
          isActive: account.isActive,
          plan: account.plan,
        },
      };

      fastify.log.debug(
        { customerId: decoded.customerId, accountId: account.id },
        "Authentication with account verification successful"
      );
    } catch (error) {
      fastify.log.error({ error }, "JWT verification failed");

      return reply.code(401).send({
        success: false,
        error: "Unauthorized",
        message: error.message || "Invalid or expired token",
      });
    }
  });

  fastify.log.info("Authentication plugin registered");
}

export default fp(authPlugin);
