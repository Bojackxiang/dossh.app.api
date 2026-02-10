/**
 * Repository for accounts table
 */
export class AccountsRepo {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create account for customer
   */
  async create(data) {
    const { id, customerId, accountType, businessType, plan, planStartAt, planEndAt } = data;

    return this.prisma.accounts.create({
      data: {
        id,
        customerId,
        accountType,
        businessType,
        plan,
        planStartAt,
        planEndAt,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find account by customerId
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object|null>} Account or null
   */
  async findByCustomerId(customerId) {
    return this.prisma.accounts.findUnique({
      where: { customerId },
    });
  }

  /**
   * Find account by account ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Account or null
   */
  async findById(accountId) {
    return this.prisma.accounts.findUnique({
      where: { id: accountId },
    });
  }

  /**
   * Update account
   * @param {string} accountId - Account ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated account
   */
  async update(accountId, data) {
    return this.prisma.accounts.update({
      where: { id: accountId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Check if customer has an active account
   * @param {string} customerId - Customer ID
   * @returns {Promise<boolean>} True if customer has active account
   */
  async hasActiveAccount(customerId) {
    const account = await this.findByCustomerId(customerId);
    return account ? account.isActive : false;
  }
}

export default AccountsRepo;
