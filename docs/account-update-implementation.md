# Account 更新功能实现文档

## 📋 概述

实现了 `PATCH /api/account/:accountId` 端点，允许用户更新自己的账户信息，并增强了认证插件以验证账户所有权。

## 🔧 实现的核心功能

### 1. 增强的认证插件 - 所有权验证

**文件**: [src/plugins/auth.js](../src/plugins/auth.js)

#### 新增功能：`accountId` 参数验证

`authenticateWithAccount` 装饰器现在会自动检查路由参数中的 `accountId`：

```javascript
// Step 3: If accountId is in route params, verify ownership
if (request.params && request.params.accountId) {
  const requestedAccountId = request.params.accountId;

  if (account.id !== requestedAccountId) {
    // 返回 403 Forbidden
    return reply.code(403).send({
      success: false,
      error: "Forbidden",
      message: "You are not authorized to access or modify this account.",
    });
  }
}
```

#### 验证流程

```
1. 验证 JWT token → 获取 customerId
   ↓
2. 查询该用户的 account → 获取 account.id
   ↓
3. 检查路由参数中是否有 accountId
   ↓
4. 对比 account.id === params.accountId
   ↓
   ├─ ✅ 匹配 → 继续处理
   └─ ❌ 不匹配 → 返回 403 Forbidden
```

### 2. 账户更新路由

**文件**: [src/routes/account.js](../src/routes/account.js)

#### 端点：`PATCH /api/account/:accountId`

**请求格式**:

```http
PATCH /api/account/{accountId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountType": "CORPORATE",
  "businessType": "BUSINESS_OWNER"
}
```

**可更新字段**（根据 Prisma Schema 分析）:

- ✅ `accountType`: `"EVERYDAY"` | `"CORPORATE"`
- ✅ `businessType`: `"BUSINESS_OWNER"` | `"TRUST_OWNER"` | `"EMPLOYEE"` | `null`

**不可更新字段**:

- ❌ `id` - 主键
- ❌ `customerId` - 外键，关联关系
- ❌ `plan`, `planId`, `planStartAt`, `planEndAt`, `renewAt` - 订阅相关，需通过专门的升级端点
- ❌ `isActive` - 账户状态，需管理员权限
- ❌ `createdAt`, `updatedAt` - 自动管理

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "account-uuid",
    "customerId": "customer-uuid",
    "accountType": "CORPORATE",
    "businessType": "BUSINESS_OWNER",
    "isActive": true,
    "plan": "BASIC",
    "planUpdatedAt": "2026-01-17T00:00:00.000Z",
    "planStartAt": "2026-01-17T00:00:00.000Z",
    "planEndAt": null,
    "renewAt": null,
    "canceledAt": null,
    "createdAt": "2026-01-17T00:00:00.000Z",
    "updatedAt": "2026-01-17T10:30:00.000Z"
  }
}
```

### 3. 业务逻辑层

**文件**: [src/flow/account-flow.js](../src/flow/account-flow.js)

#### 业务规则验证

1. **企业账户规则**:

   ```javascript
   if (accountType === "CORPORATE" && !businessType) {
     throw new Error("Business type is required for corporate accounts");
   }
   ```

2. **个人账户规则**:

   ```javascript
   if (accountType === "EVERYDAY" && businessType) {
     // 自动清除 businessType
     updateData.businessType = null;
   }
   ```

3. **所有权二次验证** (防御性编程):
   ```javascript
   if (currentAccount.id !== accountId) {
     throw new Error("Unauthorized to update this account");
   }
   ```

### 4. Schema 定义

**文件**: [src/schemas/account.js](../src/schemas/account.js)

#### 更新请求 Body Schema

```javascript
export const UpdateAccountBody = Type.Object(
  {
    accountType: Type.Optional(AccountTypeEnum),
    businessType: Type.Optional(Type.Union([BusinessTypeEnum, Type.Null()])),
  },
  {
    additionalProperties: false, // 不允许额外字段
    minProperties: 1, // 至少需要一个字段
  }
);
```

#### 路径参数 Schema

```javascript
export const AccountIdParam = Type.Object({
  accountId: Type.String({
    description: "Account ID",
    minLength: 1,
  }),
});
```

## 🔄 完整请求流程

### 场景：用户更新自己的账户类型

```
用户请求
   ↓
PATCH /api/account/acc-123
Headers: Authorization: Bearer <token>
Body: { "accountType": "CORPORATE", "businessType": "BUSINESS_OWNER" }
   ↓
┌────────────────────────────────────────────┐
│  1. Fastify 路由匹配                        │
│     匹配到: PATCH /api/account/:accountId  │
└──────────────┬─────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────┐
│  2. preHandler 执行                         │
│     触发: fastify.authenticateWithAccount  │
└──────────────┬─────────────────────────────┘
               │
               ↓
┌────────────────────────────────────────────┐
│  3. [auth.js] authenticateWithAccount      │
│                                             │
│  3.1 验证 JWT token                         │
│      → 获取 customerId                      │
│                                             │
│  3.2 查询 accounts 表                       │
│      → accountRepo.findByCustomerId()      │
│      → 获取 account.id = "acc-456"         │
│                                             │
│  3.3 验证所有权                             │
│      params.accountId = "acc-123"          │
│      account.id = "acc-456"                │
│      "acc-123" !== "acc-456"               │
└──────────────┬─────────────────────────────┘
               │
               ├─ ❌ 账户不匹配
               │    └→ 返回 403 Forbidden
               │       {
               │         "success": false,
               │         "error": "Forbidden",
               │         "message": "You are not authorized..."
               │       }
               │
               └─ ✅ 账户匹配 (acc-123 === acc-123)
                    │
                    ↓
               ┌────────────────────────────┐
               │  4. Route Handler 执行      │
               │     调用 updateAccountInfo  │
               └──────────┬─────────────────┘
                          │
                          ↓
               ┌────────────────────────────┐
               │  5. [account-flow.js]      │
               │                             │
               │  5.1 二次所有权验证         │
               │  5.2 业务规则验证           │
               │      → CORPORATE 需要       │
               │         businessType       │
               │  5.3 调用 Repository        │
               │      → accountRepo.update() │
               └──────────┬─────────────────┘
                          │
                          ↓
               ┌────────────────────────────┐
               │  6. [account.js Repository]│
               │     更新数据库              │
               └──────────┬─────────────────┘
                          │
                          ↓
               ┌────────────────────────────┐
               │  7. Prisma ORM             │
               │     UPDATE accounts        │
               │     SET accountType = ...  │
               │     WHERE id = 'acc-123'   │
               └──────────┬─────────────────┘
                          │
                          ↓
                    返回 200 OK
                    {
                      "success": true,
                      "data": { 更新后的账户 }
                    }
```

## 🛡️ 安全验证机制

### 多层安全验证

1. **JWT Token 验证** (401 Unauthorized)
   - 验证 token 格式
   - 验证 token 有效性和过期时间

2. **Account 存在性验证** (400 Bad Request)
   - 验证用户是否有关联的账户

3. **所有权验证** (403 Forbidden)
   - 验证用户只能更新自己的账户
   - 对比 `request.user.account.id` === `request.params.accountId`

4. **业务规则验证** (400 Bad Request)
   - 企业账户必须有 businessType
   - 个人账户不能有 businessType

### 错误响应对照表

| 状态码 | 场景                      | 响应消息                                                  |
| ------ | ------------------------- | --------------------------------------------------------- |
| 400    | 用户没有账户              | "No account found for this user"                          |
| 400    | 企业账户缺少 businessType | "Business type is required for corporate accounts"        |
| 400    | 请求体验证失败            | Schema 验证错误                                           |
| 401    | Token 缺失                | "Missing authorization header"                            |
| 401    | Token 无效或过期          | "Invalid or expired token"                                |
| 403    | 尝试更新别人的账户        | "You are not authorized to access or modify this account" |
| 500    | 服务器内部错误            | "Failed to update account information"                    |

## 📝 使用示例

### 1. 将个人账户升级为企业账户

```http
PATCH /api/account/acc-123
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "accountType": "CORPORATE",
  "businessType": "BUSINESS_OWNER"
}
```

### 2. 修改企业类型

```http
PATCH /api/account/acc-123
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "businessType": "TRUST_OWNER"
}
```

### 3. 降级回个人账户

```http
PATCH /api/account/acc-123
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "accountType": "EVERYDAY"
}
```

_注：businessType 会自动设为 null_

## 🧪 测试场景

详见 [account-requests.http](../account-requests.http)

1. ✅ 正常更新 - 返回 200
2. ✅ 尝试更新别人的账户 - 返回 403
3. ✅ 企业账户缺少 businessType - 返回 400
4. ✅ Token 缺失或无效 - 返回 401
5. ✅ 用户没有账户 - 返回 400

## 📊 数据库字段更新规则

根据 Prisma Schema 分析：

| 字段            | 是否可更新 | 更新方式 | 备注                 |
| --------------- | ---------- | -------- | -------------------- |
| `id`            | ❌         | -        | 主键，不可变         |
| `customerId`    | ❌         | -        | 外键，不可变         |
| `accountType`   | ✅         | 用户更新 | EVERYDAY ↔ CORPORATE |
| `businessType`  | ✅         | 用户更新 | 企业账户必填         |
| `isActive`      | ❌         | 管理员   | 需要管理员权限       |
| `planId`        | ❌         | 订阅端点 | 通过专门的升级端点   |
| `plan`          | ❌         | 订阅端点 | 通过专门的升级端点   |
| `planUpdatedAt` | ❌         | 自动     | 订阅变更时自动更新   |
| `planStartAt`   | ❌         | 订阅端点 | 订阅开始时间         |
| `planEndAt`     | ❌         | 订阅端点 | 订阅结束时间         |
| `renewAt`       | ❌         | 订阅端点 | 续费时间             |
| `canceledAt`    | ❌         | 取消端点 | 取消订阅时间         |
| `createdAt`     | ❌         | 自动     | 创建时间             |
| `updatedAt`     | ❌         | 自动     | 每次更新自动设置     |

## 🎯 关键代码片段

### authenticateWithAccount 中的所有权验证

```javascript
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
    {
      customerId: decoded.customerId,
      accountId: requestedAccountId,
    },
    "Account ownership verified"
  );
}
```

### 业务规则验证

```javascript
// 企业账户必须有 businessType
if (updateData.accountType === "CORPORATE" && !updateData.businessType) {
  const existingAccount = await accountRepo.findById(accountId);
  if (!existingAccount.businessType && !updateData.businessType) {
    throw new Error("Business type is required for corporate accounts");
  }
}

// 个人账户自动清除 businessType
if (updateData.accountType === "EVERYDAY" && updateData.businessType) {
  logger.warn({ accountId, accountType: "EVERYDAY" }, "Removing businessType for EVERYDAY account");
  updateData.businessType = null;
}
```

## 🚀 总结

实现了完整的账户更新功能，具备以下特点：

1. ✅ **严格的权限控制**: 用户只能更新自己的账户
2. ✅ **自动所有权验证**: 插件级别验证，无需在每个端点重复代码
3. ✅ **业务规则保护**: 确保数据一致性（如企业账户必须有 businessType）
4. ✅ **清晰的错误提示**: 不同场景返回不同的错误码和消息
5. ✅ **防御性编程**: 多层验证确保安全
6. ✅ **可扩展性**: 易于添加新的更新字段或验证规则
