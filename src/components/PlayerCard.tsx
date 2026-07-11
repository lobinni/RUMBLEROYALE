import type { Player } from "../engine/gameEngine";
import { RARITY_BG } from "../data/gameData";

interface PlayerCardProps {
  player: Player;
  rank?: number;
  compact?: boolean;
}

export default function PlayerCard({ player, rank, compact = false }: PlayerCardProps) {
  const hpPercent = (player.hp / player.maxHp) * 100;
  const hpColor =
    hpPercent > 60 ? "bg-green-500" : hpPercent > 30 ? "bg-yellow-500" : "bg-red-500";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          player.alive
            ? "bg-gray-800/50 border-gray-700/50"
            : "bg-gray-900/50 border-gray-800/50 opacity-40"
        }`}
      >
        <span className="text-lg">{player.avatar}</span>
        <span className={`text-sm font-medium ${player.alive ? "text-white" : "text-gray-500 line-through"}`}>
          {player.name}
        </span>
        {player.alive && (
          <span className="ml-auto text-xs text-gray-400">{player.hp} HP</span>
        )}
        {!player.alive && <span className="ml-auto text-xs text-gray-600">💀</span>}
        {player.kills > 0 && (
          <span className="text-xs text-red-400">🗡️{player.kills}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 ${
        player.alive
          ? "bg-gray-800/70 border-gray-600/50 hover:border-gray-500/70 hover:bg-gray-800/90"
          : "bg-gray-900/50 border-gray-800/50 opacity-50 grayscale"
      }`}
    >
      {/* Rank Badge */}
      {rank !== undefined && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {rank}
        </div>
      )}

      <div className="p-3">
        {/* Avatar & Name */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{player.avatar}</span>
          <div className="min-w-0 flex-1">
            <div className={`font-bold text-sm truncate ${player.alive ? "text-white" : "text-gray-500 line-through"}`}>
              {player.name}
              {player.isCustom && <span className="ml-1 text-amber-400">★</span>}
            </div>
            <div className="text-xs text-gray-400">
              {player.playerClass.emoji} {player.playerClass.nameEn || player.playerClass.name}
            </div>
          </div>
        </div>

        {/* HP Bar */}
        {player.alive && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>
                {player.hp}/{player.maxHp}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${hpColor} rounded-full transition-all duration-500`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {player.alive && (
          <div className="grid grid-cols-3 gap-1 text-xs mb-2">
            <div className="text-center bg-gray-900/50 rounded px-1 py-0.5">
              <span className="text-red-400">⚔️</span> {player.attack}
            </div>
            <div className="text-center bg-gray-900/50 rounded px-1 py-0.5">
              <span className="text-blue-400">🛡️</span> {player.defense}
            </div>
            <div className="text-center bg-gray-900/50 rounded px-1 py-0.5">
              <span className="text-green-400">💨</span> {player.speed}
            </div>
          </div>
        )}

        {/* Weapon */}
        {player.weapon && player.alive && (
          <div
            className={`text-xs px-2 py-1 rounded border ${RARITY_BG[player.weapon.rarity]}`}
          >
            {player.weapon.emoji} {player.weapon.nameEn || player.weapon.name}
            <span className="ml-1 opacity-70">(+{player.weapon.damage})</span>
          </div>
        )}

        {/* Kills & Status */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          {player.kills > 0 && (
            <span className="text-red-400 font-medium">🗡️ {player.kills} kills</span>
          )}
          {player.poisoned && player.alive && (
            <span className="text-purple-400">🧪 Poisoned</span>
          )}
          {player.shield > 0 && player.alive && (
            <span className="text-blue-400">🛡️ +{player.shield}</span>
          )}
          {!player.alive && (
            <span className="text-gray-500">💀 Eliminated</span>
          )}
        </div>
      </div>
    </div>
  );
}
