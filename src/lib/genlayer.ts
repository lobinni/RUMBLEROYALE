import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// Contract address - Deployed on GenLayer Studionet
// Explorer: https://explorer-studio.genlayer.com/address/0x2c7F41e491B8eBe0c38508D95C1625Bd225e5563
const CONTRACT = '0x2c7F41e491B8eBe0c38508D95C1625Bd225e5563' as `0x${string}`;

export const getContractAddress = () => CONTRACT;

// Check if MetaMask is installed
export function hasMetaMask(): boolean {
  return !!(window as any).ethereum;
}

// Connect to MetaMask
export async function connectMetaMask(): Promise<string> {
  if (!(window as any).ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask extension.');
  }
  
  const accounts: string[] = await (window as any).ethereum.request({
    method: 'eth_requestAccounts'
  });
  
  if (!accounts.length) {
    throw new Error('No accounts found');
  }
  
  return accounts[0];
}

// Get current connected account
export async function getCurrentAccount(): Promise<string | null> {
  if (!(window as any).ethereum) return null;
  
  try {
    const accounts: string[] = await (window as any).ethereum.request({
      method: 'eth_accounts'
    });
    return accounts[0] || null;
  } catch {
    return null;
  }
}

// Create client for write operations
function client(address: string) {
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider: (window as any).ethereum,
  });
}

// Create client for read operations
function readClient() {
  return createClient({
    chain: studionet,
  });
}

// ═══ User Registration ═══

export async function callRegisterUser(address: string, username: string) {
  console.log('[RumbleRoyale] register_user called with:', { address, username });

  const c = client(address);
  const h = await c.writeContract({
    address: CONTRACT,
    functionName: 'register_user',
    args: [address, username],
    value: 0n,
  });

  const receipt = await c.waitForTransactionReceipt({
    hash: h,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  console.log('[RumbleRoyale] register_user done. hash:', h, 'receipt:', receipt);
  return { hash: h as string, receipt };
}

export async function callGetUser(wallet: string) {
  try {
    const result = await readClient().readContract({
      address: CONTRACT,
      functionName: 'get_user',
      args: [wallet],
    });
    if (result) {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('Get user error:', e);
    return null;
  }
}

export async function callIsUsernameTaken(username: string) {
  try {
    const result = await readClient().readContract({
      address: CONTRACT,
      functionName: 'is_username_taken',
      args: [username],
    });
    if (result) {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed.taken === true;
    }
    return false;
  } catch (e) {
    console.warn('Check username error:', e);
    return false;
  }
}

// ═══ Read total games ═══
async function readTotalGames(): Promise<number> {
  try {
    const r = await readClient().readContract({
      address: CONTRACT,
      functionName: 'get_total_games',
      args: [],
    });
    const n = typeof r === 'number' ? r : Number(r);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

// ═══ Start Game - Write to contract ═══
export async function callStartGame(
  address: string,
  playerCount: number,
  seed: string
) {
  // Read current total BEFORE calling start_game
  const totalBefore = await readTotalGames();
  console.log('[RumbleRoyale] total_games before start_game:', totalBefore);

  const c = client(address);
  const h = await c.writeContract({
    address: CONTRACT,
    functionName: 'start_game',
    args: [address, playerCount, seed],
    value: 0n,
  });

  const receipt = await c.waitForTransactionReceipt({
    hash: h,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  // game_id = "game_{totalBefore + 1}"
  const gameId = `game_${totalBefore + 1}`;
  console.log('[RumbleRoyale] start_game done. hash:', h, 'gameId:', gameId, 'receipt:', receipt);
  
  return { hash: h as string, receipt, gameId };
}

// ═══ Submit Result - Write to contract ═══
// Note: survived is int (1 = true, 0 = false) to match contract
export async function callSubmitResult(
  address: string,
  gameId: string,
  rank: number,
  kills: number,
  survived: boolean,
  totalRounds: number
) {
  console.log('[RumbleRoyale] submit_result called with:', { gameId, rank, kills, survived, totalRounds });

  const c = client(address);
  const h = await c.writeContract({
    address: CONTRACT,
    functionName: 'submit_result',
    args: [gameId, address, rank, kills, survived ? 1 : 0, totalRounds],
    value: 0n,
  });

  const receipt = await c.waitForTransactionReceipt({
    hash: h,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  console.log('[RumbleRoyale] submit_result done. hash:', h, 'receipt:', receipt);
  return { hash: h as string, receipt };
}

// ═══ Get Leaderboard - Read from contract ═══
export async function callGetLeaderboard() {
  try {
    const result = await readClient().readContract({
      address: CONTRACT,
      functionName: 'get_leaderboard',
      args: [],
    });
    return result;
  } catch (e) {
    console.warn('Leaderboard error:', e);
    return [];
  }
}

// ═══ Get Total Games ═══
export async function callGetTotalGames() {
  return readTotalGames();
}

// ═══ Get Player Stats ═══
export async function callGetPlayerStats(wallet: string) {
  try {
    const result = await readClient().readContract({
      address: CONTRACT,
      functionName: 'get_player_stats',
      args: [wallet],
    });
    return result;
  } catch (e) {
    console.warn('Player stats error:', e);
    return null;
  }
}
