import { z } from "zod";
import * as services from "./core/services/index";
import {
  DEFAULT_NETWORK,
  getRpcUrl,
  getSupportedNetworks,
  resolveChainId,
} from "./core/chains";
import { OrderTypeEnum } from "./enums/orderTypeEnum";
import { parseDeadlineToTimestamp } from "./core/helper";
import { parseUnits } from "ethers";
import { randomUUID } from "crypto";

// Interface for LangChain tool function
interface LangChainTool {
  tool: (fn: any, config: any) => any;
}

const langchainTools = require("@langchain/core/tools") as LangChainTool;

export const getTransactionTool = langchainTools.tool(
  async ({
    txHash,
    network = DEFAULT_NETWORK,
  }: {
    txHash: string;
    network?: string;
  }) => {
    try {
      const transaction = await services.getTransaction(
        txHash as `0x${string}`,
        network
      );

      return {
        text: services.helpers.formatJson(transaction),
        tool_output: transaction,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching transaction ${txHash}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_transaction",
    description: "Get transaction details by hash",
    schema: z.object({
      txHash: z.string().describe("The transaction hash"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// NETWORK INFORMATION TOOLS

export const getChainInfoTool = langchainTools.tool(
  async ({ network = DEFAULT_NETWORK }: { network?: string }) => {
    try {
      const chainId = resolveChainId(network);
      const blockNumber = await services.getBlockNumber(network);
      const rpcUrl = getRpcUrl(network);

      return {
        text: JSON.stringify(
          {
            network,
            chainId,
            blockNumber: blockNumber.toString(),
            rpcUrl,
          },
          null,
          2
        ),
        tool_output: {
          network,
          chainId,
          blockNumber: blockNumber.toString(),
          rpcUrl,
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching chain info: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_chain_info",
    description: "Get information about Sei network",
    schema: z.object({
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to sei."
        ),
    }),
  }
);

export const getSupportedNetworksTool = langchainTools.tool(
  async () => {
    try {
      const networks = getSupportedNetworks();

      return {
        text: JSON.stringify(
          {
            supportedNetworks: networks,
          },
          null,
          2
        ),
        tool_output: { supportedNetworks: networks },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching supported networks: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_supported_networks",
    description: "Get a list of supported EVM networks",
    schema: z.object({}),
  }
);

// BLOCK TOOLS

export const getBlockByNumberTool = langchainTools.tool(
  async ({
    blockNumber,
    network = DEFAULT_NETWORK,
  }: {
    blockNumber: number;
    network?: string;
  }) => {
    try {
      const block = await services.getBlockByNumber(blockNumber, network);

      return {
        text: JSON.stringify(
          {
            network,
            block: {
              number: block.number?.toString(),
              hash: block.hash,
              timestamp: block.timestamp?.toString(),
              transactionCount: block.transactions?.length || 0,
            },
          },
          null,
          2
        ),
        tool_output: {
          network,
          block: {
            number: block.number?.toString(),
            hash: block.hash,
            timestamp: block.timestamp?.toString(),
            transactionCount: block.transactions?.length || 0,
          },
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching block ${blockNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_block_by_number",
    description: "Get a block by its block number",
    schema: z.object({
      blockNumber: z.number().describe("The block number to fetch"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const getLatestBlockTool = langchainTools.tool(
  async ({ network = DEFAULT_NETWORK }: { network?: string }) => {
    try {
      const blockNumber = await services.getBlockNumber(network);

      return {
        text: JSON.stringify(
          {
            network,
            latestBlockNumber: blockNumber.toString(),
          },
          null,
          2
        ),
        tool_output: {
          network,
          latestBlockNumber: blockNumber.toString(),
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching latest block: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_latest_block",
    description: "Get the latest block",
    schema: z.object({
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// BALANCE TOOLS

export const getBalanceTool = langchainTools.tool(
  async ({
    address,
    network = DEFAULT_NETWORK,
  }: {
    address: string;
    network?: string;
  }) => {
    try {
      const balance = await services.getBalance(address, network);

      return {
        text: JSON.stringify(
          {
            address,
            network,
            balance: {
              wei: balance.wei.toString(),
              ether: balance.sei,
            },
          },
          null,
          2
        ),
        tool_output: {
          address,
          network,
          balance: {
            wei: balance.wei.toString(),
            ether: balance.sei,
          },
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching balance for ${address}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_balance",
    description: "Get the native token balance (Sei) for an address",
    schema: z.object({
      address: z
        .string()
        .describe(
          "The wallet address (e.g., '0x1234...') to check the balance for"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to sei."
        ),
    }),
  }
);

export const getErc20BalanceTool = langchainTools.tool(
  async ({ address, tokenAddress, network = DEFAULT_NETWORK }) => {
    try {
      const balance = await services.getERC20Balance(
        tokenAddress,
        address,
        network
      );

      return {
        text: JSON.stringify(
          {
            address,
            tokenAddress,
            network,
            balance: {
              raw: balance.raw.toString(),
              formatted: balance.formatted,
              decimals: balance.token.decimals,
            },
          },
          null,
          2
        ),
        tool_output: {
          address,
          tokenAddress,
          network,
          balance: {
            raw: balance.raw.toString(),
            formatted: balance.formatted,
            decimals: balance.token.decimals,
          },
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching ERC20 balance for ${address}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_erc20_balance",
    description: "Get the ERC20 token balance for an address",
    schema: z.object({
      address: z
        .string()
        .describe("The wallet address to check the balance for"),
      tokenAddress: z
        .string()
        .describe("The contract address of the ERC20 token"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const getTokenBalanceTool = langchainTools.tool(
  async ({
    tokenAddress,
    ownerAddress,
    network = DEFAULT_NETWORK,
  }): Promise<any> => {
    try {
      console.log("bitch");
      const balance = await services.getERC20Balance(
        tokenAddress,
        ownerAddress,
        network
      );

      return {
        text: JSON.stringify(
          {
            tokenAddress,
            owner: ownerAddress,
            network,
            raw: balance.raw.toString(),
            formatted: balance.formatted,
            symbol: balance.token.symbol,
            decimals: balance.token.decimals,
          },
          null,
          2
        ),
        tool_output: {
          tokenAddress,
          owner: ownerAddress,
          network,
          raw: balance.raw.toString(),
          formatted: balance.formatted,
          symbol: balance.token.symbol,
          decimals: balance.token.decimals,
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching token balance: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_token_balance",
    description:
      "Get the token balance for an address using token symbol or address",
    schema: z.object({
      tokenAddress: z
        .string()
        .describe(
          "The contract address name of the ERC20 token (e.g., '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1')"
        ),
      ownerAddress: z
        .string()
        .describe(
          "The wallet address name to check the balance for (e.g., '0x1234...')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to sei."
        ),
    }),
  }
);

// TRANSACTION TOOLS

export const getTransactionReceiptTool = langchainTools.tool(
  async ({
    txHash,
    network = DEFAULT_NETWORK,
  }: {
    txHash: string;
    network?: string;
  }) => {
    try {
      const receipt = await services.getTransactionReceipt(
        txHash as `0x${string}`,
        network
      );

      return {
        text: JSON.stringify(receipt, null, 2),
        tool_output: receipt,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching transaction receipt ${txHash}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "get_transaction_receipt",
    description: "Get transaction receipt by hash",
    schema: z.object({
      txHash: z.string().describe("The transaction hash"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// TRANSFER TOOLS

export const transferSeiTool = langchainTools.tool(
  async ({
    to,
    amount,
    network = DEFAULT_NETWORK,
  }: {
    to: string;
    amount: string;
    network?: string;
  }) => {
    try {
      const unsignedTx = await services.buildSeiTransferTx(to, amount, network);

      return {
        text: "An unsigned SEI transfer transaction has been prepared. Please sign and send it using your wallet.",
        tool_output: unsignedTx,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error transferring ${amount} SEI to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "transfer_sei",
    description: "Transfer native SEI tokens to an address",
    schema: z.object({
      to: z.string().describe("The recipient address"),
      amount: z.string().describe("The amount to transfer in SEI"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const transferTokenTool = langchainTools.tool(
  async ({ tokenAddress, toAddress, amount, network = DEFAULT_NETWORK }) => {
    try {
      const unsignedTx = await services.buildTransferERC20(
        tokenAddress,
        toAddress,
        amount,
        network
      );
      console.log("4");
      return {
        text: "An unsigned ERC20 transfer transaction has been prepared. Please sign and send it using your wallet.",
        tool_output: unsignedTx,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error building ERC20 transfer transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "transfer_token",
    description:
      "Transfer ERC20 tokens to another address. This creates an unsigned transaction that can then be signed by the user.",
    schema: z.object({
      tokenAddress: z
        .string()
        .describe("The address of the ERC20 token contract"),
      toAddress: z.string().describe("The recipient address"),
      amount: z
        .string()
        .describe(
          "The amount of tokens to send (in token units, e.g., '10' for 10 tokens, dont include decimals)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to sei."
        ),
    }),
  }
);

// NFT TOOLS

export const transferNftTool = langchainTools.tool(
  async ({
    fromAddress,
    to,
    tokenAddress,
    tokenId,
    network = DEFAULT_NETWORK,
  }: {
    fromAddress: string;
    to: string;
    tokenAddress: string;
    tokenId: string;
    network?: string;
  }) => {
    try {
      const result = await services.buildTransferERC721(
        tokenAddress as `0x${string}`,
        fromAddress,
        to as `0x${string}`,
        BigInt(tokenId),
        network
      );

      return {
        text: "An unsigned ERC721 (NFT) transfer transaction has been prepared. Please sign and send it using your wallet.",
        tool_output: result,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error transferring NFT ${tokenId} from ${tokenAddress} to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "transfer_nft",
    description: "Transfer an NFT (ERC721) to an address",
    schema: z.object({
      fromAddress: z.string().describe("The current owner address"),
      to: z.string().describe("The recipient address"),
      tokenAddress: z.string().describe("The contract address of the NFT"),
      tokenId: z.string().describe("The token ID of the NFT"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const transferErc1155Tool = langchainTools.tool(
  async ({
    tokenAddress,
    fromAddress,
    toAddress,
    tokenId,
    amount,
    network = DEFAULT_NETWORK,
  }) => {
    try {
      const unsignedTx = await services.buildTransferERC1155(
        tokenAddress,
        fromAddress,
        toAddress,
        BigInt(tokenId),
        amount,
        network
      );

      return {
        text: "An unsigned ERC1155 transfer transaction has been prepared. Please sign and send it using your wallet.",
        tool_output: unsignedTx,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error building ERC1155 transfer transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isError: true,
        executionId: randomUUID(),
      };
    }
  },
  {
    name: "transfer_erc1155",
    description: "Transfer ERC1155 tokens to an address",
    schema: z.object({
      tokenAddress: z
        .string()
        .describe("The address of the ERC1155 token contract"),
      fromAddress: z.string().describe("The current owner address"),
      toAddress: z.string().describe("The recipient address"),
      tokenId: z.string().describe("The token ID to transfer (e.g., '1234')"),
      amount: z
        .string()
        .describe(
          "The amount of tokens to transfer (e.g., '1' for NFTs or '10' for fungible tokens)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to sei."
        ),
    }),
  }
);

// APPROVAL TOOLS

export const approveTokenSpendingTool = langchainTools.tool(
  async ({
    spender,
    amount,
    tokenAddress,
    network = DEFAULT_NETWORK,
  }: {
    spender: string;
    amount: string;
    tokenAddress: string;
    network?: string;
  }) => {
    try {
      const result = await services.buildApproveERC20(
        spender as `0x${string}`,
        amount,
        tokenAddress as `0x${string}`,
        network
      );

      return {
        text: JSON.stringify(result, null, 2),
        tool_output: result,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error approving ${amount} tokens from ${tokenAddress} for spender ${spender}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "approve_token_spending",
    description: "Approve a spender to spend tokens on your behalf",
    schema: z.object({
      spender: z
        .string()
        .describe("The address that will be approved to spend tokens"),
      amount: z.string().describe("The amount to approve"),
      tokenAddress: z.string().describe("The contract address of the token"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const approveErc20Tool = langchainTools.tool(
  async ({
    spender,
    amount,
    tokenAddress,
    network = DEFAULT_NETWORK,
  }: {
    spender: string;
    amount: string;
    tokenAddress: string;
    network?: string;
  }) => {
    try {
      const result = await services.buildApproveERC20(
        spender as `0x${string}`,
        amount,
        tokenAddress as `0x${string}`,
        network
      );

      return {
        text: JSON.stringify(result, null, 2),
        tool_output: result,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error approving ${amount} ERC20 tokens from ${tokenAddress} for spender ${spender}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "approve_erc20",
    description: "Approve an ERC20 token for spending",
    schema: z.object({
      spender: z
        .string()
        .describe("The address that will be approved to spend tokens"),
      amount: z.string().describe("The amount to approve"),
      tokenAddress: z
        .string()
        .describe("The contract address of the ERC20 token"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// TOKEN INFO TOOLS

export const getTokenInfoTool = langchainTools.tool(
  async ({
    tokenAddress,
    network = DEFAULT_NETWORK,
  }: {
    tokenAddress: string;
    network?: string;
  }) => {
    try {
      const tokenInfo = await services.getERC20TokenInfo(
        tokenAddress as `0x${string}`,
        network
      );

      return {
        text: JSON.stringify(tokenInfo, null, 2),
        tool_output: tokenInfo,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching token info for ${tokenAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_token_info",
    description: "Get information about an ERC20 token",
    schema: z.object({
      tokenAddress: z.string().describe("The contract address of the token"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const getNftInfoTool = langchainTools.tool(
  async ({
    tokenAddress,
    tokenId,
    network = DEFAULT_NETWORK,
  }: {
    tokenAddress: string;
    tokenId: string;
    network?: string;
  }) => {
    try {
      const nftInfo = await services.getERC721TokenMetadata(
        tokenAddress as `0x${string}`,
        BigInt(tokenId),
        network
      );

      return {
        text: JSON.stringify(nftInfo, null, 2),
        tool_output: nftInfo,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching NFT info for token ${tokenId} at ${tokenAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_nft_info",
    description: "Get information about an NFT",
    schema: z.object({
      tokenAddress: z.string().describe("The contract address of the NFT"),
      tokenId: z.string().describe("The token ID"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const getNftBalanceTool = langchainTools.tool(
  async ({
    address,
    tokenAddress,
    network = DEFAULT_NETWORK,
  }: {
    address: string;
    tokenAddress: string;
    network?: string;
  }) => {
    try {
      // For ERC721, we need to implement a balance check - this would typically require checking ownership
      // This is a placeholder implementation - you may need to implement specific ERC721 balance logic
      const balance = { address, tokenAddress, network, balance: "0" }; // Placeholder

      return {
        text: JSON.stringify(balance, null, 2),
        tool_output: balance,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching NFT balance for ${address} from ${tokenAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_nft_balance",
    description: "Get the NFT balance for an address",
    schema: z.object({
      address: z.string().describe("The wallet address to check"),
      tokenAddress: z.string().describe("The contract address of the NFT"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const getErc1155BalanceTool = langchainTools.tool(
  async ({
    address,
    tokenAddress,
    tokenId,
    network = DEFAULT_NETWORK,
  }: {
    address: string;
    tokenAddress: string;
    tokenId: string;
    network?: string;
  }) => {
    try {
      // For ERC1155 balance, we need to implement balance checking for specific token IDs
      // This is a placeholder implementation
      const balance = { address, tokenAddress, tokenId, network, balance: "0" }; // Placeholder

      return {
        text: JSON.stringify(balance, null, 2),
        tool_output: balance,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching ERC1155 balance for token ${tokenId} at ${tokenAddress} for ${address}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_erc1155_balance",
    description: "Get the ERC1155 token balance for an address",
    schema: z.object({
      address: z.string().describe("The wallet address to check"),
      tokenAddress: z
        .string()
        .describe("The contract address of the ERC1155 token"),
      tokenId: z.string().describe("The token ID"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// WALLET TOOLS

export const getAddressFromPrivateKeyTool = langchainTools.tool(
  async ({ privateKey }: { privateKey: string }) => {
    try {
      // Import viem functions for address derivation
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      return {
        text: JSON.stringify(
          {
            privateKey: privateKey.slice(0, 10) + "...", // Mask private key for security
            address: account.address,
          },
          null,
          2
        ),
        tool_output: {
          privateKey: privateKey.slice(0, 10) + "...",
          address: account.address,
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error deriving address from private key: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_address_from_private_key",
    description: "Get wallet address from private key",
    schema: z.object({
      privateKey: z.string().describe("The private key"),
    }),
  }
);

// SEI WRAPPING TOOLS

export const wrapSeiTool = langchainTools.tool(
  async ({
    amount,
    network = DEFAULT_NETWORK,
  }: {
    amount: string;
    network?: string;
  }) => {
    try {
      const result = await services.buildDepositSEITx(amount, network);

      return {
        text: JSON.stringify(result, null, 2),
        tool_output: result,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error wrapping ${amount} SEI: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "wrap_sei",
    description: "Wrap SEI tokens to wSEI",
    schema: z.object({
      amount: z.string().describe("The amount of SEI to wrap"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const unwrapSeiTool = langchainTools.tool(
  async ({
    amount,
    network = DEFAULT_NETWORK,
  }: {
    amount: string;
    network?: string;
  }) => {
    try {
      const result = await services.buildWithdrawSEITx(amount, network);

      return {
        text: JSON.stringify(result, null, 2),
        tool_output: result,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error unwrapping ${amount} wSEI: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "unwrap_sei",
    description: "Unwrap wSEI tokens to SEI",
    schema: z.object({
      amount: z.string().describe("The amount of wSEI to unwrap"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

// PRICE TOOLS

export const getTokenPricesTool = langchainTools.tool(
  async ({ tokens }: { tokens: string[] }) => {
    try {
      // Get prices for multiple tokens - placeholder implementation
      const prices = tokens.map((token) => ({ token, price: "N/A" }));

      return {
        text: JSON.stringify(prices, null, 2),
        tool_output: prices,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching token prices: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_token_prices",
    description: "Get prices for multiple tokens",
    schema: z.object({
      tokens: z
        .array(z.string())
        .describe("Array of token symbols or addresses"),
    }),
  }
);

export const getCurrentTokenPricesTool = langchainTools.tool(
  async ({ network = DEFAULT_NETWORK }: { network?: string } = {}) => {
    try {
      const prices = await services.getCurrentPrices(network);

      return {
        text: JSON.stringify(prices, null, 2),
        tool_output: prices,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching current token prices: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_current_token_prices",
    description: "Get current prices for commonly traded tokens",
    schema: z.object({}),
  }
);

export const getPriceOfTokenTool = langchainTools.tool(
  async ({
    token,
    network = DEFAULT_NETWORK,
  }: {
    token: string;
    network?: string;
  }) => {
    try {
      const price = await services.getPriceForToken(token, network);

      return {
        text: JSON.stringify({ token, price, network }, null, 2),
        tool_output: { token, price, network },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error fetching price for token ${token}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "get_price_of_token",
    description: "Get the current price of a specific token",
    schema: z.object({
      token: z.string().describe("Token symbol or address"),
    }),
  }
);

// TRADING/SWAP TOOLS

export const createOrderTool = langchainTools.tool(
  async ({
    amount,
    destTokenAddress,
    srcTokenAddress,
    fillDelay,
    limitPrice = "0",
    chunks = 1,
    deadline,
    orderType,
    network = DEFAULT_NETWORK,
    userAddress,
  }) => {
    try {
      console.log("add", userAddress);
      // The TWAP contract is the spender
      const spenderAddress = "0xde737dB24548F8d41A4a3Ca2Bac8aaaDc4DBA099";

      // Check current allowance
      const allowance = await services.getAllowance(
        srcTokenAddress,
        userAddress,
        spenderAddress,
        network
      );

      const requiredAmount = parseUnits(amount, allowance.token.decimals);
      console.log("parseunits", deadline);
      // If allowance is less than the required amount, ask for approval.
      if (allowance.raw < requiredAmount) {
        console.log("low allowance");
        return {
          text: `Insufficient allowance. (for the ai agent) Please approve at least ${amount} ${allowance.token.symbol} for the exchange contract.`,
          tool_output: {
            action: "approve_erc20",
            tokenAddress: srcTokenAddress,
            spenderAddress: spenderAddress,
            amount: amount, // The amount to approve
            network: network,
          },
          executionId: randomUUID(),
        };
      }

      // If we have enough allowance, proceed with building the limit order transaction.
      const deadlineTimestamp = parseDeadlineToTimestamp(deadline);
      const fillDelayInSeconds = fillDelay
        ? parseDeadlineToTimestamp(fillDelay)
        : null;
      console.log("building ask");
      const unsignedTx = await services.buildask(
        srcTokenAddress,
        destTokenAddress,
        amount,
        fillDelayInSeconds,
        chunks,
        deadlineTimestamp,
        limitPrice,
        orderType as unknown as OrderTypeEnum,
        network
      );

      return {
        text: "An unsigned limit order transaction has been prepared. Please sign and send it using your wallet.",
        tool_output: unsignedTx,
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error building limit order transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "place_order",
    description:
      'Place limit order or market order for a pair of tokens. This creates an unsigned transaction that can be signed by the user. For deadline, you can enter durations like "1 week", "3 days", or an exact date like "3 August 2025" or if its something informal like 3rd aug 25 then convert it in standard format like 3 August 2025 before feeding to the tool.The tool has Helper to parse duration or date string to timestamp. approve_erc20 needs to be called before this tool to ensure sufficient allowance for the src token. If the from or to token is a native token (sei) then it needs to be wrapped or unwrapped to wsei accordingly using appropriate tool in the MCP.',
    schema: z.object({
      amount: z.string().describe("The src Amount user wants to swap for"),
      destTokenAddress: z
        .string()
        .describe("The token address which the user wants to swap for"),
      srcTokenAddress: z
        .string()
        .describe("The token address the user wants to swap in"),
      fillDelay: z
        .string()
        .optional()
        .describe("Delay value in seconds or minutes or hours"),
      limitPrice: z
        .string()
        .optional()
        .describe(
          "The min price at which the user wants to sell source tokens"
        ),
      chunks: z
        .number()
        .optional()
        .describe("The number of chunks user wants to divide the order"),
      deadline: z
        .string()
        .describe(
          "The deadline for the limit order. Accepts durations like '1 week', '3 days', or a date like '3 August 2025'."
        ),
      orderType: z
        .enum([
          "DCA_MARKET_ORDER",
          "DCA_LIMIT_ORDER",
          "MARKET_ORDER",
          "LIMIT_ORDER",
          "SNIPER_DCA",
          "LIMIT_LADDER",
        ])
        .optional()
        .describe(
          "Choose one of the order type to execute, its an optional filed."
        ),

      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to sei."
        ),
      userAddress: z.string().describe("The user address"),
    }),
  }
);

// UTILITY TOOLS

export const convertTokenSymbolToAddressTool = langchainTools.tool(
  async ({
    symbol,
    network = DEFAULT_NETWORK,
  }: {
    symbol: string;
    network?: string;
  }) => {
    try {
      const tokenAddress = await services.getTokenAddress(symbol);

      return {
        text: JSON.stringify(
          {
            symbol,
            address: tokenAddress,
            network,
          },
          null,
          2
        ),
        tool_output: {
          symbol,
          address: tokenAddress,
          network,
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error converting token symbol ${symbol} to address: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "convert_token_symbol_to_address",
    description: "Convert a token symbol to its contract address",
    schema: z.object({
      symbol: z.string().describe("Token symbol (e.g., 'USDC', 'WSEI')"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

export const convertAddressToTokenSymbolTool = langchainTools.tool(
  async ({
    address,
    network = DEFAULT_NETWORK,
  }: {
    address: string;
    network?: string;
  }) => {
    try {
      const tokenInfo = await services.getERC20TokenInfo(
        address as `0x${string}`,
        network
      );

      return {
        text: JSON.stringify(
          {
            address,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            network,
          },
          null,
          2
        ),
        tool_output: {
          address,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          network,
        },
        executionId: randomUUID(),
      };
    } catch (error) {
      return {
        text: `Error converting address ${address} to token symbol: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool_output: null,
        executionId: randomUUID(),
        isError: true,
      };
    }
  },
  {
    name: "convert_address_to_token_symbol",
    description: "Convert a contract address to its token symbol",
    schema: z.object({
      address: z.string().describe("Token contract address"),
      network: z
        .string()
        .optional()
        .describe("Network name or chain ID. Defaults to sei."),
    }),
  }
);

const toolsList = [
  // Network Tools
  getChainInfoTool,
  getSupportedNetworksTool,

  // Block Tools
  getBlockByNumberTool,
  getLatestBlockTool,

  // Balance Tools
  getBalanceTool,
  getErc20BalanceTool,
  getTokenBalanceTool,

  // Transaction Tools
  getTransactionTool,
  getTransactionReceiptTool,

  // Transfer Tools
  transferSeiTool,
  transferTokenTool,
  transferNftTool,
  transferErc1155Tool,

  // Approval Tools
  approveTokenSpendingTool,
  approveErc20Tool,

  // Token Info Tools
  getTokenInfoTool,
  getNftInfoTool,
  getNftBalanceTool,
  getErc1155BalanceTool,

  // Wallet Tools
  getAddressFromPrivateKeyTool,

  // SEI Wrapping Tools
  wrapSeiTool,
  unwrapSeiTool,

  // Price Tools
  getTokenPricesTool,
  getCurrentTokenPricesTool,
  getPriceOfTokenTool,

  // Trading/Swap Tools
  createOrderTool,

  // Utility Tools
  convertTokenSymbolToAddressTool,
  convertAddressToTokenSymbolTool,
];

export default toolsList;
