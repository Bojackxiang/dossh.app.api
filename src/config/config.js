import dotenv from "dotenv";
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  HOST: process.env.HOST || "0.0.0.0",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  // aws configure
  AWS_REGION: process.env.AWS_REGION || "ap-southeast-2",
  SMS_LAMBDA_FUNCTION_NAME:
    process.env.SMS_LAMBDA_FUNCTION_NAME || "tool-sms-sendSmsFunction-qELG61cAgDO7",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
};
