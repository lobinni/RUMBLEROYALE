import { useState, useEffect } from "react";
import { 
  hasMetaMask, 
  connectMetaMask, 
  getCurrentAccount, 
  callStartGame, 
  callRegisterUser,
  callGetUser,
  callIsUsernameTaken,
  getContractAddress 
} from "../lib/genlayer";

interface SetupScreenProps {
  onStart: (names: string[], count: number, gameId: string | null) => void;
}

type ChainTx = 'idle' | 'pending' | 'ok' | 'fail';

interface UserData {
  username: string;
  registered_at?: number;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState(24);
  const [account, setAccount] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [registerTx, setRegisterTx] = useState<ChainTx>('idle');
  const [startTx, setStartTx] = useState<ChainTx>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Check for existing connection and user on mount
  useEffect(() => {
    getCurrentAccount().then(async (addr) => {
      setAccount(addr);
      if (addr) {
        await loadUserData(addr);
      }
    });

    // Listen for account changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        const addr = accounts[0] || null;
        setAccount(addr);
        setUserData(null);
        setError(null);
        if (addr) {
          await loadUserData(addr);
        }
      });
    }
  }, []);

  // Check username availability when typing
  useEffect(() => {
    if (newUsername.trim().length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const taken = await callIsUsernameTaken(newUsername.trim());
        setUsernameAvailable(!taken);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername]);

  const loadUserData = async (address: string) => {
    setLoadingUser(true);
    try {
      const user = await callGetUser(address);
      if (user && user.username) {
        setUserData(user);
      } else {
        setUserData(null);
      }
    } catch (e) {
      console.error('Load user error:', e);
      setUserData(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectMetaMask();
      setAccount(addr);
      await loadUserData(addr);
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleRegister = async () => {
    if (!account) {
      setError('Please connect MetaMask first');
      return;
    }

    const username = newUsername.trim();
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (usernameAvailable === false) {
      setError('Username is already taken');
      return;
    }

    setRegisterTx('pending');
    setError(null);

    try {
      const result = await callRegisterUser(account, username);
      setTxHash(result.hash);
      setRegisterTx('ok');
      setUserData({ username });
      setNewUsername("");
    } catch (e: any) {
      console.error('Register error:', e);
      setRegisterTx('fail');
      setError(e.message || 'Failed to register username');
    }
  };

  const handleStartGame = async () => {
    if (!account || !userData) {
      setError('Please connect wallet and register first');
      return;
    }

    setStartTx('pending');
    setError(null);

    try {
      const seed = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const result = await callStartGame(account, playerCount, seed);
      setTxHash(result.hash);
      setStartTx('ok');

      // Start the game with registered username
      onStart([userData.username], playerCount, result.gameId);
    } catch (e: any) {
      console.error('Start game error:', e);
      setStartTx('fail');
      setError(e.message || 'Failed to start game on-chain');
    }
  };

  // Offline mode - play without wallet
  const handlePlayOffline = () => {
    onStart([], playerCount, null);
  };

  const isRegistered = userData !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">⚔️</div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-red-500 to-purple-600 mb-2">
            RUMBLE ROYALE
          </h1>
          <p className="text-gray-400 text-lg">Battle Royale - Last One Standing Wins</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              On-chain • GenLayer
            </span>
          </div>
        </div>

        {/* Wallet Connection Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🦊</span> {isRegistered ? 'Your Account' : 'Connect & Register'}
          </h2>

          {/* Connection Status */}
          <div className={`flex items-center justify-between mb-4 p-4 rounded-xl border transition-all ${
            account
              ? isRegistered 
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
              : 'bg-gray-900/50 border-gray-700/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                account 
                  ? isRegistered ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}></div>
              {account ? (
                <div>
                  <div className="text-gray-400 text-xs font-mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                  {loadingUser ? (
                    <div className="text-amber-400 text-sm">Loading...</div>
                  ) : isRegistered ? (
                    <div className="text-white font-bold text-xl">
                      {userData.username}
                      <span className="ml-2 text-green-400 text-sm">✓ Registered</span>
                    </div>
                  ) : (
                    <div className="text-amber-400 text-sm">Not registered yet</div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Not connected</span>
              )}
            </div>
            {!account ? (
              <button
                onClick={handleConnect}
                disabled={connecting || !hasMetaMask()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg transition-all text-sm"
              >
                {connecting ? '⏳ Connecting...' : '🦊 Connect MetaMask'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 text-gray-400 rounded-lg transition-all text-xs"
              >
                Switch
              </button>
            )}
          </div>

          {!hasMetaMask() && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
              ⚠️ MetaMask not detected. Please install MetaMask extension to play on-chain.
            </div>
          )}

          {/* Registration Form (only show if not registered) */}
          {account && !isRegistered && !loadingUser && (
            <div className="mb-4 p-4 bg-gray-900/50 rounded-xl border border-amber-500/30">
              <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                <span>✏️</span> Create Your Battle Name
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                Choose a unique username. This will be your permanent battle name linked to this wallet.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter username (min 3 chars)..."
                    maxLength={20}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                  {newUsername.length >= 3 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <span className="text-gray-400 text-sm">...</span>
                      ) : usernameAvailable === true ? (
                        <span className="text-green-400">✓</span>
                      ) : usernameAvailable === false ? (
                        <span className="text-red-400">✗</span>
                      ) : null}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRegister}
                  disabled={
                    registerTx === 'pending' || 
                    newUsername.trim().length < 3 || 
                    usernameAvailable === false ||
                    checkingUsername
                  }
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-xl transition-all"
                >
                  {registerTx === 'pending' ? '⏳' : 'Register'}
                </button>
              </div>
              {newUsername.length >= 3 && usernameAvailable === false && (
                <p className="text-red-400 text-xs mt-2">This username is already taken</p>
              )}
              {newUsername.length >= 3 && usernameAvailable === true && (
                <p className="text-green-400 text-xs mt-2">Username is available!</p>
              )}
            </div>
          )}

          {/* Player Count (only show if registered) */}
          {isRegistered && (
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-medium">
                Number of Players: <span className="text-amber-400 font-bold text-xl">{playerCount}</span>
              </label>
              <input
                type="range"
                min={4}
                max={40}
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4</span>
                <span>40</span>
              </div>
            </div>
          )}

          {/* Contract Info */}
          <div className="p-3 bg-gray-900/30 rounded-xl border border-gray-700/20 text-xs text-gray-500 mb-4">
            <div className="flex items-center justify-between">
              <span>📄 Contract:</span>
              <span className="font-mono">{getContractAddress().slice(0, 10)}...{getContractAddress().slice(-8)}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          {/* TX Hash */}
          {txHash && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm mb-4 font-mono">
              ✅ TX: {txHash.slice(0, 20)}...
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span>📜</span> How to Play
          </h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">1.</span>
              Connect MetaMask and create a unique username (one-time registration).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">2.</span>
              Each player is randomly assigned a class with unique stats.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">3.</span>
              Each round, random events occur: attacks, weapon finds, traps, alliances...
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">4.</span>
              Storm appears from round 4, dealing damage to random players.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">5.</span>
              The last player standing wins! Your result is recorded on-chain. 🏆
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* On-chain Play Button */}
          <button
            onClick={handleStartGame}
            disabled={!account || !isRegistered || startTx === 'pending'}
            className="w-full py-4 px-8 bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white font-bold text-xl rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {startTx === 'pending' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Starting on GenLayer...
              </span>
            ) : !account ? (
              '🔒 Connect Wallet to Play'
            ) : !isRegistered ? (
              '📝 Register Username First'
            ) : (
              <span>⚔️ START BATTLE as <span className="font-bold">{userData?.username}</span> ⚔️</span>
            )}
          </button>

          {/* Offline Play Button */}
          <button
            onClick={handlePlayOffline}
            className="w-full py-3 px-8 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-medium text-lg rounded-2xl transition-all border border-gray-600/50"
          >
            🎮 Play Offline (No Wallet)
          </button>
        </div>
      </div>
    </div>
  );
}
