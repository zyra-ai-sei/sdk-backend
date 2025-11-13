import { EventSource } from "eventsource";
import { injectable } from "inversify";
import { resolve } from "path";

@injectable()
export class MCPService {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private responses = new Map<string, any>();

  constructor() {}

  async connectToMCP(): Promise<{ success: boolean; sessionId: string }> {
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      console.log("Connecting to MCP server ...");

      // Establish SSE connection
      this.eventSource = new EventSource("http://localhost:3001/sse");

      this.eventSource.onopen = () => {
        console.log("SSE connection opened");
      };

      this.eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "session_init") {
          this.sessionId = data.sessionId;
          console.log("Session established:", this.sessionId);
        } else if (data.jsonrpc === "2.0" && data.id) {
          this.responses.set(data.id, data);
          console.log("Tool response received:", data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("SSE error:", error);
      };

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        sessionId: this.sessionId,
      };
    } catch (error) {
      console.error("Error connecting to MCP:", error);
      throw error;
    }
  }

  async getTools(): Promise<any> {
    if (!this.sessionId) {
      throw new Error("Not connected to MCP server");
    }

    const requestId = `backend-${Date.now()}`;
    const mcpRequest = {
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/list",
      params: {},
    };

    // Send the request (this doesn't return the tool result)
    const response = await fetch(
      `http://localhost:3001/messages?sessionId=${this.sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mcpRequest),
      }
    );

    // Wait for the actual response to come back via SSE
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for tool response"));
      }, 30000); // 30 second timeout

      const checkResponse = () => {
        if (this.responses.has(requestId)) {
          clearTimeout(timeout);
          const result = this.responses.get(requestId);
          this.responses.delete(requestId);
          if (result?.result?.tools && Array.isArray(result.result.tools)) {
            result.result.tools = result.result.tools.map((tool) => {
              if (tool.inputSchema) {
                tool.parameters = tool.inputSchema;
                delete tool.inputSchema;
              }
              return tool;
            });
          }
          resolve(result);
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const requestId = `backend-${Date.now()}`;
    const mcpRequest = {
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    console.log("Sending tool request:", mcpRequest);

    // Send the request (this doesn't return the tool result)
    const response = await fetch(
      `http://localhost:3001/messages?sessionId=${this.sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mcpRequest),
      }
    );

    // Wait for the actual response to come back via SSE
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for tool response"));
      }, 20000); // 30 second timeout

      const checkResponse = () => {
        if (this.responses.has(requestId)) {
          clearTimeout(timeout);
          const result = this.responses.get(requestId);
          this.responses.delete(requestId);
          // console.log("Tool response found:", result);

          resolve(result);
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.sessionId !== null;
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sessionId = null;
    this.responses.clear();
  }
}
