// @ts-nocheck
import { type Address, type Hash, type Hex, formatUnits, getContract } from 'viem';
import { getPublicClient } from './clients';
import { DEFAULT_NETWORK } from '../chains';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
	{
		inputs: [],
		name: 'name',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'decimals',
		outputs: [{ type: 'uint8' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{ type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	}
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
	{
		inputs: [],
		name: 'name',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ type: 'uint256', name: 'tokenId' }],
		name: 'tokenURI',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	}
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
	{
		inputs: [{ type: 'uint256', name: 'id' }],
		name: 'uri',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	}
] as const;

/**
 * Get ERC20 token information
 */
export async function getERC20TokenInfo(
	tokenAddress: Address,
	network = 'sei'
): Promise<{
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: bigint;
	formattedTotalSupply: string;
}> {
	const publicClient = getPublicClient(network);

	const contract = getContract({
		address: tokenAddress,
		abi: erc20Abi,
		client: publicClient
	});

	const [name, symbol, decimals, totalSupply] = await Promise.all([
		contract.read.name(),
		contract.read.symbol(),
		contract.read.decimals(),
		contract.read.totalSupply()
	]);

	return {
		name,
		symbol,
		decimals,
		totalSupply,
		formattedTotalSupply: formatUnits(totalSupply, decimals)
	};
}

/**
 * Get ERC721 token metadata
 */
export async function getERC721TokenMetadata(
	tokenAddress: Address,
	tokenId: bigint,
	network = 'sei'
): Promise<{
	name: string;
	symbol: string;
	tokenURI: string;
}> {
	const publicClient = getPublicClient(network);

	const contract = getContract({
		address: tokenAddress,
		abi: erc721Abi,
		client: publicClient
	});

	const [name, symbol, tokenURI] = await Promise.all([contract.read.name(), contract.read.symbol(), contract.read.tokenURI([tokenId])]);

	return {
		name,
		symbol,
		tokenURI
	};
}

/**
 * Get ERC1155 token URI
 */
export async function getERC1155TokenURI(tokenAddress: Address, tokenId: bigint, network = 'sei'): Promise<string> {
	const publicClient = getPublicClient(network);

	const contract = getContract({
		address: tokenAddress,
		abi: erc1155Abi,
		client: publicClient
	});

	return contract.read.uri([tokenId]);
}

export async function getTokenAddress(tokenInfo:string) {
	tokenInfo = tokenInfo.toUpperCase();
	return TOKEN_ADDRESS_MAPPING[tokenInfo];
}

const TOKEN_ADDRESS_MAPPING = {
    "WSEI": "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7",
    "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7": "WSEI",
    "USDC": "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392",
    "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392": "USDC",
    "WBTC": "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c": "WBTC",
    "ISEI": "0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423",
    "0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423": "ISEI",
    "WETH": "0x160345fC359604fC6e70E3c5fAcbdE5F7A9342d8",
    "0x160345fC359604fC6e70E3c5fAcbdE5F7A9342d8": "WETH",
    "KAVAUSDT": "0xB75D0B03c06A926e488e2659DF1A861F860bD3d1",
    "0xB75D0B03c06A926e488e2659DF1A861F860bD3d1": "KAVAUSDT",
    "USDT": "0x9151434b16b9763660705744891fA906F660EcC5",
    "0x9151434b16b9763660705744891fA906F660EcC5": "USDT",
    "USDC.N": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1": "USDC.N",
    "SEIYAN": "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598",
    "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598": "SEIYAN",
    "FXS": "",
    "FASTUSD": "",
    "ROCK": "",
    "MILLI": "",
    "POPO": "",
    "USDA": "0x0Bbda0F76e205Fc6A160B90a09975fa443B3fE44",
    "0x0Bbda0F76e205Fc6A160B90a09975fa443B3fE44": "USDA",
    "APO": "0x5b8203e65aA5Be3F1CF53FD7fa21b91BA4038ECC",
    "0x5b8203e65aA5Be3F1CF53FD7fa21b91BA4038ECC": "APO",
};
