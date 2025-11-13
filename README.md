# SDK Backend - Sei Blockchain Chat Interface

A backend service that powers an AI-driven blockchain interaction SDK. This allows external apps to embed a chat interface that can execute blockchain operations (swaps, transfers, approvals, etc.) on behalf of users through an LLM agent.

## 🎯 Overview

The SDK Backend is designed to be **app-agnostic** and **multi-tenant**. Each integrating app provides their own configuration (routing URLs, features, etc.), and the backend:

1. Authenticates users via wallet signatures
2. Manages chat sessions with LangGraph + MongoDB
3. Routes user intents to blockchain tools via Google Gemini LLM
4. Returns unsigned transactions and redirect URLs for app-specific execution
5. Tracks tool execution status with unique IDs

## 📋 Table of Contents

- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [API Workflows](#api-workflows)
- [Architecture](#architecture)
- [Major Components](#major-components)
- [Integration Guide](#integration-guide)

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)
- Google Gemini API key
- Redis instance (for session management)
- Sei blockchain RPC URL

### Installation Steps

```bash
# 1. Clone the repository
git clone git@github.com:zyra-ai-sei/sdk-backend.git
cd sdk-backend

# 2. Install dependencies
yarn install
# or
npm install

# 3. Create .env file (see Environment Configuration section)
cp .env.example .env
# Edit .env with your values

# 4. Build TypeScript
yarn build

# 5. Start development server
yarn dev

# 6. Start production server
yarn start
```

The server will run on `http://localhost:4000/v1` (default port, configurable via `.env`)

---

## 🔧 Environment Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=4000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database Configuration
MONGO_URI=mongodb://localhost:27017/sdk-backend

# Blockchain Configuration
RPC_URL=https://rpc.sei-apis.com

# AI/LLM Configuration
GEMINI_API_KEY=your_google_gemini_api_key_here
LLAMA_API_KEY=your_llama_api_key_here

# Authentication
SECRET_KEY=your_secret_key_for_jwt_tokens
AUTH_MESSAGE_TIMEOUT=60000

# Testing
TEST_PRIVATE_KEY=your_test_wallet_private_key
```

---

## 📡 API Workflows

### 1. **Authentication Flow**

#### Step 1: Get Login Message
```bash
GET /v1/auth/login
```

**Response:**
```json
{
  "message": "Sign this message to authenticate:\nTimestamp: 1699999999999"
}
```

#### Step 2: Sign and Login
```bash
POST /v1/auth/login
Content-Type: application/json

{
  "address": "0x1234567890123456789012345678901234567890",
  "message": "Sign this message to authenticate:\nTimestamp: 1699999999999",
  "signedMessage": "0x..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Use this token for all subsequent requests in the `Authorization` header:**
```
Authorization: Bearer <token>
```

---

### 2. **Chat Streaming Flow** (Main Feature)

The primary endpoint for AI-powered blockchain interactions.

```bash
GET /v1/llm/stream?prompt=swap+1+SEI+for+USDC&address=0x1234...&appId=myapp
```

**Query Parameters:**
- `prompt` (required): User's natural language request
- `address` (required): User's wallet address
- `appId` (optional): App identifier for routing configuration
- `appRouting` (optional): JSON-encoded routing config

**Headers:**
```
Authorization: Bearer <token>
Content-Type: text/event-stream
```

**Response (Server-Sent Events):**

The response streams multiple events:

```
data: {"type":"token","text":"I'll help you swap "}

data: {"type":"token","text":"1 SEI "}

data: {"type":"tool","toolName":"place_order","content":"{\"from\":\"0x...\",\"to\":\"0x...\",\"amount\":\"1000000000000000000\"}","tool_output":{"data":"unsigned_txn_object"},"executionId":"550e8400-e29b-41d4-a716-446655440000","redirectUrl":"https://myapp.com/swap"}

data: {"type":"token","text":"Transaction created. You'll be redirected to complete the swap."}
```

**Event Types:**

1. **`token`**: Streaming text response from LLM
   ```json
   {
     "type": "token",
     "text": "I'll help you..."
   }
   ```

2. **`tool`**: Tool execution result with routing info
   ```json
   {
     "type": "tool",
     "toolName": "place_order",
     "content": "{...transaction data...}",
     "tool_output": {...},
     "executionId": "550e8400-e29b-41d4-a716-446655440000",
     "redirectUrl": "https://myapp.com/swap"
   }
   ```

---

### 3. **Chat History**

Retrieve past conversations for a user.

```bash
GET /v1/llm/history?address=0x1234...
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "role": "user",
        "content": "swap 1 SEI for USDC"
      },
      {
        "role": "assistant",
        "content": "I'll help you with that swap..."
      }
    ],
    "total": 24
  }
}
```

---

### 4. **Non-Streaming Chat**

For non-streaming requests, use the chat endpoint:

```bash
POST /v1/llm/chat?address=0x1234...
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "What's my wallet balance?"
}
```

**Response:**
```json
{
  "success": true,
  "data": "Your wallet balance is 5.2 SEI..."
}
```

---

### 5. **Update Tool Status**

Update the execution status of a blockchain tool (mark as completed, aborted, etc.).

```bash
PUT /v1/llm/tool-status
Content-Type: application/json
Authorization: Bearer <token>

{
  "address": "0x1234...",
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "hash": "0x7f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"
}
```

**Status values:**
- `completed`: Tool executed successfully
- `aborted`: User canceled the operation
- `unexecuted`: Tool was suggested but not executed

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────┐
│                External App UI                       │
│          (React/Vue/Angular Component)               │
└─────────────────────────────────────────────────────┘
                        ↓
             (Chat Widget with SSE)
                        ↓
┌─────────────────────────────────────────────────────┐
│            SDK Backend (This Project)                │
├─────────────────────────────────────────────────────┤
│                  Express Server                      │
│  ┌────────────────────────────────────────────────┐ │
│  │      Authentication (Wallet Signature)         │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │    LLM Controller & Service              │  │ │
│  │  │  • streamMessage()                       │  │ │
│  │  │  • sendMessage()                         │  │ │
│  │  │  • getChatHistory()                      │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │      LangGraph + Gemini Agent            │  │ │
│  │  │  • Tool selection & routing              │  │ │
│  │  │  • State management                      │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │    Blockchain Tools (20+ tools)          │  │ │
│  │  │  • place_order (swap)                    │  │ │
│  │  │  • transfer_sei / transfer_erc20         │  │ │
│  │  │  • approve_erc20                         │  │ │
│  │  │  • get_balance, get_token_price, etc.    │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
│                        ↓                             │
│  ┌────────────────────────────────────────────────┐ │
│  │           Data Layer                           │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │ MongoDB (Chat sessions & history)        │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │ Redis (Session management)               │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│         Sei Blockchain (RPC Node)                    │
│     (Transaction creation & signing)                │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Major Components

### 1. **Controllers** (`src/controller/`)

#### AuthController
- **Login**: Get nonce & verify wallet signature
- **Verify**: Check if token is valid

#### LlmController
- **Stream** (`GET /llm/stream`): Main streaming endpoint for chat + tools
- **Chat** (`POST /llm/chat`): Non-streaming chat endpoint
- **Init** (`POST /llm/init`): Initialize a chat session
- **History** (`GET /llm/history`): Get chat history

### 2. **Services** (`src/services/`)

#### LlmService
```typescript
class LlmService {
  async initChat(address, appId, appRouting)
  async *streamMessage(prompt, address, appId, appRouting)
  async sendMessage(prompt, address)
  async getChatHistory(address)
  async updateToolStatus(address, executionId, status, hash)
  async clearChat(address)
}
```

**Key Features:**
- LangGraph agent for tool orchestration
- MongoDB checkpointing for state persistence
- Streaming with executionId tracking
- App-agnostic routing

#### AuthService
- Wallet signature verification
- JWT token generation/validation
- User session management

#### UserService
- User profile management
- Address verification

### 3. **Tools** (`src/tools/`)

20+ blockchain tools categorized as:

**Query Tools:**
- `get_balance` - Fetch wallet balance
- `get_token_price` - Get current token price
- `get_transaction` - Get transaction details
- `get_portfolio` - Retrieve portfolio overview

**Action Tools:**
- `place_order` / `create_order` - Swap tokens (returns unsigned txn)
- `transfer_sei` / `transfer_erc20` - Transfer tokens
- `wrap_sei` - Wrap SEI to WSEI
- `unwrap_sei` - Unwrap WSEI to SEI
- `approve_erc20` - Approve token spending

**Format:**
Each tool returns:
```typescript
{
  content: string,           // Stringified result
  tool_output: any,          // Parsed result
  executionId: string,       // Unique UUID for tracking
  redirectUrl?: string       // Where to complete the action
}
```

### 4. **Database Models** (`src/database/mongo/models/`)

- **User**: User profiles & wallet addresses
- **History**: Chat messages & execution logs
- **ApiKey**: App authentication keys
- **Transaction**: Transaction tracking

### 5. **Middleware** (`src/middleware/`)

#### ApiKeyMiddleware
- Validates API keys from integrating apps
- Associates requests with app identity

#### AuthMiddleware
- JWT token validation
- User address extraction

#### ResponseFormatter
- Standardizes all API responses
- Error handling & formatting

---

## 🔌 Integration Guide

### For External App Developers

#### 1. Register Your App

Contact the SDK team to register your app and get:
- API Key for authentication
- App ID for routing configuration
- App-specific routing URLs

#### 2. Embed Chat Widget

In your React/Vue/Angular app:

```javascript
const appRouting = {
  swap: "https://myapp.com/swap",
  transfer: "https://myapp.com/transfer",
  approvals: "https://myapp.com/permissions"
};

const streamUrl = new URL("http://localhost:4000/v1/llm/stream");
streamUrl.searchParams.append("prompt", userMessage);
streamUrl.searchParams.append("address", userAddress);
streamUrl.searchParams.append("appId", "myapp");
streamUrl.searchParams.append("appRouting", JSON.stringify(appRouting));

const eventSource = new EventSource(streamUrl);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === "token") {
    // Display streaming text
    updateChatUI(data.text);
  } else if (data.type === "tool") {
    // Tool was executed
    console.log("Redirect to:", data.redirectUrl);
    console.log("Transaction:", data.tool_output);
    // Redirect user to complete action
    window.location.href = data.redirectUrl;
  }
};
```

#### 3. Handle Callback

After user completes action on your platform:

```javascript
// Notify backend of completion
fetch("http://localhost:4000/v1/llm/tool-status", {
  method: "PUT",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    address: userAddress,
    executionId: executionIdFromStream,
    status: "completed",
    hash: transactionHash
  })
});
```

---

## 🔐 Authentication Flow

```
User Wallet                    Backend                    Blockchain
    ↓                           ↓                            ↓
    ├─── GET /auth/login ───────→ Generate nonce
    │                           ↓
    ← ─ ─ nonce message ─ ─ ─ ─ ─
    │
    │ (User signs with wallet)
    │
    ├─── POST /auth/login ──────→ Verify signature
    │    (signed message)        ↓
    │                      Check sig + address
    │                           ↓
    ← ─ ─ JWT token ─ ─ ─ ─ ─ ─ ─
    │
    └─── All requests with token in Authorization header
```

---

## 📊 Routing System (App-Agnostic)

The backend uses a two-level routing system:

### Level 1: Generic Tool-to-Category Mapping
```typescript
{
  'place_order': 'swap',
  'transfer_sei': 'transfer',
  'approve_erc20': 'approvals'
}
```

### Level 2: App-Specific URL Mapping
```javascript
// App 1
{ swap: "https://app1.com/swap", transfer: "https://app1.com/transfer" }

// App 2
{ swap: "https://app2.com/trade", transfer: "https://app2.com/send" }
```

**Example Flow:**
1. User says: "Swap 1 SEI for USDC"
2. LLM selects tool: `place_order`
3. Backend maps: `place_order` → `swap` category
4. Backend looks up: `appRouting['swap']` → `https://app1.com/swap`
5. Response includes: `redirectUrl: "https://app1.com/swap"`

---

## 📝 Example Requests & Responses

### Example 1: Simple Query

```bash
curl "http://localhost:4000/v1/llm/stream?prompt=what%20is%20my%20balance&address=0x..." \
  -H "Authorization: Bearer <token>"
```

Response:
```
data: {"type":"token","text":"Let me check "}
data: {"type":"token","text":"your balance..."}
data: {"type":"tool","toolName":"get_balance","content":"5.2 SEI","tool_output":{"balance":"5.2"},"executionId":"..."}
data: {"type":"token","text":"Your balance is 5.2 SEI."}
```

### Example 2: Action with Redirect

```bash
curl "http://localhost:4000/v1/llm/stream?prompt=swap%201%20SEI%20for%20USDC&address=0x...,&appId=myapp" \
  -H "Authorization: Bearer <token>"
```

Response:
```
data: {"type":"token","text":"I'll create a swap "}
data: {"type":"token","text":"for you..."}
data: {"type":"tool","toolName":"place_order","tool_output":{"from":"0x...","to":"0x...","amount":"1000000000000000000"},"executionId":"550e8400-e29b-41d4-a716-446655440000","redirectUrl":"https://myapp.com/swap"}
data: {"type":"token","text":"Ready to swap. You'll be redirected now."}
```

---

## 🧪 Testing

Run the history test:

```bash
npx ts-node test/history.test.ts
```

This generates `test/output/chat-history.json` with test results.

---

## 📚 Key Files Structure

```
sdk-backend/
├── src/
│   ├── app.ts                          # Express app initialization
│   ├── envConfig.ts                    # Environment variables
│   ├── controller/
│   │   ├── AuthController.ts
│   │   └── LlmController.ts
│   ├── services/
│   │   ├── LlmService.ts              # Main service logic
│   │   ├── AuthService.ts
│   │   └── interfaces/
│   │       ├── ILlmService.ts
│   │       └── IAuthService.ts
│   ├── tools/
│   │   ├── langGraphTools.ts          # All 20+ blockchain tools
│   │   └── core/                      # Tool implementations
│   ├── database/
│   │   ├── mongo/
│   │   │   ├── UserOp.ts
│   │   │   └── models/
│   │   │       ├── User.ts
│   │   │       ├── History.ts
│   │   │       └── Transaction.ts
│   │   └── redis/
│   │       └── RedisService.ts
│   ├── middleware/
│   │   ├── ApiKeyMiddleware.ts
│   │   ├── AuthMiddleware.ts
│   │   └── ResponseFormatter.ts
│   ├── types/
│   │   ├── history.ts
│   │   ├── requestTypes.ts
│   │   └── user.ts
│   └── ioc-container/
│       └── ioc.config.ts              # Dependency injection
├── test/
│   └── history.test.ts                # Integration tests
├── package.json
├── tsconfig.json
└── .env                               # Configuration
```

---

## 🚨 Troubleshooting

### Issue: "address query parameter is required"
**Solution:** Include `?address=0x...` in all LLM endpoints

### Issue: "Failed to get chat history: Not Found"
**Solution:** Ensure the server is running and user has chat history

### Issue: "Unauthorized" on protected routes
**Solution:** Get JWT token from `/auth/login` and include in `Authorization: Bearer <token>`

### Issue: MongoDB connection fails
**Solution:** Check `MONGO_URI` in `.env` and ensure MongoDB is running

### Issue: LLM not responding
**Solution:** Verify `GEMINI_API_KEY` is set and valid

---

## 📞 Support

For issues or questions:
- Check `.env` configuration
- Review logs in console output
- Check MongoDB & Redis connections
- Ensure Sei RPC URL is accessible

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a PR with detailed description

---

**Built with ❤️ for Sei Blockchain**
