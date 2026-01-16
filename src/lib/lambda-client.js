import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

export const invokeSmsLambda = async ({ phoneNumber, message }) => {
  // TODO： Later make sure the function will grouped in one file.
  const functionName =
    process.env.SMS_LAMBDA_FUNCTION_NAME || "tool-sms-sendSmsFunction-qELG61cAgDO7";

  const payload = {
    body: JSON.stringify({
      phoneNumber,
      message,
    }),
  };

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(payload),
  });

  try {
    const response = await lambdaClient.send(command);
    const result = JSON.parse(Buffer.from(response.Payload).toString("utf-8"));

    if (response.FunctionError) {
      throw new Error(`Lambda execution failed: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (error) {
    console.error("Failed to invoke SMS Lambda:", error);
    throw error;
  }
};

export const invokeSmsLambdaAsync = async ({ phoneNumber, message }) => {
  const functionName =
    process.env.SMS_LAMBDA_FUNCTION_NAME || "tool-sms-sendSmsFunction-qELG61cAgDO7";

  const payload = {
    body: JSON.stringify({
      phoneNumber,
      message,
    }),
  };

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "Event",
    Payload: JSON.stringify(payload),
  });

  try {
    await lambdaClient.send(command);
    return { success: true };
  } catch (error) {
    console.error("Failed to invoke SMS Lambda async:", error);
    throw error;
  }
};
