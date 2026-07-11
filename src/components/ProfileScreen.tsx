import { useState, useEffect } from "react";
import { hasMetaMask, connectMetaMask, callGetPlayerStats, getContractAddress } from "../lib/genlayer";

interface PlayerStats {
  username: string;
  games_played: number;
  total_kills: number;
  wins: number;
  best_rank: number;
}

interface ProfileScreenProps {
  onBack: () => void;
  walletAddress: string | null;
  onWalletChange: (address: string | null) => void;
}

export default function ProfileScreen({ onBack, walletAddress, onWalletChange }: ProfileScreenProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadStats();
    }
  }, [walletAddress]);

  const loadStats = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const raw = await callGetPlayerStats(walletAddress);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setStats({
          username: parsed.username || 'Unknown',
          games_played: Number(parsed.games_played || 0),
          total_kills: Number(parsed.total_kills || 0),
          wins: Number(parsed.wins || 0),
          best_rank: Number(parsed.best_rank || 999),
        });
      }
    } catch (e: any) {
      console.warn('Stats error:', e);
      setError('Could not load on-chain stats');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectMetaMask();
      onWalletChange(addr);
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const getRank = (gamesPlayed: number, wins: number) => {
    if (wins >= 50) return { title: '👑 Legend', color: 'text-amber-400' };
    if (wins >= 30) return { title: '💎 Diamond', color: 'text-cyan-400' };
    if (wins >= 15) return { title: '🥇 Gold', color: 'text-yellow-400' };
    if (wins >= 8) return { title: '🥈 Silver', color: 'text-gray-300' };
    if (wins >= 3) return { title: '🥉 Bronze', color: 'text-orange-400' };
    if (gamesPlayed >= 1) return { title: '🆕 Rookie', color: 'text-green-400' };
    return { title: '❓ Unranked', color: 'text-gray-500' };
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-6">🦊</div>
          <h1 className="text-3xl font-bold text-white mb-2">Battle Profile</h1>
          <p className="text-gray-400 mb-8">Connect MetaMask to view your on-chain stats</p>
          
          {!hasMetaMask() ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
              ⚠️ MetaMask not detected. Please install MetaMask extension.
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-lg rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              {connecting ? '⏳ Connecting...' : '🦊 Connect MetaMask'}
            </button>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}
          
          <button
            onClick={onBack}
            className="mt-6 px-6 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 transition-all"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const rank = stats ? getRank(stats.games_played, stats.wins) : getRank(0, 0);
  const winRate = stats && stats.games_played > 0 
    ? ((stats.wins / stats.games_played) * 100).toFixed(1) 
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 hover:text-white transition-all"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
            👤 Profile
          </h1>
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 text-sm transition-all disabled:opacity-50"
          >
            🔄
          </button>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-red-500 rounded-2xl flex items-center justify-center text-3xl">
              ⚔️
            </div>
            <div className="flex-1">
              <div className="font-mono text-white text-lg">
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
              </div>
              <div className={`text-lg font-bold ${rank.color}`}>
                {rank.title}
              </div>
            </div>
            {stats && (
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-400">{stats.wins}</div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 text-amber-400 animate-pulse">
            Loading stats from GenLayer...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 text-center">
              <div className="text-3xl mb-1">⚔️</div>
              <div className="text-2xl font-bold text-white">{stats.games_played}</div>
              <div className="text-sm text-gray-400">Games Played</div>
            </div>
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 text-center">
              <div className="text-3xl mb-1">🏆</div>
              <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
              <div className="text-sm text-gray-400">Victories</div>
            </div>
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 text-center">
              <div className="text-3xl mb-1">🗡️</div>
              <div className="text-2xl font-bold text-red-400">{stats.total_kills}</div>
              <div className="text-sm text-gray-400">Total Kills</div>
            </div>
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 text-center">
              <div className="text-3xl mb-1">📊</div>
              <div className="text-2xl font-bold text-blue-400">{winRate}%</div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {stats && (
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">📈 Battle Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700/30">
                <span className="text-gray-400">Best Rank</span>
                <span className="text-amber-400 font-bold">
                  {stats.best_rank === 999 ? 'N/A' : `#${stats.best_rank}`}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700/30">
                <span className="text-gray-400">Avg Kills/Game</span>
                <span className="text-red-400 font-bold">
                  {stats.games_played > 0 
                    ? (stats.total_kills / stats.games_played).toFixed(1)
                    : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Username</span>
                <span className="text-white font-bold">{stats.username}</span>
              </div>
            </div>
          </div>
        )}

        {/* No Stats */}
        {!loading && !stats && (
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-12 text-center">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-white mb-2">No Games Yet</h3>
            <p className="text-gray-400">
              Play your first battle to start tracking stats!
            </p>
          </div>
        )}

        {/* Contract Info */}
        <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/20 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>📄 Contract:</span>
            <span className="font-mono">{getContractAddress()}</span>
          </div>
        </div>

        {/* Rank Tiers */}
        <div className="mt-6 bg-gray-800/20 rounded-2xl border border-gray-700/20 p-4">
          <h4 className="text-sm font-bold text-gray-400 mb-3">🏅 Rank Tiers</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="text-amber-400">👑 Legend: 50+ wins</div>
            <div className="text-cyan-400">💎 Diamond: 30+ wins</div>
            <div className="text-yellow-400">🥇 Gold: 15+ wins</div>
            <div className="text-gray-300">🥈 Silver: 8+ wins</div>
            <div className="text-orange-400">🥉 Bronze: 3+ wins</div>
            <div className="text-green-400">🆕 Rookie: 1+ games</div>
          </div>
        </div>
      </div>
    </div>
  );
}
