import { Type } from "@sinclair/typebox";

// Example route using Prisma
export default async function customersRoutes(fastify) {
  // 直接使用 fastify.prisma（简单查询）
  // 或者如果有 CustomersRepo，使用 fastify.repos.customers

  // GET /api/customers - Get all customers
  fastify.get(
    "/",
    {
      schema: {
        tags: ["customers"],
        description: "Get all customers",
        summary: "List customers",
        querystring: Type.Object({
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
          offset: Type.Optional(Type.Number({ minimum: 0 })),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String(),
                email: Type.String(),
                firstName: Type.Union([Type.String(), Type.Null()]),
                lastName: Type.Union([Type.String(), Type.Null()]),
                role: Type.String(),
                createdAt: Type.String(),
              })
            ),
            total: Type.Number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { limit = 10, offset = 0 } = request.query;

      const [customers, total] = await Promise.all([
        fastify.prisma.customers.findMany({
          take: limit,
          skip: offset,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        fastify.prisma.customers.count(),
      ]);

      return reply.code(200).send({
        success: true,
        data: customers,
        total,
      });
    }
  );

  // GET /api/customers/:id - Get customer by ID
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["customers"],
        description: "Get customer by ID",
        summary: "Get customer",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              id: Type.String(),
              email: Type.String(),
              firstName: Type.Union([Type.String(), Type.Null()]),
              lastName: Type.Union([Type.String(), Type.Null()]),
              username: Type.Union([Type.String(), Type.Null()]),
              role: Type.String(),
              emailVerified: Type.Boolean(),
              phoneVerified: Type.Boolean(),
              createdAt: Type.String(),
            }),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const customer = await fastify.prisma.customers.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
        },
      });

      if (!customer) {
        return reply.code(404).send({
          success: false,
          error: "Customer not found",
        });
      }

      return reply.code(200).send({
        success: true,
        data: customer,
      });
    }
  );
}
