import { randomUUID } from "crypto";
import { CreateDeviceBody, DeviceListItem } from "../schemas/device.js";
import { SuccessResponse } from "../schemas/common.js";

export default async function deviceRoutes(fastify) {
  const { device: deviceRepo } = fastify.repos;

  // Create device route
  fastify.post(
    "/create",
    {
      schema: {
        tags: ["device"],
        description: "Register a new device",
        summary: "Create device",
        body: CreateDeviceBody,
        response: {
          201: SuccessResponse(DeviceListItem),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          id: providedId,
          customerId,
          deviceName,
          deviceType,
          os,
          osVersion,
          deviceFingerprint,
          ip,
          isActive,
          lastUsedAt,
        } = request.body;

        const id = providedId || randomUUID();

        const device = await deviceRepo.create({
          id,
          customerId,
          deviceName,
          deviceType,
          os,
          osVersion,
          deviceFingerprint,
          ip,
          isActive,
          lastUsedAt: lastUsedAt ? new Date(lastUsedAt) : undefined,
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: device.id,
            customerId: device.customerId,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            createdAt: device.createdAt,
          },
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: "Failed to create device",
          message: error.message,
        });
      }
    }
  );
}
