import { invokeSmsLambda } from "./lambda-client.js";

/**
 * Send SMS via Lambda function
 * @param {Object} params
 * @param {string} params.phoneNumber - Phone number to send SMS to
 * @param {string} params.message - SMS message content
 * @returns {Promise<Object>} Returns { success: boolean, phoneNumber: string, message: string }
 * @throws {Error} Throws error if sending fails
 */
export const sendSms = async ({ phoneNumber, message }) => {
  try {
    // Invoke Lambda function
    const lambdaResult = await invokeSmsLambda({ phoneNumber, message });

    // Lambda returns format: { statusCode: 200, body: "{...}" }
    if (lambdaResult.statusCode !== 200) {
      const errorBody = JSON.parse(lambdaResult.body || "{}");
      throw new Error(errorBody.error || `SMS Lambda returned status ${lambdaResult.statusCode}`);
    }

    // Parse successful response
    const responseBody = JSON.parse(lambdaResult.body);

    return {
      success: true,
      phoneNumber: responseBody.phoneNumber,
      message: responseBody.message,
    };
  } catch (error) {
    console.error("SMS sending failed:", error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};
