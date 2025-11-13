import { FunctionResponse, GoogleGenAI, Part } from "@google/genai";
import fetch from "node-fetch";
import { inject, injectable } from "inversify";
import { ILlmService, LlmStreamChunk } from "./interfaces/ILlmService";
import env from "../envConfig";
import { TYPES } from "../ioc-container/types";
import { UserService } from "./UserService";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { StructuredTool } from "@langchain/core/tools";
import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import toolsList from "../tools/langGraphTools";
import { getSystemPrompt } from "../utils/prompts";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";

// const prompt = ChatPromptTemplate.fromMessages([
//   ["system", systemPrompt],
// ]);
@injectable()
export class LlmService implements ILlmService {
  private genAI: ChatGoogleGenerativeAI;
  private model: string;
  private sessionId: string;
  private mongoClient: MongoClient;
  private checkpointer: MongoDBSaver;

  constructor(@inject(TYPES.UserService) private userService: UserService) {
    console.log("constructor");
    this.genAI = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: env.GEMINI_API_KEY,
    });

    // Initialize MongoDB client once with connection pooling
    this.mongoClient = new MongoClient(env.MONGO_URI, {
      maxPoolSize: 25, // Maximum connections in the pool
      minPoolSize: 2, // Minimum connections to maintain
      maxIdleTimeMS: 30000, // Close idle connections after 30s
    });

    // Initialize checkpointer with the pooled client
    this.checkpointer = new MongoDBSaver({ client: this.mongoClient });
  }

  async clearChat(address: string) {
    await this.checkpointer.deleteThread(address);
  }

  async getChatHistory(address: string): Promise<any> {
    try {
      const chat = await this.initChat(address);
      if (!chat) throw new Error("Chat session not initialized");

      const initialState = await chat.getState({
        configurable: { thread_id: address },
      });

      const state = initialState?.values?.messages;
      const messages = state.map((message) => {
        if (message.constructor.name === "ToolMessage") {
          // Parse tool content and include status if available
          try {
            const parsedContent = JSON.parse(message.content);

            // Extract tool_output from the parsed content
            let toolOutput =
              parsedContent.tool_output || parsedContent.result?.tool_output;

            // Extract display text
            let displayText =
              parsedContent.text || JSON.stringify(parsedContent);

            return {
              type: message.constructor.name,
              content: displayText,
              id: message.id,
              executionId: parsedContent.executionId,
              status: parsedContent.status || "unexecuted",
              hash: parsedContent.hash,
              toolName:
                message.name || message.tool_call_id || parsedContent.toolName,
              timestamp: parsedContent.timestamp || new Date().toISOString(),
              tool_output: toolOutput,
            };
          } catch (parseError) {
            console.warn("Failed to parse tool message content:", parseError);
            return {
              type: message.constructor.name,
              content: message.content,
              status: "unexecuted",
              timestamp: new Date().toISOString(),
            };
          }
        }

        return {
          type: message.constructor.name,
          content: message.content,
          timestamp: new Date().toISOString(),
        };
      });

      return messages;
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw new Error(`Failed to retrieve chat history: ${error.message}`);
    }
  }

  async updateToolStatus(
    address: string,
    executionId: string,
    status: "completed" | "aborted" | "unexecuted",
    hash?: string
  ): Promise<boolean> {
    try {
      // Get current checkpoint using pooled checkpointer
      const threadConfig = { configurable: { thread_id: address } };
      const currentCheckpoint = await this.checkpointer.getTuple(threadConfig);

      if (!currentCheckpoint?.checkpoint) {
        console.log("No checkpoint found for address:", address);
        return false;
      }

      // Access the checkpoint data correctly
      const checkpointData = currentCheckpoint.checkpoint as any;
      if (!checkpointData.values?.messages) {
        console.log("No messages found in checkpoint");
        return false;
      }

      const messages = checkpointData.values.messages;

      // Find the ToolMessage with the matching executionId
      const targetToolMessageIndex = messages
        .map((msg: any, index: number) => ({ msg, index }))
        .filter(({ msg }: any) => msg.constructor.name === "ToolMessage")
        .map(({ msg, index }) => {
          try {
            const parsed = JSON.parse(msg.content);
            return { parsed, index };
          } catch {
            return null;
          }
        })
        .filter((item) => item !== null)
        .find((item) => item!.parsed.executionId === executionId)?.index;

      if (targetToolMessageIndex === undefined) {
        console.log(
          `No tool message found with executionId ${executionId} for address:`,
          address
        );
        return false;
      }

      // Update the tool message content with status
      const toolMessage = messages[targetToolMessageIndex];
      try {
        const parsedContent = JSON.parse(toolMessage.content);

        // Add or update status, hash, and timestamp
        parsedContent.status = status;
        if (hash) {
          parsedContent.hash = hash;
        }
        parsedContent.updatedAt = new Date().toISOString();

        // Update the message content
        toolMessage.content = JSON.stringify(parsedContent);

        // Save the updated checkpoint with proper metadata
        const metadata = {
          source: "update" as const,
          step: (currentCheckpoint.metadata?.step || 0) + 1,
          parents: currentCheckpoint.metadata?.parents || {},
        };

        await this.checkpointer.put(threadConfig, checkpointData, metadata);

        console.log(
          `Updated tool status to ${status}${
            hash ? ` with hash ${hash}` : ""
          } for executionId ${executionId} in address ${address}`
        );
        return true;
      } catch (parseError) {
        console.error("Failed to parse tool message content:", parseError);
        return false;
      }
    } catch (error) {
      console.error("Error updating tool status:", error);
      return false;
    }
  }

  async abortLatestTool(address: string): Promise<boolean> {
    // This method is deprecated - use updateToolStatus with specific toolId instead
    console.warn(
      "abortLatestTool is deprecated. Use updateToolStatus with specific toolId."
    );
    return false;
  }

  /**
   * Cleanup method to close MongoDB connection pool
   * Call this on application shutdown
   */
  async dispose(): Promise<void> {
    try {
      await this.mongoClient.close();
      console.log("MongoDB connection pool closed");
    } catch (error) {
      console.error("Error closing MongoDB connection pool:", error);
    }
  }

  // Initialize and store a chat session for a sessionId (generate if not provided)
  async initChat(address: string): Promise<any> {
    const convertedLangGraphTools = toolsList;
    let langGraphTools: StructuredTool[] = convertedLangGraphTools;

    // Use the pooled checkpointer
    const agent = createReactAgent({
      llm: this.genAI,
      tools: langGraphTools,
      stateModifier: getSystemPrompt(address),
      checkpointSaver: this.checkpointer,
    });
    return agent;
  }

  async *streamMessage(
    prompt: string,
    address: string,
    abortSignal?: AbortSignal
  ): AsyncGenerator<LlmStreamChunk> {
    const chat = await this.initChat(address);

    if (!chat) {
      throw new Error("Chat session not initialized");
    }

    const stream = chat.streamEvents(
      { messages: [new HumanMessage(prompt)] },
      { configurable: { thread_id: address }, version: "v2" }
    );

    let toolIndex = 0;
    const seenToolCalls = new Set<string>();

    for await (const event of stream) {
      // Handle streaming text chunks from the model
      if (event.event === "on_chat_model_stream") {
        const chunk = event.data?.chunk;

        // The chunk is an AIMessageChunk with content property
        if (chunk && chunk.text && typeof chunk.text === "string") {
          yield { type: "token", text: chunk.text } as LlmStreamChunk;
        }
      }
      // Handle tool execution completion
      else if (event.event === "on_tool_end") {
        const output = event.data?.output;

        // Skip if we've already processed this tool call
        const toolCallId = output?.tool_call_id;

        if (toolCallId && seenToolCalls.has(toolCallId)) {
          continue;
        }

        if (toolCallId) {
          seenToolCalls.add(toolCallId);
        }

        const outputDir = path.resolve(process.cwd(), "test", "output");
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(
          path.join(outputDir, "llm-output.json"),
          JSON.stringify(output, null, 2)
        );

        const toolName = output?.name || "unknown";

        let toolContent = "";
        let toolOutput: any = null;
        let executionId: string = "";

        // Extract content from the tool output
        if (output && typeof output === "object") {
          const rawContent = output.content;

          toolContent =
            typeof rawContent === "string"
              ? rawContent
              : JSON.stringify(rawContent);

          // Try to parse the content JSON
          try {
            const parsed = JSON.parse(toolContent);

            // Extract executionId if present
            executionId = parsed.executionId;

            // Check if it has tool_output field (our custom format)
            if (parsed.tool_output) {
              toolOutput = parsed.tool_output;
            }

            if (
              toolOutput &&
              typeof toolOutput === "object" &&
              !toolOutput.id
            ) {
              toolOutput.id = toolIndex;
            }

            if (
              toolOutput &&
              typeof toolOutput === "object" &&
              !toolOutput.transaction
            )
              continue;

            yield {
              type: "tool",
              toolName,
              tool_output: toolOutput,
              executionId: executionId,
            } as LlmStreamChunk;

            toolIndex++;
          } catch {
            // If parsing fails, treat content as plain text
          }
        }

        // Add ID if not present
      }
    }
  }

  // Send a prompt to an existing chat session
  async sendMessage(prompt: string, address: string): Promise<string | object> {
    // if (!this.mcpService.isConnected()) {
    //   await this.mcpService.connectToMCP();
    // }
    //only initialize if needed
    const chat = await this.initChat(address);

    if (!chat) throw new Error("Chat session not initialized");

    const initialState = await chat.getState({
      configurable: { thread_id: address },
    });
    console.log("hi");
    console.dir(initialState);

    const agentFinalState = await chat.invoke(
      { messages: [new HumanMessage(prompt)] }, // Use the actual prompt instead of hardcoded message
      { configurable: { thread_id: address } } // Use address as thread_id
    );

    const newMessages = initialState?.values?.messages
      ? agentFinalState.messages.slice(initialState.values.messages.length)
      : agentFinalState.messages;
    console.log("Agent final state:");
    console.dir(agentFinalState);
    console.log("New messages:");
    console.dir(newMessages);

    const res = {
      chat: newMessages[newMessages.length - 1].content,
      tools: newMessages
        .filter((msg: any) => msg.constructor.name === "ToolMessage")
        .map((msg: any, toolIndex: number) => {
          try {
            // Parse the JSON string content
            const parsed = JSON.parse(msg.content);
            console.log("hard luck", parsed);

            if (parsed && typeof parsed === "object") {
              // MCP tool response structure
              const mcpResponse = parsed;
              let content = "";

              // Extract text from content array
              if (
                mcpResponse &&
                typeof mcpResponse === "object" &&
                mcpResponse.content &&
                Array.isArray(mcpResponse.content) &&
                mcpResponse.content.length > 0
              ) {
                const textItem = mcpResponse.content.find(
                  (item: any) => item.type === "text"
                );
                content = textItem
                  ? textItem.text
                  : JSON.stringify(mcpResponse.content);
              } else {
                content = JSON.stringify(mcpResponse);
              }

              // Extract tool_output and add ID
              const toolOutput =
                parsed.tool_output ||
                (mcpResponse && typeof mcpResponse === "object"
                  ? mcpResponse.tool_output
                  : undefined);
              if (toolOutput && typeof toolOutput === "object") {
                toolOutput.id = toolIndex;
              }

              if (toolOutput?.transaction || JSON.parse(content)?.transaction) {
                return {
                  id: toolIndex,
                  content: content,
                  tool_output: toolOutput ? toolOutput : JSON.parse(content),
                };
              }
              return {
                id: toolIndex,
                content: content,
                tool_output: undefined,
              };
            } else {
              // Fallback
              return {
                id: toolIndex,
                content: msg.content || "",
                tool_output: undefined,
              };
            }
          } catch (error) {
            // If parsing fails, return as-is
            return {
              id: toolIndex,
              content: msg.content || "",
              tool_output: undefined,
            };
          }
        })
        .filter((msg: any) => msg != null),
    };
    console.log(
      "Response from agent:",
      res,
      newMessages.filter((msg: any) => msg.constructor.name === "ToolMessage")
    );
    return res;
  }
}
