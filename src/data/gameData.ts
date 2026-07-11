// ===== PLAYER NAMES =====
export const DEFAULT_NAMES = [
  "Shadow", "Phoenix", "Blaze", "Storm", "Frost",
  "Viper", "Thunder", "Raven", "Wolf", "Dragon",
  "Titan", "Hawk", "Ghost", "Reaper", "Nova",
  "Fury", "Ember", "Blade", "Apex", "Chaos",
  "Onyx", "Zephyr", "Crimson", "Eclipse", "Phantom",
  "Spark", "Obsidian", "Valor", "Nyx", "Aether",
  "Pyro", "Glacier", "Tempest", "Wraith", "Inferno",
  "Bolt", "Dusk", "Fang", "Jinx", "Karma",
];

// ===== AVATARS (Emoji) =====
export const AVATARS = [
  "🦁", "🐺", "🦅", "🐉", "🦊", "🐻", "🦇", "🐍",
  "🦈", "🦂", "🐲", "🦄", "🐯", "🦉", "🐗", "🦎",
  "🐙", "🦏", "🐊", "🦃", "🐸", "🦋", "🐝", "🦀",
  "🐧", "🐨", "🦩", "🐬", "🐳", "🦚", "🐒", "🦘",
  "🐞", "🦜", "🐢", "🦔", "🐠", "🦙", "🐿️", "🦝",
];

// ===== WEAPON CLASSES =====
export interface Weapon {
  name: string;
  nameEn: string;
  emoji: string;
  damage: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export const WEAPONS: Weapon[] = [
  // Common
  { name: "Gậy Gỗ", nameEn: "Wooden Stick", emoji: "🪵", damage: 10, rarity: "common" },
  { name: "Dao Nhỏ", nameEn: "Small Knife", emoji: "🔪", damage: 12, rarity: "common" },
  { name: "Đá Cuội", nameEn: "Stone Rock", emoji: "🪨", damage: 8, rarity: "common" },
  { name: "Nắm Đấm", nameEn: "Fist", emoji: "👊", damage: 6, rarity: "common" },
  { name: "Chảo Rán", nameEn: "Frying Pan", emoji: "🍳", damage: 11, rarity: "common" },

  // Uncommon
  { name: "Kiếm Sắt", nameEn: "Iron Sword", emoji: "⚔️", damage: 18, rarity: "uncommon" },
  { name: "Cung Tên", nameEn: "Bow & Arrow", emoji: "🏹", damage: 16, rarity: "uncommon" },
  { name: "Búa Chiến", nameEn: "War Hammer", emoji: "🔨", damage: 20, rarity: "uncommon" },
  { name: "Giáo Dài", nameEn: "Long Spear", emoji: "🔱", damage: 17, rarity: "uncommon" },
  { name: "Ná Thun", nameEn: "Slingshot", emoji: "🎯", damage: 14, rarity: "uncommon" },

  // Rare
  { name: "Kiếm Lửa", nameEn: "Fire Sword", emoji: "🗡️", damage: 28, rarity: "rare" },
  { name: "Rìu Băng", nameEn: "Ice Axe", emoji: "🪓", damage: 26, rarity: "rare" },
  { name: "Cây Đinh Ba", nameEn: "Trident", emoji: "🔱", damage: 30, rarity: "rare" },
  { name: "Bom Nổ", nameEn: "Bomb", emoji: "💣", damage: 32, rarity: "rare" },
  { name: "Súng Hỏa Mai", nameEn: "Musket", emoji: "🔫", damage: 27, rarity: "rare" },

  // Epic
  { name: "Kiếm Sấm Sét", nameEn: "Thunder Blade", emoji: "⚡", damage: 40, rarity: "epic" },
  { name: "Lưỡi Hái Tử Thần", nameEn: "Death Scythe", emoji: "💀", damage: 45, rarity: "epic" },
  { name: "Cung Thần", nameEn: "Divine Bow", emoji: "✨", damage: 38, rarity: "epic" },
  { name: "Pháo Đài Di Động", nameEn: "Mobile Fortress", emoji: "🏰", damage: 42, rarity: "epic" },

  // Legendary
  { name: "Excalibur", nameEn: "Excalibur", emoji: "👑", damage: 55, rarity: "legendary" },
  { name: "Mjolnir", nameEn: "Mjolnir", emoji: "🔨", damage: 60, rarity: "legendary" },
  { name: "Infinity Gauntlet", nameEn: "Infinity Gauntlet", emoji: "🧤", damage: 65, rarity: "legendary" },
];

// ===== PLAYER CLASSES =====
export interface PlayerClass {
  name: string;
  nameEn: string;
  emoji: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: string;
  specialEn: string;
}

export const PLAYER_CLASSES: PlayerClass[] = [
  { name: "Chiến Binh", nameEn: "Warrior", emoji: "⚔️", hp: 120, attack: 14, defense: 12, speed: 8, special: "Cuồng Nộ", specialEn: "Rage" },
  { name: "Cung Thủ", nameEn: "Archer", emoji: "🏹", hp: 90, attack: 16, defense: 6, speed: 14, special: "Mưa Tên", specialEn: "Arrow Rain" },
  { name: "Pháp Sư", nameEn: "Mage", emoji: "🧙", hp: 80, attack: 18, defense: 5, speed: 10, special: "Cầu Lửa", specialEn: "Fireball" },
  { name: "Sát Thủ", nameEn: "Assassin", emoji: "🗡️", hp: 85, attack: 20, defense: 4, speed: 16, special: "Ám Sát", specialEn: "Assassinate" },
  { name: "Hiệp Sĩ", nameEn: "Knight", emoji: "🛡️", hp: 140, attack: 10, defense: 16, speed: 6, special: "Bất Khuất", specialEn: "Unbreakable" },
  { name: "Tu Sĩ", nameEn: "Monk", emoji: "🙏", hp: 100, attack: 8, defense: 8, speed: 10, special: "Hồi Máu", specialEn: "Heal" },
  { name: "Thợ Săn", nameEn: "Hunter", emoji: "🐺", hp: 95, attack: 15, defense: 7, speed: 13, special: "Bẫy Thú", specialEn: "Beast Trap" },
  { name: "Ninja", nameEn: "Ninja", emoji: "🥷", hp: 75, attack: 17, defense: 3, speed: 18, special: "Phân Thân", specialEn: "Shadow Clone" },
  { name: "Berserker", nameEn: "Berserker", emoji: "🪓", hp: 110, attack: 22, defense: 2, speed: 12, special: "Điên Cuồng", specialEn: "Frenzy" },
  { name: "Paladin", nameEn: "Paladin", emoji: "✝️", hp: 130, attack: 12, defense: 14, speed: 7, special: "Thánh Giá", specialEn: "Holy Cross" },
];

// ===== EVENTS =====
export type EventType =
  | "attack"
  | "find_weapon"
  | "trap"
  | "heal"
  | "alliance"
  | "betray"
  | "storm"
  | "special"
  | "duel"
  | "steal"
  | "hide"
  | "craft"
  | "monster"
  | "airdrop"
  | "poison";

export interface GameEvent {
  type: EventType;
  weight: number; // probability weight
  minPlayers: number; // minimum players needed
}

export const GAME_EVENTS: GameEvent[] = [
  { type: "attack", weight: 25, minPlayers: 2 },
  { type: "find_weapon", weight: 15, minPlayers: 1 },
  { type: "trap", weight: 8, minPlayers: 2 },
  { type: "heal", weight: 10, minPlayers: 1 },
  { type: "alliance", weight: 6, minPlayers: 3 },
  { type: "betray", weight: 5, minPlayers: 2 },
  { type: "storm", weight: 8, minPlayers: 2 },
  { type: "special", weight: 7, minPlayers: 1 },
  { type: "duel", weight: 10, minPlayers: 2 },
  { type: "steal", weight: 6, minPlayers: 2 },
  { type: "hide", weight: 8, minPlayers: 1 },
  { type: "craft", weight: 5, minPlayers: 1 },
  { type: "monster", weight: 6, minPlayers: 1 },
  { type: "airdrop", weight: 4, minPlayers: 1 },
  { type: "poison", weight: 5, minPlayers: 2 },
];

// ===== LOCATIONS =====
export const LOCATIONS = [
  "Dark Forest", "Volcano Peak", "Abandoned Beach", "Ruined City",
  "Mysterious Cave", "Poison Swamp", "Grass Field", "Ancient Castle",
  "Hot Desert", "Deep Lake", "Hanging Bridge", "Abandoned Mine",
  "Ancient Temple", "Bamboo Grove", "Misty Valley", "Old Harbor",
];

// ===== RARITY COLORS =====
export const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export const RARITY_BG: Record<string, string> = {
  common: "bg-gray-500/20 border-gray-500/40 text-gray-300",
  uncommon: "bg-green-500/20 border-green-500/40 text-green-300",
  rare: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  epic: "bg-purple-500/20 border-purple-500/40 text-purple-300",
  legendary: "bg-amber-500/20 border-amber-500/40 text-amber-300",
};
