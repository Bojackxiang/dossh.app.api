import { Type } from "@sinclair/typebox";

/**
 * Request body schema for refresh token endpoint
 */
export const RefreshTokenBody = Type.Object({
  refreshToken: Type.String({
    minLength: 1,
    description: "JWT refresh token",
  }),
});

/**
 * Response schema for successful token refresh
 */
export const RefreshTokenResponse = Type.Object({
  accessToken: Type.String({
    description: "New JWT access token",
  }),
  refreshToken: Type.String({
    description: "New JWT refresh token (token rotation)",
  }),
  expiresIn: Type.Number({
    description: "Access token expiration time in seconds",
  }),
  tokenType: Type.String({
    description: "Token type (Bearer)",
  }),
});

/**
 * Error response schema for authentication errors
 */
export const AuthErrorResponse = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
});
