/**
 * Update account information with validation
 *
 * @function
 * @param {Object} request - Fastify request object
 * @param {Object} fastify - Fastify instance
 * @returns {Promise<Object>} Updated account
 */
export const updateAccountInfo = async (request, fastify) => {
  const { account: accountRepo } = fastify.repos;
  const logger = request.log;
  const { accountId } = request.params;
  const updateData = request.body;

  logger.info({ accountId, updateData }, "Starting account update");

  // Ownership verification is already done by authenticateWithAccount middleware
  // But we double-check for defensive programming
  const currentAccount = request.user.account;
  if (currentAccount.id !== accountId) {
    throw new Error("Unauthorized to update this account");
  }

  // Validate business logic rules
  if (updateData.accountType === "CORPORATE" && !updateData.businessType) {
    // If switching to CORPORATE, businessType is required
    const existingAccount = await accountRepo.findById(accountId);
    if (!existingAccount.businessType && !updateData.businessType) {
      throw new Error("Business type is required for corporate accounts");
    }
  }

  if (updateData.accountType === "EVERYDAY" && updateData.businessType) {
    // EVERYDAY accounts should not have businessType
    logger.warn(
      { accountId, accountType: "EVERYDAY", businessType: updateData.businessType },
      "Removing businessType for EVERYDAY account"
    );
    updateData.businessType = null;
  }

  // Update account
  const updatedAccount = await accountRepo.update(accountId, updateData);

  logger.info({ accountId }, "Account information updated successfully");
  return updatedAccount;
};
