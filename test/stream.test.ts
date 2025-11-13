import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Wallet } from "ethers";
import env from "../src/envConfig";

type SseEvent = { event: string; data: string };

const BASE_URL = "http://localhost:4000/v1";
const PRIVATE_KEY = env.TEST_PRIVATE_KEY ?? "";
const FAKE_ORIGIN = "https://fake.example";
const PROMPT = "swap 12 usdc for wsei with deadline 2 hours";

if (!PRIVATE_KEY) {
  throw new Error("Set TEST_PRIVATE_KEY in your environment");
}

async function main() {
  const wallet = new Wallet(PRIVATE_KEY);

  const messageRes = await fetch(`${BASE_URL}/auth/login`);
  if (!messageRes.ok) {
    throw new Error(`Failed to fetch login message: ${messageRes.statusText}`);
  }
  const payload = await messageRes.json();
  const { message } = payload?.data ?? {};

  const signedMessage = await wallet.signMessage(message);

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
  const res1 = (await loginRes.json()) ;
  const {token} = res1.data;
  const apiKeyRes = await fetch(`${BASE_URL}/apikeys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appName: "llm stream test",
      allowedOrigins: [FAKE_ORIGIN],
    }),
  });
  if (!apiKeyRes.ok) {
    throw new Error(`API key creation failed: ${apiKeyRes.statusText}`);
  }
  const apiRes = (await apiKeyRes.json())
  const apiKey = apiRes.data.apiKey;
  const streamRes = await fetch(`${BASE_URL}/llm/stream?address=${wallet.address}&prompt=${encodeURIComponent(PROMPT)}`, {
    headers: {
      "x-api-key": apiKey,
      Accept: "text/event-stream",
      Origin: FAKE_ORIGIN,
    },
  });
  console.log('why me', `${BASE_URL}/llm/stream`)
  if (!streamRes.ok || !streamRes.body) {
    throw new Error(`Stream request failed: ${streamRes.statusText}`);
  }

  const events: SseEvent[] = [];
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex).trim();
      buffer = buffer.slice(sepIndex + 2);

      if (!rawEvent) continue;

      let eventType = "message";
      let data = "";

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      events.push({ event: eventType, data });
      if (eventType === "end") {
        reader.cancel();
        buffer = "";
        break;
      }
    }
  }

  const outputDir = path.resolve(process.cwd(), "test", "output");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    path.join(outputDir, "llm-stream-response.json"),
    JSON.stringify({ prompt: PROMPT, events }, null, 2)
  );

  console.log(
    `Saved ${events.length} events to ${outputDir}/llm-stream-response.json`
  );
}

main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
