import { useState, useEffect } from "react";
import { callSubmitResult, getContractAddress } from "../lib/genlayer";

interface Player {
  id: number;
  name: string;
  emoji?: string;
  avatar?: string;
  kills: number;
  alive: boolean;
  isPlayer?: boolean;
  isCustom?: boolean;
  hp?: number;
  weapon?: { emoji: string; name: string } | null;
  playerClass?: { emoji: string; nameEn: string };
  className?: string;
  classEmoji?: string;
}

interface WinnerScreenProps {
  winner: Player | null;
  players: Player[];
  rounds: any[];
  onRestart: () => void;
  gameId: string | null;
  walletAddress: string | null;
  totalRounds?: number;
}

type ChainTx = 'idle' | 'pending' | 'ok' | 'fail';

export default function WinnerScreen({ 
  winner, 
  players, 
  rounds, 
  onRestart, 
  gameId, 
  walletAddress,
  totalRounds 
}: WinnerScreenProps) {
  const totalKills = players.reduce((sum, p) => sum + p.kills, 0);
  const topKillers = [...players].sort((a, b) => b.kills - a.kills).slice(0, 5);
  const totalEvents = rounds?.length || 0;
  const roundCount = totalRounds || rounds?.length || 0;

  const [submitTx, setSubmitTx] = useState<ChainTx>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Find user's player
  const userPlayer = players.find(p => p.isPlayer || p.isCustom);
  const userRank = userPlayer 
    ? players.filter(p => p.alive || p.kills > userPlayer.kills).length 
    : players.length;

  // Auto-submit result if on-chain game
  useEffect(() => {
    if (gameId && walletAddress && userPlayer && submitTx === 'idle') {
      handleSubmitResult();
    }
  }, [gameId, walletAddress, userPlayer]);

  const handleSubmitResult = async () => {
    if (!gameId || !walletAddress || !userPlayer) return;

    setSubmitTx('pending');
    setError(null);

    try {
      const result = await callSubmitResult(
        walletAddress,
        gameId,
        userRank,
        userPlayer.kills,
        userPlayer.alive,
        roundCount
      );
      setTxHash(result.hash);
      setSubmitTx('ok');
    } catch (e: any) {
      console.error('Submit result error:', e);
      setSubmitTx('fail');
      setError(e.message || 'Failed to submit result');
    }
  };

  const getPlayerEmoji = (player: Player) => player.emoji || player.avatar || "🎭";
  const getPlayerClass = (player: Player) => {
    if (player.className) return `${player.classEmoji || ''} ${player.className}`;
    if (player.playerClass) return `${player.playerClass.emoji} ${player.playerClass.nameEn}`;
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="relative">
          {/* Winner Announcement */}
          <div className="mb-8">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-2 animate-pulse">
              VICTORY!
            </h1>
            {winner ? (
              <div className="mt-6 inline-flex flex-col items-center">
                <div className="text-8xl mb-4">{getPlayerEmoji(winner)}</div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  {winner.name}
                  {(winner.isPlayer || winner.isCustom) && <span className="ml-2 text-amber-400">★</span>}
                </h2>
                <div className="text-gray-400 mb-4">
                  {getPlayerClass(winner)}
                </div>

                {/* Winner Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 px-4 py-3">
                    <div className="text-2xl font-bold text-red-400">{winner.kills}</div>
                    <div className="text-xs text-gray-400">Kills</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 px-4 py-3">
                    <div className="text-2xl font-bold text-green-400">{winner.hp || '∞'}</div>
                    <div className="text-xs text-gray-400">HP Left</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 px-4 py-3">
                    <div className="text-2xl font-bold text-amber-400">
                      {winner.weapon ? winner.weapon.emoji : "🤜"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {winner.weapon ? winner.weapon.name : "Fists"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="text-6xl mb-4">💀</div>
                <h2 className="text-3xl font-bold text-gray-400">No survivors!</h2>
              </div>
            )}
          </div>

          {/* On-Chain Status */}
          {gameId && (
            <div className="bg-purple-500/10 rounded-2xl border border-purple-500/30 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-center gap-2">
                <span>⛓️</span> On-Chain Record
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Game ID:</span>
                  <span className="text-purple-300 font-mono">{gameId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Contract:</span>
                  <span className="text-purple-300 font-mono text-xs">
                    {getContractAddress().slice(0, 10)}...{getContractAddress().slice(-8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">submit_result():</span>
                  <span>
                    {submitTx === 'ok' && <span className="text-green-400">✅ Recorded</span>}
                    {submitTx === 'pending' && <span className="text-amber-400">⏳ Submitting...</span>}
                    {submitTx === 'fail' && <span className="text-red-400">❌ Failed</span>}
                    {submitTx === 'idle' && <span className="text-gray-500">—</span>}
                  </span>
                </div>
                {txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">TX:</span>
                    <span className="text-green-300 font-mono text-xs">{txHash.slice(0, 16)}...</span>
                  </div>
                )}
                {error && (
                  <div className="text-red-400 text-xs mt-2">
                    ⚠️ {error}
                  </div>
                )}
                {submitTx === 'fail' && walletAddress && (
                  <button
                    onClick={handleSubmitResult}
                    className="mt-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-lg text-sm transition-all"
                  >
                    🔄 Retry Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Game Stats */}
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-center gap-2">
              <span>📊</span> Battle Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{players.length}</div>
                <div className="text-xs text-gray-400">Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{roundCount}</div>
                <div className="text-xs text-gray-400">Rounds</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{totalKills}</div>
                <div className="text-xs text-gray-400">Total Kills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{totalEvents || '-'}</div>
                <div className="text-xs text-gray-400">Events</div>
              </div>
            </div>
          </div>

          {/* Top Killers */}
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-center gap-2">
              <span>🗡️</span> Kill Leaderboard
            </h3>
            <div className="space-y-2">
              {topKillers.map((player, i) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
                    player.id === winner?.id
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-gray-800/30 border border-gray-700/20"
                  }`}
                >
                  <span className="text-lg w-8 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="text-xl">{getPlayerEmoji(player)}</span>
                  <span className={`flex-1 text-left font-medium ${player.alive ? "text-white" : "text-gray-400"}`}>
                    {player.name}
                    {(player.isPlayer || player.isCustom) && <span className="ml-1 text-amber-400 text-sm">★</span>}
                  </span>
                  <span className="text-sm text-gray-400">
                    {getPlayerClass(player)}
                  </span>
                  <span className="text-red-400 font-bold text-lg">{player.kills}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onRestart}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white font-bold text-lg rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/25"
            >
              ⚔️ Play Again
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-float text-2xl opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            >
              {["⚔️", "🛡️", "🏹", "💀", "🔥", "⭐", "🗡️", "🏆"][i % 8]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
