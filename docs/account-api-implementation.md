# Account API 实现文档

## 📋 概述

实现了 `/api/account/*` 路由系统，提供账户信息查询功能，并增强了认证机制以验证用户是否有关联的账户。

## 🔧 实现的功能

### 1. 增强的认证中间件

**文件**: [`src/plugins/auth.js`](src/plugins/auth.js)

新增了 `fastify.authenticateWithAccount` 装饰器：

```javascript
fastify.authenticateWithAccount;
```

**功能流程**：

1. ✅ 验证 JWT token（Bearer token）
2. ✅ 从 token 中提取 `customerId`
3. ✅ 查询数据库检查该用户是否有关联的 `account`
4. ✅ 如果没有 account，返回 400 错误
5. ✅ 如果有 account，将 account 信息附加到 `request.user`

**返回错误**：

- **401 Unauthorized**: Token 缺失、无效或过期
- **400 Bad Request**: 用户没有关联的账户

**使用示例**：

```javascript
fastify.get(
  "/api/account/profile",
  {
    preHandler: fastify.authenticateWithAccount,
  },
  async (request, reply) => {
    // request.user 包含:
    // - customerId
    // - email
    // - deviceId
    // - account (账户基本信息)
  }
);
```

### 2. Account 路由

**文件**: [`src/routes/account.js`](src/routes/account.js)

实现了两个端点：

#### 2.1 `GET /api/account/profile`

获取当前用户的完整账户信息。

**认证**: 需要 `authenticateWithAccount` 中间件

**响应 200 OK**:

```json
{
  "success": true,
  "data": {
    "id": "account-uuid",
    "customerId": "customer-uuid",
    "accountType": "EVERYDAY", // 或 "CORPORATE"
    "businessType": null, // 或 "BUSINESS_OWNER", "TRUST_OWNER", "EMPLOYEE"
    "isActive": true,
    "plan": "BASIC", // 或 "STANDARD", "PREMIUM"
    "planUpdatedAt": "2026-01-17T00:00:00.000Z",
    "planStartAt": "2026-01-17T00:00:00.000Z",
    "planEndAt": null,
    "renewAt": null,
    "canceledAt": null,
    "createdAt": "2026-01-17T00:00:00.000Z",
    "updatedAt": "2026-01-17T00:00:00.000Z"
  }
}
```

**响应 400 Bad Request**:

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "No account found for this user. Please contact support."
}
```

**响应 401 Unauthorized**:

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Missing authorization header"
}
```

#### 2.2 `GET /api/account/status`

获取账户状态摘要（轻量级查询）。

**认证**: 需要 `authenticateWithAccount` 中间件

**响应 200 OK**:

```json
{
  "success": true,
  "data": {
    "isActive": true,
    "accountType": "EVERYDAY",
    "plan": "BASIC",
    "hasActivePlan": true // 计算字段：账户激活且未取消
  }
}
```

### 3. 增强的 Account Repository

**文件**: [`src/repo/account.js`](src/repo/account.js)

新增方法：

```javascript
// 根据账户 ID 查询
async findById(accountId)

// 更新账户
async update(accountId, data)

// 检查用户是否有活跃账户
async hasActiveAccount(customerId)
```

### 4. 路由注册

**文件**: [`src/routes/index.js`](src/routes/index.js)

已注册：

```javascript
fastify.register(accountRoutes, { prefix: "/api/account" });
```

## 🔄 请求生命周期

以 `GET /api/account/profile` 为例：

```
1. HTTP Request
   ↓
   GET /api/account/profile
   Headers: Authorization: Bearer <JWT_TOKEN>

2. Fastify 路由匹配
   ↓
   [routes/account.js]

3. preHandler: authenticateWithAccount
   ↓
   [plugins/auth.js]

   3.1 验证 Authorization header
   3.2 解析 Bearer token
   3.3 验证 JWT token → 获取 customerId
   3.4 查询 accounts 表
       accountRepo.findByCustomerId(customerId)

   ❌ 如果没有 account → 返回 400
   {
     "success": false,
     "error": "Bad Request",
     "message": "No account found for this user"
   }

   ✅ 如果有 account → 继续
   request.user = {
     customerId,
     email,
     deviceId,
     account: { id, accountType, isActive, plan, ... }
   }

4. Route Handler 执行
   ↓
   [routes/account.js: async (request, reply)]

   4.1 从 request.user 获取 customerId
   4.2 调用 accountRepo.findByCustomerId(customerId)
   4.3 格式化响应数据

5. HTTP Response
   ↓
   200 OK
   {
     "success": true,
     "data": { ... }
   }
```

## 🎯 关键设计要点

### 1. 防御性编程

即使 `authenticateWithAccount` 已验证 account 存在，route handler 中仍保留了二次检查：

```javascript
if (!account) {
  return reply.code(400).send({
    success: false,
    error: "Bad Request",
    message: "No account found for this user",
  });
}
```

### 2. 错误状态码选择

- **400 Bad Request**: 用户 ID 有效但没有关联账户（客户端错误）
- **401 Unauthorized**: Token 无效、过期或缺失（认证失败）
- **500 Internal Server Error**: 服务器内部错误

### 3. 日志记录

在关键节点记录日志：

```javascript
// 成功验证
fastify.log.debug({ customerId, accountId }, "Authentication with account verification successful");

// 验证失败
fastify.log.warn({ customerId }, "Customer has no associated account");

// 错误处理
request.log.error({ error }, "Failed to get account profile");
```

### 4. 性能优化

- `GET /api/account/status`: 使用已缓存在 `request.user.account` 中的数据，避免二次查询
- `GET /api/account/profile`: 需要完整数据，执行一次数据库查询

## 📊 数据流图

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/account/profile
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────┐
│  authenticateWithAccount        │
│  1. 验证 JWT token              │
│  2. 提取 customerId             │
│  3. 查询 accounts 表            │
└──────┬──────────────────────────┘
       │
       ├─ 没有 account ──→ 400 Bad Request
       │
       └─ 有 account
          │
          ▼
   ┌──────────────────┐
   │  Route Handler   │
   │  获取账户详情    │
   └────────┬─────────┘
            │
            ▼
      ┌──────────┐
      │ Database │
      │ accounts │
      └──────────┘
```

## 🧪 测试场景

测试文件: [`account-requests.http`](account-requests.http)

1. ✅ 正常请求 - 返回账户信息
2. ✅ 缺少 token - 返回 401
3. ✅ 无效 token 格式 - 返回 401
4. ✅ token 有效但用户无账户 - 返回 400
5. ✅ 过期 token - 返回 401

## 📝 下一步扩展建议

1. **更新账户信息**: `PATCH /api/account/profile`
2. **升级订阅计划**: `POST /api/account/upgrade`
3. **取消订阅**: `POST /api/account/cancel`
4. **账户历史记录**: `GET /api/account/history`
5. **企业账户特定功能**: `GET /api/account/corporate/*`

## 🔐 安全考虑

- ✅ JWT token 验证
- ✅ 用户只能访问自己的账户信息
- ✅ 敏感信息（如 planId）可根据需要过滤
- ✅ 完整的错误处理和日志记录
- ✅ 防止 SQL 注入（使用 Prisma ORM）

## 总结

实现了一个完整的账户查询系统，核心特点：

1. **双重验证**: JWT token + account 存在性验证
2. **清晰的错误处理**: 区分 401 认证错误和 400 业务错误
3. **符合 RESTful 规范**: 使用正确的 HTTP 状态码
4. **易于扩展**: 清晰的分层架构，便于添加新功能
