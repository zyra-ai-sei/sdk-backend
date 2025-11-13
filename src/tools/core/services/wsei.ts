// @ts-nocheck
import { getWalletClientFromProvider, getPublicClient } from "./clients";
import { DEFAULT_NETWORK } from "../chains";
import { parseEther, type Hash, encodeFunctionData } from "viem";
import * as services from "./index";
import wseiabi from "./wseiABI";

// Replace with actual wSEI contract address
const WSEI_CONTRACT_ADDRESS = '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7';

/**
 * Deposit SEI to get wSEI
 * @param amount Amount of SEI to deposit (in ether)
 * @param network Network name or chain ID
 * @returns Transaction hash and amount details
 * @throws Error if no private key is available
 */
export function buildDepositSEITx(
  amount: string,
  network = DEFAULT_NETWORK
) {
  const publicClient = getPublicClient(network);
  const rawAmount = parseEther(amount);
  
  return {
    to: WSEI_CONTRACT_ADDRESS,
    value: rawAmount.toString(),
    data: '0xd0e30db0', // deposit() function selector
  };
}

export function buildWithdrawSEITx(
  amount: string,
  network = DEFAULT_NETWORK
) {
  const publicClient = getPublicClient(network);
  const rawAmount = parseEther(amount);
  
  // The ABI-encoded function call for withdraw(uint256)
  const withdrawFunction = {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        type: 'uint256',
        name: 'wad'
      }
    ],
    outputs: []
  } as const;
  
  // Encode the function data using the contract ABI
  const data = encodeFunctionData({
    abi: [withdrawFunction],
    functionName: 'withdraw',
    args: [rawAmount]
  });
  
  return {
    to: WSEI_CONTRACT_ADDRESS,
    data: data
  };
}

export async function depositSEI(
  amount: string,
  network = DEFAULT_NETWORK
): Promise<{
  txHash: Hash;
  amount: {
    raw: bigint;
    formatted: string;
  };
}> {
  const walletClient = await getWalletClientFromProvider(network);
  
  if (!walletClient.account) {
    throw new Error("Wallet account not initialized properly");
  }

  // Parse the amount to wei
  const rawAmount = parseEther(amount);

  // Send the deposit transaction
  const hash = await walletClient.writeContract({
    address: WSEI_CONTRACT_ADDRESS,
    abi: wseiAbi,
    functionName: 'deposit',
    value: rawAmount,
    account: walletClient.account,
    chain: walletClient.chain,
  });

  return {
    txHash: hash,
    amount: {
      raw: rawAmount,
      formatted: amount,
    },
  };
}

/**
 * Withdraw SEI from wSEI
 * @param amount Amount of wSEI to withdraw (in ether)
 * @param network Network name or chain ID
 * @returns Transaction hash and amount details
 * @throws Error if no private key is available
 */
export async function withdrawSEI(
  amount: string,
  network = DEFAULT_NETWORK
): Promise<{
  txHash: Hash;
  amount: {
    raw: bigint;
    formatted: string;
  };
}> {
  const walletClient = await getWalletClientFromProvider(network);
  
  if (!walletClient.account) {
    throw new Error("Wallet account not initialized properly");
  }

  // Parse the amount to wei
  const rawAmount = parseEther(amount);

  // Send the withdraw transaction
  const hash = await walletClient.writeContract({
    address: WSEI_CONTRACT_ADDRESS,
    abi: wseiAbi,
    functionName: 'withdraw',
    args: [rawAmount],
    account: walletClient.account,
    chain: walletClient.chain,
  });

  return {
    txHash: hash,
    amount: {
      raw: rawAmount,
      formatted: amount,
    },
  };
}
