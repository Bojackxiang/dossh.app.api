import jwt from "jsonwebtoken";

/**
 * Generate a JWT access token for authentication.
 *
 * @function
 * @param {Object} params - Parameters required to generate the token.
 * @param {string|number} params.customerId - Unique user identifier (customerId), used as JWT subject (sub).
 * @param {string} params.email - User email address.
 * @param {string} [params.deviceId] - Device unique identifier (optional).
 * @returns {string} JWT access token string.
 *
 * @example
 * const token = generateAccessToken({ customerId: 123, email: 'user@example.com', deviceId: 'device-001' });
 */
export const generateAccessToken = ({ customerId, email, deviceId }) => {
  const payload = {
    sub: customerId,
    email,
    deviceId,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

/**
 * Generate a JWT refresh token for obtaining new access tokens.
 *
 * Refresh tokens have a longer lifespan and should be stored securely.
 * Consider storing refresh tokens in the database to enable revocation.
 *
 * @function
 * @param {Object} params - Parameters required to generate the refresh token.
 * @param {string|number} params.customerId - Unique user identifier (customerId), used as JWT subject (sub).
 * @param {string} [params.tokenId] - Unique token identifier (jti) for tracking and revocation (optional).
 * @returns {string} JWT refresh token string.
 *
 * @example
 * const refreshToken = generateRefreshToken({ customerId: 123, tokenId: 'uuid-v4-token-id' });
 */
export const generateRefreshToken = ({ customerId, tokenId }) => {
  const payload = {
    sub: customerId,
    type: "refresh",
  };

  if (tokenId) {
    payload.jti = tokenId;
  }

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
