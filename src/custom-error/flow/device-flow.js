export class DeviceFlowError extends Error {
  constructor(message) {
    super(`Device Flow Error: ${message}`);
    this.name = "device-flow-error";
    this.statusCode = 500;
  }
}
