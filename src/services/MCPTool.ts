// @ts-ignore
import { StructuredTool, tool } from "@langchain/core/tools";
import { z } from "zod";

// Custom tool wrapper that bridges your MCP service to LangGraph
export class MCPToolWrapper extends StructuredTool<any, any> {
  name: string;
  description: string;
  schema: z.ZodSchema<any>;
  private mcpService: any;
  private toolName: string;

  constructor(mcpService: any, toolConfig: any) {
    super();
    this.mcpService = mcpService;
    this.name = toolConfig.name;
    this.description = toolConfig.description;
    this.toolName = toolConfig.name;
    
    // Convert MCP tool schema to Zod schema
    // console.log("toolconfig",toolConfig, toolConfig.inputSchema)
    this.schema = this.convertMCPSchemaToZod(toolConfig.parameters);
  }

  private convertMCPSchemaToZod(inputSchema: any): z.ZodSchema<any> {
    if (!inputSchema || !inputSchema.properties) {
      return z.object({});
    }

    const zodObject: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, prop] of Object.entries(inputSchema.properties as any)) {
      const property = prop as any;
      
      switch (property.type) {
        case 'string':
          zodObject[key] = z.string().describe(property.description || '');
          break;
        case 'number':
        case 'integer':
          zodObject[key] = z.number().describe(property.description || '');
          break;
        case 'boolean':
          zodObject[key] = z.boolean().describe(property.description || '');
          break;
        case 'array':
          zodObject[key] = z.array(z.any()).describe(property.description || '');
          break;
        case 'object':
          zodObject[key] = z.object({}).describe(property.description || '');
          break;
        default:
          zodObject[key] = z.any().describe(property.description || '');
      }

      // Handle optional properties
      if (!inputSchema.required?.includes(key)) {
        zodObject[key] = zodObject[key].optional();
      }
    }
    // console.log("Converted Zod schema:", zodObject);
    return z.object(zodObject);
  }
  async _call(args: any): Promise<string> {
    try {
      // console.log(`____Calling MCP tool: ${this.toolName} with args:`, args);
      // console.log("Tool schema:", this.schema);
      const result = await this.mcpService.callTool(this.toolName, args);
      return JSON.stringify(result);
    } catch (error) {
      throw new Error(`Error calling MCP tool ${this.toolName}: ${error}`);
    }
  }
}