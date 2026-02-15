import { Type } from "@sinclair/typebox";
import { SuccessResponse } from "../schemas/common.js";
import { UpdateAccountBody, AccountResponse, AccountIdParam } from "../schemas/account.js";
import { updateAccountInfo } from "../flow/account-flow.js";

/**
 * Account routes
 * Handles account-related endpoints
 */
export default async function accountRoutes(fastify) {
  /**
   * GET /api/account/profile - Get current user's account information
   * Requires authentication and account verification
   */
  fastify.get(
    "/profile",
    {
      preHandler: fastify.authenticateWithAccount,
      schema: {
        tags: ["account"],
        description: "Get authenticated user's account information",
        summary: "Get account profile (requires authentication)",
        security: [{ bearerAuth: [] }],
        response: {
          200: SuccessResponse(
            Type.Object({
              id: Type.String(),
              customerId: Type.String(),
              accountType: Type.Union([Type.Literal("EVERYDAY"), Type.Literal("CORPORATE")]),
              businessType: Type.Union([
                Type.Literal("BUSINESS_OWNER"),
                Type.Literal("TRUST_OWNER"),
                Type.Literal("EMPLOYEE"),
                Type.Null(),
              ]),
              isActive: Type.Boolean(),
              plan: Type.Union([
                Type.Literal("BASIC"),
                Type.Literal("STANDARD"),
                Type.Literal("PREMIUM"),
              ]),
              planUpdatedAt: Type.String({ format: "date-time" }),
              planStartAt: Type.String({ format: "date-time" }),
              planEndAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
              renewAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
              canceledAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
              createdAt: Type.String({ format: "date-time" }),
              updatedAt: Type.String({ format: "date-time" }),
            })
          ),
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { customerId } = request.user;

        // Get full account details
        const { account: accountRepo } = fastify.repos;
        const account = await accountRepo.findByCustomerId(customerId);

        // This should never happen due to authenticateWithAccount middleware
        // but we keep it for defensive programming
        if (!account) {
          return reply.code(400).send({
            success: false,
            error: "Bad Request",
            message: "No account found for this user",
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            id: account.id,
            customerId: account.customerId,
            accountType: account.accountType,
            businessType: account.businessType,
            isActive: account.isActive,
            plan: account.plan,
            planUpdatedAt: account.planUpdatedAt.toISOString(),
            planStartAt: account.planStartAt.toISOString(),
            planEndAt: account.planEndAt ? account.planEndAt.toISOString() : null,
            renewAt: account.renewAt ? account.renewAt.toISOString() : null,
            canceledAt: account.canceledAt ? account.canceledAt.toISOString() : null,
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get account profile");

        return reply.code(500).send({
          success: false,
          error: "Internal Server Error",
          message: "Failed to retrieve account information",
        });
      }
    }
  );

  /**
   * GET /api/account/status - Get account status summary
   * Quick endpoint to check account status
   */
  fastify.get(
    "/status",
    {
      preHandler: fastify.authenticateWithAccount,
      schema: {
        tags: ["account"],
        description: "Get account status summary",
        summary: "Get account status",
        security: [{ bearerAuth: [] }],
        response: {
          200: SuccessResponse(
            Type.Object({
              isActive: Type.Boolean(),
              accountType: Type.String(),
              plan: Type.String(),
              hasActivePlan: Type.Boolean(),
            })
          ),
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        // Account info is already available from authenticateWithAccount
        const { account } = request.user;

        const now = new Date();
        const hasActivePlan =
          account.isActive && (!account.canceledAt || new Date(account.canceledAt) > now);

        return reply.code(200).send({
          success: true,
          data: {
            isActive: account.isActive,
            accountType: account.accountType,
            plan: account.plan,
            hasActivePlan,
          },
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get account status");

        return reply.code(500).send({
          success: false,
          error: "Internal Server Error",
          message: "Failed to retrieve account status",
        });
      }
    }
  );

  /**
   * PATCH /api/account/:accountId - Update account information
   * Requires authentication and ownership verification
   */
  fastify.patch(
    "/:accountId",
    {
      preHandler: fastify.authenticateWithAccount,
      schema: {
        tags: ["account"],
        description: "Update account information (accountType, businessType)",
        summary: "Update account (requires authentication and ownership)",
        security: [{ bearerAuth: [] }],
        params: AccountIdParam,
        body: UpdateAccountBody,
        response: {
          200: SuccessResponse(AccountResponse),
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
          403: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
          500: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const updatedAccount = await updateAccountInfo(request, fastify);

        return reply.code(200).send({
          success: true,
          data: {
            id: updatedAccount.id,
            customerId: updatedAccount.customerId,
            accountType: updatedAccount.accountType,
            businessType: updatedAccount.businessType,
            isActive: updatedAccount.isActive,
            plan: updatedAccount.plan,
            planUpdatedAt: updatedAccount.planUpdatedAt.toISOString(),
            planStartAt: updatedAccount.planStartAt.toISOString(),
            planEndAt: updatedAccount.planEndAt ? updatedAccount.planEndAt.toISOString() : null,
            renewAt: updatedAccount.renewAt ? updatedAccount.renewAt.toISOString() : null,
            canceledAt: updatedAccount.canceledAt ? updatedAccount.canceledAt.toISOString() : null,
            createdAt: updatedAccount.createdAt.toISOString(),
            updatedAt: updatedAccount.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update account");

        // Handle specific errors
        if (error.message.includes("Unauthorized")) {
          return reply.code(403).send({
            success: false,
            error: "Forbidden",
            message: error.message,
          });
        }

        if (
          error.message.includes("required") ||
          error.message.includes("Business type") ||
          error.message.includes("not found")
        ) {
          return reply.code(400).send({
            success: false,
            error: "Bad Request",
            message: error.message,
          });
        }

        // Generic server error
        return reply.code(500).send({
          success: false,
          error: "Internal Server Error",
          message: "Failed to update account information",
        });
      }
    }
  );
}
