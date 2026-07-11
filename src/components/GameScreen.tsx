import { useState, useEffect, useCallback, useRef } from "react";
import type { GameState, Round } from "../engine/gameEngine";
import { processRound, checkGameEnd, getWinner, getLeaderboard } from "../engine/gameEngine";
import PlayerCard from "./PlayerCard";
import EventLog from "./EventLog";
import WinnerScreen from "./WinnerScreen";

interface GameScreenProps {
  initialState: GameState;
  onRestart: () => void;
  walletAddress: string | null;
}

export default function GameScreen({ initialState, onRestart, walletAddress }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(2000);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showEliminated, setShowEliminated] = useState(false);
  const autoPlayRef = useRef(autoPlay);
  const speedRef = useRef(speed);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const advanceRound = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase === "finished") return prev;

      const alivePlayers = prev.players.filter((p) => p.alive);
      if (alivePlayers.length <= 1) {
        const winner = getWinner(prev);
        return { ...prev, phase: "finished", winner };
      }

      const round = processRound(prev);
      const newPlayers = [...prev.players];
      const newRounds = [...prev.rounds, round];
      const newCurrentRound = prev.currentRound + 1;

      // Track eliminations
      const newlyDead = round.events.flatMap((e) => e.killed);
      const eliminationOrder = [...prev.eliminationOrder];
      newlyDead.forEach((id) => {
        const p = newPlayers.find((pl) => pl.id === id);
        if (p && !eliminationOrder.find((ep) => ep.id === id)) {
          eliminationOrder.push(p);
        }
      });

      const newState = {
        ...prev,
        players: newPlayers,
        rounds: newRounds,
        currentRound: newCurrentRound,
        phase: "round_result" as const,
        eliminationOrder,
      };

      if (checkGameEnd(newState)) {
        const winner = getWinner(newState);
        return { ...newState, phase: "finished" as const, winner };
      }

      setCurrentRound(round);
      return newState;
    });
  }, []);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || gameState.phase === "finished") return;

    const timer = setTimeout(() => {
      if (autoPlayRef.current) {
        advanceRound();
      }
    }, speedRef.current);

    return () => clearTimeout(timer);
  }, [autoPlay, gameState.currentRound, gameState.phase, advanceRound]);

  const alivePlayers = gameState.players.filter((p) => p.alive);
  const deadPlayers = gameState.players.filter((p) => !p.alive);
  const leaderboard = getLeaderboard(gameState.players);

  if (gameState.phase === "finished") {
    return (
      <WinnerScreen
        winner={gameState.winner}
        players={gameState.players}
        rounds={gameState.rounds}
        onRestart={onRestart}
        gameId={gameState.gameId}
        walletAddress={walletAddress}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Game Info */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
                ⚔️ RUMBLE ROYALE
              </h1>
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
                  Round <span className="text-amber-400 font-bold">{gameState.currentRound}</span>
                </span>
                <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
                  Alive: <span className="text-green-400 font-bold">{alivePlayers.length}</span>
                  <span className="text-gray-500">/{gameState.totalPlayers}</span>
                </span>
                <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
                  💀 <span className="text-red-400 font-bold">{deadPlayers.length}</span>
                </span>
                {gameState.gameId && (
                  <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-xs">
                    ⛓️ {gameState.gameId}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={advanceRound}
                disabled={autoPlay}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg transition-all text-sm"
              >
                ⏭️ Next Round
              </button>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                  autoPlay
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-black"
                }`}
              >
                {autoPlay ? "⏸️ Pause" : "▶️ Auto"}
              </button>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none"
              >
                <option value={3000}>🐌 Slow</option>
                <option value={2000}>🚶 Normal</option>
                <option value={1000}>🏃 Fast</option>
                <option value={500}>⚡ Very Fast</option>
              </select>
              <button
                onClick={onRestart}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all text-sm"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="flex sm:hidden items-center gap-3 text-sm mt-2 flex-wrap">
            <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
              Round <span className="text-amber-400 font-bold">{gameState.currentRound}</span>
            </span>
            <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
              Alive: <span className="text-green-400 font-bold">{alivePlayers.length}</span>/{gameState.totalPlayers}
            </span>
            <span className="px-2 py-1 bg-gray-800 rounded-lg text-gray-300">
              💀 <span className="text-red-400 font-bold">{deadPlayers.length}</span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-500"
              style={{
                width: `${((gameState.totalPlayers - alivePlayers.length) / (gameState.totalPlayers - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Log - Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Round Events */}
            {currentRound && (
              <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700/30 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>📋</span> Round {currentRound.number}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">📍 {currentRound.location}</span>
                      {currentRound.stormActive && (
                        <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-xs">
                          🌪️ Storm
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span>
                      Remaining: <span className="text-green-400">{currentRound.aliveAfter}</span>/{currentRound.aliveBefore}
                    </span>
                    <span>
                      Eliminated: <span className="text-red-400">{currentRound.aliveBefore - currentRound.aliveAfter}</span>
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <EventLog events={currentRound.events} animated />
                </div>
              </div>
            )}

            {/* No events yet */}
            {!currentRound && (
              <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-12 text-center">
                <div className="text-5xl mb-4">⚔️</div>
                <h2 className="text-xl font-bold text-white mb-2">Ready for Battle!</h2>
                <p className="text-gray-400">
                  Click <span className="text-amber-400 font-bold">"Next Round"</span> or{" "}
                  <span className="text-green-400 font-bold">"Auto"</span> to begin!
                </p>
              </div>
            )}

            {/* Previous Rounds */}
            {gameState.rounds.length > 1 && (
              <details className="bg-gray-800/20 rounded-2xl border border-gray-700/20">
                <summary className="px-6 py-4 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors font-medium">
                  📜 History ({gameState.rounds.length - 1} previous rounds)
                </summary>
                <div className="px-4 pb-4 space-y-3">
                  {gameState.rounds
                    .slice(0, -1)
                    .reverse()
                    .map((round) => (
                      <details key={round.number} className="bg-gray-800/30 rounded-xl border border-gray-700/20">
                        <summary className="px-4 py-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                          Round {round.number} • 📍 {round.location}
                          {round.stormActive && " 🌪️"}
                          {" • "}
                          <span className="text-red-400">
                            -{round.aliveBefore - round.aliveAfter}
                          </span>
                        </summary>
                        <div className="px-4 pb-3">
                          <EventLog events={round.events} />
                        </div>
                      </details>
                    ))}
                </div>
              </details>
            )}
          </div>

          {/* Sidebar - Players */}
          <div className="space-y-4">
            {/* Toggle Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPlayers(true); setShowEliminated(false); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  showPlayers && !showEliminated
                    ? "bg-green-500/20 border border-green-500/40 text-green-300"
                    : "bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-300"
                }`}
              >
                Alive ({alivePlayers.length})
              </button>
              <button
                onClick={() => { setShowPlayers(false); setShowEliminated(true); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  showEliminated
                    ? "bg-red-500/20 border border-red-500/40 text-red-300"
                    : "bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-300"
                }`}
              >
                Eliminated ({deadPlayers.length})
              </button>
            </div>

            {/* Alive Players */}
            {showPlayers && !showEliminated && (
              <div className="space-y-2">
                {alivePlayers
                  .sort((a, b) => b.kills - a.kills || b.hp - a.hp)
                  .map((player, i) => (
                    <PlayerCard key={player.id} player={player} rank={i + 1} />
                  ))}
              </div>
            )}

            {/* Eliminated Players */}
            {showEliminated && (
              <div className="space-y-2">
                {deadPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No one eliminated yet
                  </div>
                ) : (
                  deadPlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} compact />
                  ))
                )}
              </div>
            )}

            {/* Kill Leaderboard */}
            {gameState.currentRound > 0 && (
              <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span>🏆</span> Top Kills
                </h3>
                <div className="space-y-1">
                  {leaderboard
                    .filter((p) => p.kills > 0)
                    .slice(0, 5)
                    .map((player, i) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        <span className="w-5 text-center font-bold text-amber-400">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <span>{player.avatar}</span>
                        <span className={`flex-1 truncate ${player.alive ? "text-white" : "text-gray-500"}`}>
                          {player.name}
                        </span>
                        <span className="text-red-400 font-bold">{player.kills}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
