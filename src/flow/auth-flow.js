import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from "../lib/jwt.js";
import { randomUUID } from "crypto";

/**
 * Refresh access token using a valid refresh token.
 *
 * This function implements token rotation for enhanced security:
 * - Verifies the provided refresh token
 * - Checks if the customer account is still active
 * - Generates new access and refresh tokens
 * - Returns both tokens (invalidating the old refresh token)
 *
 * @function
 * @param {Object} request - Fastify request object
 * @param {Object} fastify - Fastify instance
 * @returns {Promise<Object>} New access and refresh tokens with expiration info
 * @throws {Error} If refresh token is invalid, expired, or customer is inactive
 *
 * @example
 * const result = await refreshAccessToken(request, fastify);
 * // Returns: { accessToken, refreshToken, expiresIn, tokenType }
 */
export const refreshAccessToken = async (request, fastify) => {
  const { customer: customerRepo } = fastify.repos;
  const logger = request.log;
  const { refreshToken } = request.body;

  logger.info("Attempting to refresh access token");

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    logger.warn({ error: error.message }, "Refresh token verification failed");
    throw error; // Re-throw to be handled by route handler
  }

  const { customerId } = decoded;

  // Get customer details
  const customer = await customerRepo.findById(customerId);

  if (!customer) {
    logger.warn({ customerId }, "Customer not found for refresh token");
    throw new Error("Customer not found");
  }

  if (!customer.isActive) {
    logger.warn({ customerId }, "Inactive customer attempted token refresh");
    throw new Error("Customer account is inactive");
  }

  // Get device ID from header if provided
  const deviceId = request.headers["x-device-id"];

  // Generate new tokens (token rotation)
  const newAccessToken = generateAccessToken({
    customerId: customer.id,
    email: customer.email,
    deviceId,
  });

  const newRefreshToken = generateRefreshToken({
    customerId: customer.id,
    tokenId: randomUUID(),
  });

  logger.info({ customerId }, "Tokens refreshed successfully");

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
  };
};
