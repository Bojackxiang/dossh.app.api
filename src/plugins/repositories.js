import fp from "fastify-plugin";
import RegistrationAttemptsRepo from "../repo/registration_attempts.js";
import DeviceRepo from "../repo/device.js";

async function repositoriesPlugin(fastify) {
  if (!fastify.prisma) {
    throw new Error("Prisma plugin must be registered before repositories plugin");
  }

  const repositories = {
    registrationAttempts: new RegistrationAttemptsRepo(fastify.prisma),
    device: new DeviceRepo(fastify.prisma),
  };

  fastify.decorate("repos", repositories);

  fastify.log.info("Repositories initialized successfully");
}

export default fp(repositoriesPlugin, {
  name: "repositories",
  dependencies: ["prisma"], // 依赖 prisma 插件
});
