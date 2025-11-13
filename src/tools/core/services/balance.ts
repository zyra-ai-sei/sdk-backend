// @ts-nocheck
import { type Address, formatEther, formatUnits, getContract } from "viem";
import { DEFAULT_NETWORK } from "../chains";
import { getPublicClient } from "./clients";
import { readContract } from "./contracts";
import * as services from "./index";

const ORACLE_PRECOMPILE_ADDRESS: `0x${string}` =
  "0x0000000000000000000000000000000000001008";

export const ORACLE_PRECOMPILE_ABI = [
  {
    inputs: [],
    name: "getExchangeRates",
    outputs: [
      {
        components: [
          { internalType: "string", name: "denom", type: "string" },
          {
            components: [
              { internalType: "string", name: "exchangeRate", type: "string" },
              { internalType: "string", name: "lastUpdate", type: "string" },
              {
                internalType: "int64",
                name: "lastUpdateTimestamp",
                type: "int64",
              },
            ],
            internalType: "struct IOracle.OracleExchangeRate",
            name: "oracleExchangeRateVal",
            type: "tuple",
          },
        ],
        internalType: "struct IOracle.DenomOracleExchangeRatePair[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "lookback_seconds", type: "uint64" },
    ],
    name: "getOracleTwaps",
    outputs: [
      {
        components: [
          { internalType: "string", name: "denom", type: "string" },
          { internalType: "string", name: "twap", type: "string" },
          { internalType: "int64", name: "lookbackSeconds", type: "int64" },
        ],
        internalType: "struct IOracle.OracleTwap[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "address", name: "account" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [{ type: "address", name: "owner" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "uint256", name: "tokenId" }],
    name: "ownerOf",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [
      { type: "address", name: "account" },
      { type: "uint256", name: "id" },
    ],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Get the Sei balance for an address
 * @param address Sei address
 * @param network Network name or chain ID
 * @returns Balance in wei and sei
 */
export async function getBalance(
  address: string,
  network = DEFAULT_NETWORK
): Promise<{ wei: bigint; sei: string }> {
  const validatedAddress = services.helpers.validateAddress(address);

  const client = getPublicClient(network);
  const balance = await client.getBalance({ address: validatedAddress });

  return {
    wei: balance,
    sei: formatEther(balance),
  };
}

/**
 * Get the balance of an ERC20 token for an address
 * @param tokenAddress Token contract address
 * @param ownerAddress Owner address
 * @param network Network name or chain ID
 * @returns Token balance with formatting information
 */
export async function getERC20Balance(
  tokenAddress: string,
  ownerAddress: string,
  network = DEFAULT_NETWORK
): Promise<{
  raw: bigint;
  formatted: string;
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  console.log('reached at start', ownerAddress);
  const validatedTokenAddress = services.helpers.validateAddress(tokenAddress);
  const validatedOwnerAddress = services.helpers.validateAddress(ownerAddress);

  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: validatedTokenAddress,
    abi: erc20Abi,
    client: publicClient,
  });

  console.log('reached after contract instance created')

  const [balance, symbol, decimals] = await Promise.all([
    contract.read.balanceOf([validatedOwnerAddress]),
    contract.read.symbol(),
    contract.read.decimals(),
  ]);

  console.log('this is also done')

  return {
    raw: balance,
    formatted: formatUnits(balance, decimals),
    token: {
      symbol,
      decimals,
    },
  };
}

/**
 * Check if an address owns a specific NFT
 * @param tokenAddress NFT contract address
 * @param ownerAddress Owner address
 * @param tokenId Token ID to check
 * @param network Network name or chain ID
 * @returns True if the address owns the NFT
 */
export async function isNFTOwner(
  tokenAddress: string,
  ownerAddress: string,
  tokenId: bigint,
  network = DEFAULT_NETWORK
): Promise<boolean> {
  const validatedTokenAddress = services.helpers.validateAddress(tokenAddress);
  const validatedOwnerAddress = services.helpers.validateAddress(ownerAddress);

  try {
    const actualOwner = (await readContract(
      {
        address: validatedTokenAddress,
        abi: erc721Abi,
        functionName: "ownerOf",
        args: [tokenId],
      },
      network
    )) as Address;

    return actualOwner.toLowerCase() === validatedOwnerAddress.toLowerCase();
  } catch (error: unknown) {
    console.error(
      `Error checking NFT ownership: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

/**
 * Get the number of NFTs owned by an address for a specific collection
 * @param tokenAddress NFT contract address
 * @param ownerAddress Owner address
 * @param network Network name or chain ID
 * @returns Number of NFTs owned
 */
export async function getERC721Balance(
  tokenAddress: string,
  ownerAddress: string,
  network = DEFAULT_NETWORK
): Promise<bigint> {
  const validatedTokenAddress = services.helpers.validateAddress(tokenAddress);
  const validatedOwnerAddress = services.helpers.validateAddress(ownerAddress);

  return (await readContract(
    {
      address: validatedTokenAddress,
      abi: erc721Abi,
      functionName: "balanceOf",
      args: [validatedOwnerAddress],
    },
    network
  )) as Promise<bigint>;
}

export async function getCurrentPrices(network = DEFAULT_NETWORK) {
  const exchangeRates = await readContract({
    address: ORACLE_PRECOMPILE_ADDRESS,
    abi: ORACLE_PRECOMPILE_ABI,
    functionName: "getExchangeRates",
  });
  console.log('twap', exchangeRates[0].denom)

  return exchangeRates.map((rate) => ({
    denom: rate.denom,
    price: parseFloat(rate.oracleExchangeRateVal.exchangeRate),
    lastUpdate: new Date(
      Number(rate.oracleExchangeRateVal.lastUpdateTimestamp) * 1000
    ),
    lastUpdateString: rate.oracleExchangeRateVal.lastUpdate,
  }));
}

export async function getTwapData(
  lookbackHours = 1,
  network = DEFAULT_NETWORK
) {
  const lookbackSeconds = BigInt(lookbackHours * 3600);

  const twapData = await readContract({
    address: ORACLE_PRECOMPILE_ADDRESS,
    abi: ORACLE_PRECOMPILE_ABI,
    functionName: "getOracleTwaps",
    args: [lookbackSeconds],
  });
  console.log('twap', twapData[0].denom)
  return twapData.map((twap) => ({
    denom: twap.denom,
    price: parseFloat(twap.twap),
    lookbackHours: Number(twap.lookbackSeconds) / 3600,
  }));
}

export async function getPriceForToken(token: string, network=DEFAULT_NETWORK){
  const exchangeRates = await getCurrentPrices(network);
  const availableTokens = [
    "usdc",
    "usdt",
    "eth",
    "btc",
    "sei"
  ]
  let targetDenom = ""
  for(let i = 0; i<availableTokens.length; i++){
    const availableToken = availableTokens[i];
    if(token.includes(availableToken)){
      targetDenom = "u"+availableToken;
      break;
    }
  }

  return exchangeRates.find(rate => rate.denom === targetDenom);

}

/**
 * Get the balance of an ERC1155 token for an address
 * @param tokenAddress ERC1155 contract address
 * @param ownerAddress Owner address
 * @param tokenId Token ID to check
 * @param network Network name or chain ID
 * @returns Token balance
 */
export async function getERC1155Balance(
  tokenAddress: string,
  ownerAddress: string,
  tokenId: bigint,
  network = DEFAULT_NETWORK
): Promise<bigint> {
  const validatedTokenAddress = services.helpers.validateAddress(tokenAddress);
  const validatedOwnerAddress = services.helpers.validateAddress(ownerAddress);

  return (await readContract(
    {
      address: validatedTokenAddress,
      abi: erc1155Abi,
      functionName: "balanceOf",
      args: [validatedOwnerAddress, tokenId],
    },
    network
  )) as Promise<bigint>;
}
