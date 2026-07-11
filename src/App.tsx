import { useState, useCallback, useEffect } from "react";
import SetupScreen from "./components/SetupScreen";
import GameCanvas from "./components/GameCanvas";
import WinnerScreen from "./components/WinnerScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import ProfileScreen from "./components/ProfileScreen";
import { getCurrentAccount, callGetUser } from "./lib/genlayer";

type Screen = 'setup' | 'game' | 'winner' | 'leaderboard' | 'profile';

interface GameResult {
  winner: any;
  players: any[];
  rounds: number;
  gameId: string | null;
}

interface UserData {
  username: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [, setUserData] = useState<UserData | null>(null);
  const [gameConfig, setGameConfig] = useState<{
    playerName: string;
    playerCount: number;
    gameId: string | null;
  } | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Check wallet connection on mount
  useEffect(() => {
    getCurrentAccount().then(async (addr) => {
      setWalletAddress(addr);
      if (addr) {
        const user = await callGetUser(addr);
        if (user && user.username) {
          setUserData(user);
        }
      }
    });

    // Listen for account changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        const addr = accounts[0] || null;
        setWalletAddress(addr);
        if (addr) {
          const user = await callGetUser(addr);
          if (user && user.username) {
            setUserData(user);
          } else {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      });
    }
  }, []);

  const handleStart = useCallback((names: string[], count: number, gameId: string | null) => {
    setGameConfig({
      playerName: names[0] || 'Player',
      playerCount: count,
      gameId,
    });
    setScreen('game');
  }, []);

  const handleGameEnd = useCallback((winner: any, players: any[], rounds: number) => {
    setGameResult({
      winner,
      players,
      rounds,
      gameId: gameConfig?.gameId || null,
    });
    setScreen('winner');
  }, [gameConfig]);

  const handleRestart = useCallback(() => {
    setGameConfig(null);
    setGameResult(null);
    setScreen('setup');
  }, []);

  // Render current screen
  if (screen === 'game' && gameConfig) {
    return (
      <GameCanvas
        playerName={gameConfig.playerName}
        playerCount={gameConfig.playerCount}
        gameId={gameConfig.gameId}
        onGameEnd={handleGameEnd}
        onBack={handleRestart}
      />
    );
  }

  if (screen === 'winner' && gameResult) {
    return (
      <WinnerScreen
        winner={gameResult.winner}
        players={gameResult.players}
        rounds={[]}
        onRestart={handleRestart}
        gameId={gameResult.gameId}
        walletAddress={walletAddress}
        totalRounds={gameResult.rounds}
      />
    );
  }

  if (screen === 'leaderboard') {
    return (
      <LeaderboardScreen
        onBack={() => setScreen('setup')}
        walletAddress={walletAddress}
      />
    );
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        onBack={() => setScreen('setup')}
        walletAddress={walletAddress}
        onWalletChange={setWalletAddress}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <SetupScreen onStart={handleStart} />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-800/50 p-4">
        <div className="max-w-2xl mx-auto flex justify-center gap-4">
          <button
            onClick={() => setScreen('leaderboard')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 hover:text-white transition-all"
          >
            <span>🏆</span>
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setScreen('profile')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 hover:text-white transition-all"
          >
            <span>👤</span>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
