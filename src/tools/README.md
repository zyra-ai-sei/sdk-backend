# LangGraph Tools Integration

This document describes the integration of LangGraph tools into the AI Chat Backend following SOLID principles and industry standards.

## 🏗️ **Architecture Overview**

### **Structure**
```
src/tools/
├── langGraphTools.ts          # Core LangGraph tool definitions
├── LangGraphMCPAdapter.ts     # Adapter for MCP compatibility
└── index.ts                   # Centralized exports and utilities
```

## 🔧 **Implementation Details**

### **1. Tool Definitions (`langGraphTools.ts`)**
- **Purpose**: Converts MCP tools to LangGraph format
- **Pattern**: Each tool follows the same structure:
  ```typescript
  export const toolName = langchainTools.tool(
    (input: InputType): any => {
      return { ...input, action: "mcp_action_name" };
    },
    {
      name: "tool_name",
      description: "Tool description",
      schema: z.object({ /* zod schema */ }),
    }
  );
  ```

### **2. MCP Adapter (`LangGraphMCPAdapter.ts`)**
- **Purpose**: Bridges LangGraph tools with MCP service
- **Features**:
  - Converts tool outputs to MCP format
  - Handles transaction data extraction
  - Maintains compatibility with existing system
  - Error handling and status management

### **3. Centralized Exports (`index.ts`)**
- **Purpose**: Provides organized access to all tools
- **Features**:
  - Categorized tool exports
  - Utility functions for filtering
  - Essential tools subset
  - Type-safe tool management

## 🎯 **Tool Categories**

### **Network Tools**
- `get_chain_info` - Get network information
- `get_supported_networks` - List supported networks

### **Block Tools**
- `get_block_by_number` - Get specific block
- `get_latest_block` - Get latest block

### **Balance Tools**
- `get_balance` - Native token balance
- `get_erc20_balance` - ERC20 token balance
- `get_token_balance` - Token balance by symbol
- `get_nft_balance` - NFT balance
- `get_erc1155_balance` - ERC1155 token balance

### **Transaction Tools**
- `get_transaction` - Transaction details
- `get_transaction_receipt` - Transaction receipt

### **Transfer Tools**
- `transfer_sei` - Transfer native SEI
- `transfer_erc20` - Transfer ERC20 tokens
- `transfer_token` - Transfer by symbol
- `transfer_nft` - Transfer NFT
- `transfer_erc1155` - Transfer ERC1155

### **Approval Tools**
- `approve_token_spending` - Approve token spending
- `approve_erc20` - Approve ERC20 tokens

### **Token Info Tools**
- `get_token_info` - ERC20 token information
- `get_nft_info` - NFT information

### **Wallet Tools**
- `get_address_from_private_key` - Get address from private key

### **SEI Wrapping Tools**
- `wrap_sei` - Wrap SEI to wSEI
- `unwrap_sei` - Unwrap wSEI to SEI

### **Price Tools**
- `get_token_prices` - Multiple token prices
- `get_current_token_prices` - Current market prices
- `get_price_of_token` - Single token price

### **Trading Tools**
- `create_twap_order` - Create TWAP order
- `create_limit_order` - Create limit order

### **Utility Tools**
- `convert_token_symbol_to_address` - Symbol to address
- `convert_address_to_token_symbol` - Address to symbol

## 🔄 **Integration Flow**

1. **Tool Definition**: LangGraph tools are defined with Zod schemas
2. **Adapter Wrapping**: Tools are wrapped with MCP adapter
3. **Service Integration**: Adapted tools are added to LangGraph agent
4. **Execution**: Tools execute through MCP service
5. **Response Formatting**: Outputs are formatted for frontend

## 📝 **Usage Examples**

### **Getting Essential Tools**
```typescript
import { getEssentialTools } from '../tools/index';

const essentialTools = getEssentialTools();
```

### **Getting Tools by Category**
```typescript
import { getToolsByCategory, ToolCategory } from '../tools/index';

const tradingTools = getToolsByCategory(ToolCategory.TRADING);
```

### **Getting All Tools**
```typescript
import { AllLangGraphTools } from '../tools/index';

// Use all tools in LangGraph agent
```

## 🎯 **Benefits**

1. **SOLID Principles**:
   - **Single Responsibility**: Each tool has one purpose
   - **Open/Closed**: Easy to add new tools without modifying existing ones
   - **Liskov Substitution**: All tools implement same interface
   - **Interface Segregation**: Clean, focused interfaces
   - **Dependency Inversion**: Tools depend on abstractions

2. **Scalability**:
   - Easy to add new tool categories
   - Modular structure for maintenance
   - Type-safe tool management

3. **Industry Standards**:
   - Clear separation of concerns
   - Consistent naming conventions
   - Comprehensive documentation
   - Error handling patterns

4. **Maintainability**:
   - Centralized tool management
   - Consistent format across all tools
   - Easy testing and debugging

## 🚀 **Future Enhancements**

1. **Tool Registry**: Dynamic tool registration and discovery
2. **Tool Validation**: Runtime validation of tool inputs/outputs
3. **Tool Metrics**: Performance monitoring and analytics
4. **Tool Versioning**: Support for multiple tool versions
5. **Tool Caching**: Cache frequently used tool results

## 🔧 **Development Guidelines**

### **Adding New Tools**
1. Define tool in `langGraphTools.ts`
2. Add to appropriate category in `index.ts`
3. Update adapter if special handling needed
4. Add tests for new functionality

### **Tool Naming Convention**
- Use snake_case for tool names
- Start with action verb (get_, transfer_, create_, etc.)
- Be descriptive but concise

### **Schema Guidelines**
- Use Zod for type-safe schemas
- Include clear descriptions for all parameters
- Mark optional parameters appropriately
- Provide examples in descriptions

This integration provides a robust, scalable foundation for tool management while maintaining compatibility with the existing MCP system.