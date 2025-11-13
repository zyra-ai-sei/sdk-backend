import { controller, httpGet, httpPost, request, response } from "inversify-express-utils";
import { inject } from "inversify";
import { TYPES } from "../ioc-container/types";
import { Response, Request } from "express";
import { ILlmService } from "../services/interfaces/ILlmService";
// Use ApiKeyMiddleware to protect LLM endpoints; address is provided via query param

@controller("/llm", TYPES.ApiKeyMiddleware)
export class LlmController {
  constructor(@inject(TYPES.LlmService) private llmService: ILlmService) {}

  @httpPost("/init")
  private async init(@request() req: Request): Promise<{ success: boolean }> {
    const address = (req.query.address as string) || (req.query.userAddress as string);
    if (!address) throw new Error("address query parameter is required");
    await this.llmService.initChat(address);
    return { success: true };
  }

  @httpPost("/chat")
  private async chat(@request() req: Request): Promise<string | object> {
    const { prompt } = req.body as any;
    const address = (req.query.address as string) || (req.query.userAddress as string);
    if (!address) throw new Error("address query parameter is required");
    return this.llmService.sendMessage(prompt, address);
  }

  @httpGet("/stream")
  private async stream(@request() req: Request, @response() res: Response): Promise<void> {
    console.log('LlmController.stream: Starting stream request');
    const promptParam = req.query.prompt;
    const prompt = Array.isArray(promptParam) ? promptParam.join(" ") : promptParam as string;

    if (typeof prompt !== "string" || !prompt.trim()) {
      console.log('LlmController.stream: Prompt missing or invalid');
      res.status(400).json({ success: false, message: "prompt query parameter is required" });
      return;
    }

    const address = (req.query.address as string) || (req.query.userAddress as string);
    if (!address) {
      console.log('LlmController.stream: Address missing');
      res.status(400).json({ success: false, message: "address query parameter is required" });
      return;
    }
    console.log('LlmController.stream: Address and prompt valid, starting stream');

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let closed = false;
    const handleClose = () => {
      closed = true;
    };

    req.on("close", handleClose);

    try {
      console.log('LlmController.stream: Starting to stream messages');
      for await (const chunk of this.llmService.streamMessage(prompt, address)) {
        if (closed) break;
        console.log("LlmController.stream: Sending chunk", JSON.stringify(chunk));
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      if (!closed) {
        console.log('LlmController.stream: Stream ended normally');
        res.write("event: end\ndata: {}\n\n");
      }
    } catch (error) {
      console.error("LlmController.stream: Error streaming LLM response:", error);
      if (!closed) res.write(`event: error\ndata: ${JSON.stringify({ message: "Stream failed" })}\n\n`);
    } finally {
      req.off("close", handleClose);
      if (!closed) res.end();
    }
  }

  @httpGet("/getChatHistory")
  private async getChatHistory(@request() req: Request): Promise<string | object> {
    const address = (req.query.address as string) || (req.query.userAddress as string);
    if (!address) throw new Error("address query parameter is required");
    return this.llmService.getChatHistory(address);
  }

  @httpPost("/completeTool")
  private async completeTool(@request() req: Request): Promise<{ success: boolean }> {
    const address = (req.query.address as string) || (req.query.userAddress as string);
    const { executionId, hash } = req.body as any;
    if (!address) throw new Error("address query parameter is required");
    if (!executionId) return { success: false };
    const success = await this.llmService.updateToolStatus(address, executionId, "completed", hash);
    return { success };
  }

  @httpPost("/abortTool")
  private async abortTool(@request() req: Request): Promise<{ success: boolean }> {
    const address = (req.query.address as string) || (req.query.userAddress as string);
    const { executionId } = req.body as any;
    if (!address) throw new Error("address query parameter is required");
    if (!executionId) return { success: false };
    const success = await this.llmService.updateToolStatus(address, executionId, "aborted");
    return { success };
  }

  @httpGet("/clearChat")
  private async clearChat(@request() req: Request): Promise<{ success: boolean }> {
    const address = (req.query.address as string) || (req.query.userAddress as string);
    if (!address) throw new Error("address query parameter is required");
    await this.llmService.clearChat(address);
    return { success: true };
  }
}
