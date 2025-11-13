import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { Wallet } from "ethers";
import env from "../src/envConfig";

const BASE_URL = "http://localhost:4000/v1";
const PRIVATE_KEY = env.TEST_PRIVATE_KEY ?? "";
const FAKE_ORIGIN = "https://fake.example";

if (!PRIVATE_KEY) {
  throw new Error("Set TEST_PRIVATE_KEY in your environment");
}


async function authenticate(): Promise<{ apiKey: string; address: string }> {
  const wallet = new Wallet(PRIVATE_KEY);

  // Get login message
  const messageRes = await fetch(`${BASE_URL}/auth/login`);
  if (!messageRes.ok) {
    throw new Error(`Failed to fetch login message: ${messageRes.statusText}`);
  }
  const payload = await messageRes.json();
  const { message } = payload?.data ?? {};

  // Sign message
  const signedMessage = await wallet.signMessage(message);

  // Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signedMessage,
      address: wallet.address,
      message,
    }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.statusText}`);
  }
  const loginData = await loginRes.json();
  const { token } = loginData.data;

  // Create API key
  const apiKeyRes = await fetch(`${BASE_URL}/apikeys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appName: "history test",
      allowedOrigins: [FAKE_ORIGIN],
    }),
  });
  if (!apiKeyRes.ok) {
    throw new Error(`API key creation failed: ${apiKeyRes.statusText}`);
  }
  const apiKeyData = await apiKeyRes.json();
  const apiKey = apiKeyData.data.apiKey;

  return { apiKey, address: wallet.address };
}

async function testChatHistory(apiKey: string, address: string): Promise<void> {
  // Get chat history
  const historyRes = await fetch(`${BASE_URL}/llm/getChatHistory?address=${address}`, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Origin: FAKE_ORIGIN,
    },
  });
  if (!historyRes.ok) {
      throw new Error(`Failed to get chat history: ${historyRes.statusText}`);
    }
    
    const historyData = await historyRes.json();
    const messages = historyData.data.items || [];
    
    console.log('hisoty res', historyData)
  // Create output directory
  const outputDir = path.resolve(process.cwd(), "test", "output");
  mkdirSync(outputDir, { recursive: true });

  // Prepare result data
  const result = {
    address,
    totalMessages: messages.length,
    messageBreakdown: {
      human: messages.filter((m: any) => m.type === "HumanMessage").length,
      ai: messages.filter((m: any) => m.type === "AIMessage").length,
      tool: messages.filter((m: any) => m.type === "ToolMessage").length,
    },
    messages: messages,
    timestamp: new Date().toISOString(),
  };
  // Save to file
  writeFileSync(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(result, null, 2)
  );
}

async function main() {
  try {
    // Authenticate and get tokens
    const { apiKey, address } = await authenticate();

    // Test chat history retrieval
    await testChatHistory(apiKey, address);

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}
// Run the tests
main().catch(console.error);
