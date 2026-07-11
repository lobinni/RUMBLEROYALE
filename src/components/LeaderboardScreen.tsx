import { useState, useEffect } from "react";
import { callGetLeaderboard, callGetTotalGames, getContractAddress } from "../lib/genlayer";

interface LeaderboardEntry {
  rank: number;
  player: string;
  address: string;
  wins: number;
  kills: number;
  games: number;
  best_rank: number;
}

interface LeaderboardScreenProps {
  onBack: () => void;
  walletAddress: string | null;
}

// Demo leaderboard data
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, player: "Shadow", address: "0x1234...5678", wins: 15, kills: 89, games: 20, best_rank: 1 },
  { rank: 2, player: "Phoenix", address: "0x2345...6789", wins: 12, kills: 76, games: 18, best_rank: 1 },
  { rank: 3, player: "Blaze", address: "0x3456...7890", wins: 10, kills: 65, games: 15, best_rank: 1 },
  { rank: 4, player: "Storm", address: "0x4567...8901", wins: 8, kills: 52, games: 14, best_rank: 1 },
  { rank: 5, player: "Viper", address: "0x5678...9012", wins: 7, kills: 48, games: 12, best_rank: 2 },
];

export default function LeaderboardScreen({ onBack, walletAddress }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(DEMO_LEADERBOARD);
  const [loading, setLoading] = useState(false);
  const [onChain, setOnChain] = useState(false);
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const raw = await callGetLeaderboard();
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        setEntries(parsed.map((e: Record<string, any>, i: number) => ({
          rank: i + 1,
          player: String(e.player || e.miner || 'Unknown'),
          address: String(e.address || '').slice(0, 10) + '...',
          wins: Number(e.wins || 0),
          kills: Number(e.kills || 0),
          games: Number(e.games || 0),
          best_rank: Number(e.best_rank || 999),
        })));
        setOnChain(true);
      }
      
      const tm = await callGetTotalGames();
      setTotalGames(typeof tm === 'number' ? tm : Number(tm) || null);
    } catch (e: any) {
      console.warn('Leaderboard error:', e);
      setError('Could not load on-chain data. Showing demo data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
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
            🏆 Leaderboard
          </h1>
          <div className="w-24"></div>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              onChain 
                ? 'bg-green-500/20 border border-green-500/40 text-green-300' 
                : 'bg-gray-500/20 border border-gray-500/40 text-gray-300'
            }`}>
              {onChain ? '⛓️ On-chain data' : '📋 Demo data'}
            </span>
            {totalGames !== null && (
              <span className="text-gray-400 text-sm">
                Total games: <span className="text-amber-400 font-bold">{totalGames}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="text-amber-400 text-sm animate-pulse">Loading...</span>
            )}
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-3 py-1 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-gray-300 text-sm transition-all disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Contract Info */}
        <div className="mb-6 p-3 bg-gray-800/30 rounded-xl border border-gray-700/20 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>📄 Contract:</span>
            <span className="font-mono">{getContractAddress()}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-gray-800/50 border-b border-gray-700/30 text-sm font-bold text-gray-400">
            <div>#</div>
            <div className="col-span-2">Player</div>
            <div className="text-center">Wins</div>
            <div className="text-center">Kills</div>
            <div className="text-center">Games</div>
          </div>

          {/* Entries */}
          <div className="divide-y divide-gray-700/20">
            {entries.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No entries yet. Be the first to play!
              </div>
            ) : (
              entries.map((entry, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 transition-all hover:bg-gray-800/30 ${
                    entry.address.toLowerCase().includes(walletAddress?.toLowerCase().slice(0, 8) || 'xxx')
                      ? 'bg-amber-500/10 border-l-2 border-amber-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-lg">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col">
                    <span className="font-bold text-white">{entry.player}</span>
                    <span className="text-xs text-gray-500 font-mono">{entry.address}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400 font-bold">{entry.wins}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-red-400 font-bold">{entry.kills}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-300">{entry.games}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <span>🏆 Sorted by wins, then kills</span>
          <span>•</span>
          <span>Top 50 players shown</span>
        </div>
      </div>
    </div>
  );
}
