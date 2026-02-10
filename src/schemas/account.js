import { Type } from "@sinclair/typebox";

/**
 * Account Type enum
 */
export const AccountTypeEnum = Type.Union([Type.Literal("EVERYDAY"), Type.Literal("CORPORATE")]);

/**
 * Business Type enum
 */
export const BusinessTypeEnum = Type.Union([
  Type.Literal("BUSINESS_OWNER"),
  Type.Literal("TRUST_OWNER"),
  Type.Literal("EMPLOYEE"),
]);

/**
 * Plan Type enum
 */
export const PlanTypeEnum = Type.Union([
  Type.Literal("BASIC"),
  Type.Literal("STANDARD"),
  Type.Literal("PREMIUM"),
]);

/**
 * Update Account Body Schema
 * Users can update: accountType, businessType
 * Note: Plan-related fields should be updated through separate upgrade/subscription endpoints
 */
export const UpdateAccountBody = Type.Object(
  {
    accountType: Type.Optional(AccountTypeEnum),
    businessType: Type.Optional(Type.Union([BusinessTypeEnum, Type.Null()])),
  },
  {
    additionalProperties: false,
    minProperties: 1, // At least one field must be provided
  }
);

/**
 * Account Response Schema
 */
export const AccountResponse = Type.Object({
  id: Type.String(),
  customerId: Type.String(),
  accountType: AccountTypeEnum,
  businessType: Type.Union([BusinessTypeEnum, Type.Null()]),
  isActive: Type.Boolean(),
  plan: PlanTypeEnum,
  planUpdatedAt: Type.String({ format: "date-time" }),
  planStartAt: Type.String({ format: "date-time" }),
  planEndAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  renewAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  canceledAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

/**
 * Account ID Param Schema
 */
export const AccountIdParam = Type.Object({
  accountId: Type.String({
    description: "Account ID",
    minLength: 1,
  }),
});
