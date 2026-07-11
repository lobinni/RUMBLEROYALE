import {
  WEAPONS,
  PLAYER_CLASSES,
  GAME_EVENTS,
  LOCATIONS,
  AVATARS,
  DEFAULT_NAMES,
  type Weapon,
  type PlayerClass,
  type EventType,
} from "../data/gameData";

// ===== TYPES =====
export interface Player {
  id: number;
  name: string;
  avatar: string;
  playerClass: PlayerClass;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  weapon: Weapon | null;
  alive: boolean;
  kills: number;
  specialUsed: boolean;
  shield: number;
  poisoned: boolean;
  alliance: number | null; // alliance group id
  isCustom: boolean;
}

export interface RoundEvent {
  id: number;
  type: EventType;
  description: string;
  players: number[]; // player ids involved
  killed: number[]; // player ids killed
  icon: string;
  highlight: "kill" | "buff" | "neutral" | "danger" | "special";
}

export interface Round {
  number: number;
  events: RoundEvent[];
  aliveBefore: number;
  aliveAfter: number;
  location: string;
  stormActive: boolean;
}

export interface GameState {
  players: Player[];
  rounds: Round[];
  currentRound: number;
  phase: "setup" | "running" | "round_result" | "finished";
  winner: Player | null;
  gameSpeed: number;
  totalPlayers: number;
  eliminationOrder: Player[];
  gameId: string | null;
}

// ===== HELPERS =====
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function getRandomWeapon(): Weapon {
  const roll = Math.random();
  let rarity: string;
  if (roll < 0.35) rarity = "common";
  else if (roll < 0.6) rarity = "uncommon";
  else if (roll < 0.8) rarity = "rare";
  else if (roll < 0.95) rarity = "epic";
  else rarity = "legendary";

  const weapons = WEAPONS.filter((w) => w.rarity === rarity);
  return pick(weapons);
}

// ===== GAME ENGINE =====
export function createGame(customNames: string[] = [], playerCount: number = 24, gameId: string | null = null): GameState {
  const totalPlayers = Math.min(Math.max(playerCount, 4), 40);
  const usedNames = new Set<string>();
  const usedAvatars = new Set<string>();
  const players: Player[] = [];

  const shuffledAvatars = shuffle(AVATARS);
  const shuffledNames = shuffle(DEFAULT_NAMES);

  for (let i = 0; i < totalPlayers; i++) {
    const isCustom = i < customNames.length && customNames[i].trim() !== "";
    const name = isCustom
      ? customNames[i].trim()
      : (() => {
          for (const n of shuffledNames) {
            if (!usedNames.has(n)) {
              usedNames.add(n);
              return n;
            }
          }
          return `Player${i + 1}`;
        })();

    if (!isCustom) usedNames.add(name);

    const avatar = (() => {
      for (const a of shuffledAvatars) {
        if (!usedAvatars.has(a)) {
          usedAvatars.add(a);
          return a;
        }
      }
      return "🎭";
    })();

    const playerClass = pick(PLAYER_CLASSES);

    players.push({
      id: i,
      name,
      avatar,
      playerClass,
      hp: playerClass.hp,
      maxHp: playerClass.hp,
      attack: playerClass.attack,
      defense: playerClass.defense,
      speed: playerClass.speed,
      weapon: null,
      alive: true,
      kills: 0,
      specialUsed: false,
      shield: 0,
      poisoned: false,
      alliance: null,
      isCustom,
    });
  }

  return {
    players,
    rounds: [],
    currentRound: 0,
    phase: "setup",
    winner: null,
    gameSpeed: 1,
    totalPlayers,
    eliminationOrder: [],
    gameId,
  };
}

let eventIdCounter = 0;

function createEvent(
  type: EventType,
  description: string,
  players: number[],
  killed: number[],
  icon: string,
  highlight: RoundEvent["highlight"]
): RoundEvent {
  return {
    id: eventIdCounter++,
    type,
    description,
    players,
    killed,
    icon,
    highlight,
  };
}

// ===== PROCESS SINGLE EVENT =====
function processEvent(
  eventType: EventType,
  alivePlayers: Player[],
  allPlayers: Player[]
): RoundEvent | null {
  if (alivePlayers.length < 1) return null;

  const alive = alivePlayers.filter((p) => p.alive);
  if (alive.length < 1) return null;

  switch (eventType) {
    case "attack": {
      if (alive.length < 2) return null;
      const [attacker, defender] = shuffle(alive).slice(0, 2);
      const weaponBonus = attacker.weapon ? attacker.weapon.damage : 0;
      const totalAttack = attacker.attack + weaponBonus + rand(1, 10);
      const totalDefense = defender.defense + defender.shield + rand(1, 5);
      const damage = Math.max(totalAttack - totalDefense, 5);

      defender.hp -= damage;
      const killed: number[] = [];
      let desc: string;

      if (defender.hp <= 0) {
        defender.alive = false;
        defender.hp = 0;
        attacker.kills++;
        killed.push(defender.id);
        const weaponText = attacker.weapon ? ` with ${attacker.weapon.emoji} ${attacker.weapon.nameEn}` : "";
        desc = `${attacker.avatar} **${attacker.name}** eliminated ${defender.avatar} **${defender.name}**${weaponText}! (-${damage} HP) 💀`;
      } else {
        const weaponText = attacker.weapon ? ` with ${attacker.weapon.emoji} ${attacker.weapon.nameEn}` : "";
        desc = `${attacker.avatar} **${attacker.name}** attacked ${defender.avatar} **${defender.name}**${weaponText}! (-${damage} HP, ${defender.hp} HP left)`;
      }
      return createEvent("attack", desc, [attacker.id, defender.id], killed, "⚔️", killed.length > 0 ? "kill" : "danger");
    }

    case "find_weapon": {
      const player = pick(alive);
      const weapon = getRandomWeapon();
      const oldWeapon = player.weapon;
      if (!oldWeapon || weapon.damage > oldWeapon.damage) {
        player.weapon = weapon;
        const desc = oldWeapon
          ? `${player.avatar} **${player.name}** found ${weapon.emoji} **${weapon.nameEn}** and discarded ${oldWeapon.emoji} ${oldWeapon.nameEn}!`
          : `${player.avatar} **${player.name}** found ${weapon.emoji} **${weapon.nameEn}**!`;
        return createEvent("find_weapon", desc, [player.id], [], "🎁", "buff");
      } else {
        const desc = `${player.avatar} **${player.name}** found ${weapon.emoji} ${weapon.nameEn} but ignored it for a better weapon.`;
        return createEvent("find_weapon", desc, [player.id], [], "🔍", "neutral");
      }
    }

    case "trap": {
      if (alive.length < 2) return null;
      const [trapper, victim] = shuffle(alive).slice(0, 2);
      const damage = rand(15, 35);
      victim.hp -= damage;
      const killed: number[] = [];

      if (victim.hp <= 0) {
        victim.alive = false;
        victim.hp = 0;
        trapper.kills++;
        killed.push(victim.id);
        return createEvent("trap", `${trapper.avatar} **${trapper.name}** set a trap and ${victim.avatar} **${victim.name}** fell for it! (-${damage} HP) 💀`, [trapper.id, victim.id], killed, "🪤", "kill");
      }
      return createEvent("trap", `${victim.avatar} **${victim.name}** triggered ${trapper.avatar} **${trapper.name}**'s trap! (-${damage} HP, ${victim.hp} HP left)`, [trapper.id, victim.id], [], "🪤", "danger");
    }

    case "heal": {
      const player = pick(alive);
      const healAmount = rand(15, 40);
      player.hp = Math.min(player.hp + healAmount, player.maxHp);
      if (player.poisoned) {
        player.poisoned = false;
        return createEvent("heal", `${player.avatar} **${player.name}** found antidote and restored ${healAmount} HP! (${player.hp}/${player.maxHp} HP)`, [player.id], [], "💊", "buff");
      }
      return createEvent("heal", `${player.avatar} **${player.name}** found food and restored ${healAmount} HP! (${player.hp}/${player.maxHp} HP)`, [player.id], [], "🍖", "buff");
    }

    case "alliance": {
      if (alive.length < 3) return null;
      const group = shuffle(alive).slice(0, rand(2, 3));
      const allianceId = Date.now() + Math.random();
      group.forEach((p) => {
        p.alliance = allianceId;
        p.defense += 2;
      });
      const names = group.map((p) => `${p.avatar} **${p.name}**`).join(", ");
      return createEvent("alliance", `${names} formed an alliance! (+2 Defense each)`, group.map((p) => p.id), [], "🤝", "buff");
    }

    case "betray": {
      if (alive.length < 2) return null;
      const alliedPlayers = alive.filter((p) => p.alliance !== null);
      if (alliedPlayers.length < 2) {
        return processEvent("attack", alivePlayers, allPlayers);
      }
      const betrayer = pick(alliedPlayers);
      const allies = alliedPlayers.filter((p) => p.id !== betrayer.id && p.alliance === betrayer.alliance);
      if (allies.length === 0) return processEvent("attack", alivePlayers, allPlayers);

      const victim = pick(allies);
      const damage = rand(25, 50);
      victim.hp -= damage;
      betrayer.alliance = null;
      victim.alliance = null;
      const killed: number[] = [];

      if (victim.hp <= 0) {
        victim.alive = false;
        victim.hp = 0;
        betrayer.kills++;
        killed.push(victim.id);
        return createEvent("betray", `💔 ${betrayer.avatar} **${betrayer.name}** BETRAYED and eliminated ${victim.avatar} **${victim.name}**! (-${damage} HP) 💀`, [betrayer.id, victim.id], killed, "🗡️", "kill");
      }
      return createEvent("betray", `💔 ${betrayer.avatar} **${betrayer.name}** BETRAYED ${victim.avatar} **${victim.name}**! (-${damage} HP, ${victim.hp} HP left)`, [betrayer.id, victim.id], [], "💔", "danger");
    }

    case "storm": {
      const stormVictims = shuffle(alive).slice(0, rand(1, Math.min(3, alive.length)));
      const killed: number[] = [];
      const descs: string[] = [];
      stormVictims.forEach((p) => {
        const damage = rand(10, 30);
        p.hp -= damage;
        if (p.hp <= 0) {
          p.alive = false;
          p.hp = 0;
          killed.push(p.id);
          descs.push(`${p.avatar} **${p.name}** was eliminated by the storm! 💀`);
        } else {
          descs.push(`${p.avatar} **${p.name}** hit by storm! (-${damage} HP)`);
        }
      });
      return createEvent("storm", `🌪️ A massive storm hits! ${descs.join(" | ")}`, stormVictims.map((p) => p.id), killed, "🌪️", killed.length > 0 ? "kill" : "danger");
    }

    case "special": {
      const player = pick(alive.filter((p) => !p.specialUsed));
      if (!player) return processEvent("heal", alivePlayers, allPlayers);

      player.specialUsed = true;
      const cls = player.playerClass;

      switch (cls.special) {
        case "Cuồng Nộ":
          player.attack += 8;
          return createEvent("special", `${player.avatar} **${player.name}** activated **${cls.specialEn}**! Attack +8! 🔥`, [player.id], [], "🔥", "special");
        case "Mưa Tên": {
          if (alive.length < 2) return processEvent("heal", alivePlayers, allPlayers);
          const targets = shuffle(alive.filter((p) => p.id !== player.id)).slice(0, rand(1, 3));
          const killed: number[] = [];
          const tDescs: string[] = [];
          targets.forEach((t) => {
            const dmg = rand(12, 25);
            t.hp -= dmg;
            if (t.hp <= 0) { t.alive = false; t.hp = 0; player.kills++; killed.push(t.id); tDescs.push(`${t.avatar} ${t.name} 💀`); }
            else tDescs.push(`${t.avatar} ${t.name} (-${dmg})`);
          });
          return createEvent("special", `${player.avatar} **${player.name}** used **${cls.specialEn}** 🏹! Hit: ${tDescs.join(", ")}`, [player.id, ...targets.map((t) => t.id)], killed, "🏹", killed.length > 0 ? "kill" : "special");
        }
        case "Cầu Lửa": {
          if (alive.length < 2) return processEvent("heal", alivePlayers, allPlayers);
          const target = pick(alive.filter((p) => p.id !== player.id));
          const dmg = rand(30, 55);
          target.hp -= dmg;
          const killed: number[] = [];
          if (target.hp <= 0) { target.alive = false; target.hp = 0; player.kills++; killed.push(target.id); }
          return createEvent("special", `${player.avatar} **${player.name}** launched **${cls.specialEn}** 🔥 at ${target.avatar} **${target.name}**! (-${dmg} HP)${killed.length > 0 ? " 💀" : ` (${target.hp} HP left)`}`, [player.id, target.id], killed, "🔥", killed.length > 0 ? "kill" : "special");
        }
        case "Ám Sát": {
          if (alive.length < 2) return processEvent("heal", alivePlayers, allPlayers);
          const target = pick(alive.filter((p) => p.id !== player.id));
          const crit = Math.random() < 0.4;
          const dmg = crit ? rand(50, 70) : rand(20, 40);
          target.hp -= dmg;
          const killed: number[] = [];
          if (target.hp <= 0) { target.alive = false; target.hp = 0; player.kills++; killed.push(target.id); }
          return createEvent("special", `${player.avatar} **${player.name}** **${cls.specialEn}** ${target.avatar} **${target.name}**!${crit ? " 🎯 CRITICAL!" : ""} (-${dmg} HP)${killed.length > 0 ? " 💀" : ` (${target.hp} HP left)`}`, [player.id, target.id], killed, "🥷", killed.length > 0 ? "kill" : "special");
        }
        case "Bất Khuất":
          player.shield += 20;
          player.hp = Math.min(player.hp + 20, player.maxHp);
          return createEvent("special", `${player.avatar} **${player.name}** activated **${cls.specialEn}**! 🛡️ Shield +20, HP +20!`, [player.id], [], "🛡️", "special");
        case "Hồi Máu":
          player.hp = player.maxHp;
          return createEvent("special", `${player.avatar} **${player.name}** used **${cls.specialEn}** ✨! Full HP restored! (${player.maxHp} HP)`, [player.id], [], "✨", "special");
        case "Bẫy Thú": {
          if (alive.length < 2) return processEvent("heal", alivePlayers, allPlayers);
          const target = pick(alive.filter((p) => p.id !== player.id));
          const dmg = rand(20, 40);
          target.hp -= dmg;
          target.speed = Math.max(target.speed - 5, 0);
          const killed: number[] = [];
          if (target.hp <= 0) { target.alive = false; target.hp = 0; player.kills++; killed.push(target.id); }
          return createEvent("special", `${player.avatar} **${player.name}** summoned **${cls.specialEn}** 🐺! ${target.avatar} **${target.name}** was bitten! (-${dmg} HP, -5 Speed)${killed.length > 0 ? " 💀" : ""}`, [player.id, target.id], killed, "🐺", killed.length > 0 ? "kill" : "special");
        }
        case "Phân Thân":
          player.speed += 10;
          player.defense += 5;
          return createEvent("special", `${player.avatar} **${player.name}** used **${cls.specialEn}** 🥷! Speed +10, Defense +5!`, [player.id], [], "🥷", "special");
        case "Điên Cuồng":
          player.attack += 15;
          player.defense = Math.max(player.defense - 3, 0);
          return createEvent("special", `${player.avatar} **${player.name}** entered **${cls.specialEn}** 🪓! Attack +15, Defense -3!`, [player.id], [], "🪓", "special");
        case "Thánh Giá": {
          const alliesNearby = shuffle(alive.filter((p) => p.id !== player.id)).slice(0, 2);
          alliesNearby.forEach((a) => {
            a.hp = Math.min(a.hp + 15, a.maxHp);
          });
          player.hp = Math.min(player.hp + 25, player.maxHp);
          const names = alliesNearby.map((a) => `${a.avatar} ${a.name}`).join(", ");
          return createEvent("special", `${player.avatar} **${player.name}** used **${cls.specialEn}** ✝️! Healed self (+25 HP) and ${names} (+15 HP each)!`, [player.id, ...alliesNearby.map((a) => a.id)], [], "✝️", "special");
        }
        default:
          player.attack += 5;
          return createEvent("special", `${player.avatar} **${player.name}** activated special ability! Attack +5!`, [player.id], [], "⭐", "special");
      }
    }

    case "duel": {
      if (alive.length < 2) return null;
      const [p1, p2] = shuffle(alive).slice(0, 2);
      const p1Power = p1.attack + (p1.weapon?.damage || 0) + p1.speed + rand(1, 20);
      const p2Power = p2.attack + (p2.weapon?.damage || 0) + p2.speed + rand(1, 20);

      const winner = p1Power >= p2Power ? p1 : p2;
      const loser = winner === p1 ? p2 : p1;
      const damage = rand(20, 50);
      loser.hp -= damage;
      const killed: number[] = [];

      if (loser.hp <= 0) {
        loser.alive = false;
        loser.hp = 0;
        winner.kills++;
        killed.push(loser.id);
      }
      return createEvent("duel", `⚔️ **DUEL!** ${p1.avatar} **${p1.name}** vs ${p2.avatar} **${p2.name}** → ${winner.avatar} **${winner.name}** wins! ${loser.avatar} ${loser.name} (-${damage} HP)${killed.length > 0 ? " 💀" : ` (${loser.hp} HP left)`}`, [p1.id, p2.id], killed, "⚔️", killed.length > 0 ? "kill" : "danger");
    }

    case "steal": {
      if (alive.length < 2) return null;
      const armedPlayers = alive.filter((p) => p.weapon !== null);
      if (armedPlayers.length === 0) return processEvent("find_weapon", alivePlayers, allPlayers);

      const victim = pick(armedPlayers);
      const thief = pick(alive.filter((p) => p.id !== victim.id));
      if (!thief) return null;

      const stolenWeapon = victim.weapon!;
      if (!thief.weapon || stolenWeapon.damage > thief.weapon.damage) {
        thief.weapon = stolenWeapon;
      }
      victim.weapon = null;

      return createEvent("steal", `${thief.avatar} **${thief.name}** stole ${stolenWeapon.emoji} **${stolenWeapon.nameEn}** from ${victim.avatar} **${victim.name}**! 🏃`, [thief.id, victim.id], [], "🏃", "danger");
    }

    case "hide": {
      const player = pick(alive);
      player.defense += 3;
      const location = pick(LOCATIONS);
      return createEvent("hide", `${player.avatar} **${player.name}** hid at **${location}** and gained defense! (+3 Defense)`, [player.id], [], "🌿", "neutral");
    }

    case "craft": {
      const player = pick(alive);
      const roll = Math.random();
      if (roll < 0.5) {
        player.shield += rand(5, 15);
        return createEvent("craft", `${player.avatar} **${player.name}** crafted a shield! (+${player.shield} Shield) 🛠️`, [player.id], [], "🛠️", "buff");
      } else {
        player.attack += rand(2, 5);
        return createEvent("craft", `${player.avatar} **${player.name}** upgraded weapon! (+Attack) 🛠️`, [player.id], [], "🛠️", "buff");
      }
    }

    case "monster": {
      const player = pick(alive);
      const monsters = ["🐻 Grizzly Bear", "🐗 Wild Boar", "🐍 Venomous Snake", "🦂 Giant Scorpion", "🐉 Baby Dragon"];
      const monster = pick(monsters);
      const playerWins = Math.random() < 0.6;

      if (playerWins) {
        const bonus = rand(3, 8);
        player.attack += bonus;
        return createEvent("monster", `${player.avatar} **${player.name}** defeated ${monster}! (+${bonus} Attack) 🏆`, [player.id], [], "🐉", "buff");
      } else {
        const damage = rand(15, 35);
        player.hp -= damage;
        const killed: number[] = [];
        if (player.hp <= 0) {
          player.alive = false;
          player.hp = 0;
          killed.push(player.id);
        }
        return createEvent("monster", `${player.avatar} **${player.name}** was attacked by ${monster}! (-${damage} HP)${killed.length > 0 ? " 💀" : ` (${player.hp} HP left)`}`, [player.id], killed, "🐉", killed.length > 0 ? "kill" : "danger");
      }
    }

    case "airdrop": {
      const player = pick(alive);
      const items = [
        { desc: "Legendary Armor", effect: () => { player.defense += 10; player.shield += 15; } },
        { desc: "Power Potion", effect: () => { player.attack += 7; player.speed += 5; } },
        { desc: "Mega Health Kit", effect: () => { player.hp = player.maxHp; player.maxHp += 20; player.hp = player.maxHp; } },
      ];
      const item = pick(items);
      item.effect();

      return createEvent("airdrop", `📦 **AIRDROP!** ${player.avatar} **${player.name}** received **${item.desc}**! 🎉`, [player.id], [], "📦", "special");
    }

    case "poison": {
      if (alive.length < 2) return null;
      const [poisoner, victim] = shuffle(alive).slice(0, 2);
      const damage = rand(10, 25);
      victim.hp -= damage;
      victim.poisoned = true;
      const killed: number[] = [];

      if (victim.hp <= 0) {
        victim.alive = false;
        victim.hp = 0;
        poisoner.kills++;
        killed.push(victim.id);
      }
      return createEvent("poison", `${poisoner.avatar} **${poisoner.name}** poisoned ${victim.avatar} **${victim.name}**! 🧪 (-${damage} HP)${killed.length > 0 ? " 💀" : ` (${victim.hp} HP left) - Poisoned!`}`, [poisoner.id, victim.id], killed, "🧪", killed.length > 0 ? "kill" : "danger");
    }

    default:
      return null;
  }
}

// ===== PROCESS ROUND =====
export function processRound(state: GameState): Round {
  const roundNumber = state.currentRound + 1;
  const alivePlayers = state.players.filter((p) => p.alive);
  const aliveBefore = alivePlayers.length;
  const location = pick(LOCATIONS);

  // Poison tick
  alivePlayers.forEach((p) => {
    if (p.poisoned) {
      const poisonDmg = rand(3, 8);
      p.hp -= poisonDmg;
      if (p.hp <= 0) {
        p.alive = false;
        p.hp = 0;
      }
    }
  });

  // Storm intensifies in later rounds
  const stormActive = roundNumber > 3 && Math.random() < Math.min(0.3 + roundNumber * 0.05, 0.7);

  // Number of events per round (scales with player count)
  const aliveNow = state.players.filter((p) => p.alive);
  const numEvents = Math.max(2, Math.min(Math.floor(aliveNow.length / 2), 8));

  const events: RoundEvent[] = [];

  // If storm is active, force a storm event
  if (stormActive) {
    const stormEvent = processEvent("storm", aliveNow, state.players);
    if (stormEvent) events.push(stormEvent);
  }

  for (let i = 0; i < numEvents; i++) {
    const alive = state.players.filter((p) => p.alive);
    if (alive.length <= 1) break;

    const validEvents = GAME_EVENTS.filter((e) => alive.length >= e.minPlayers);
    if (validEvents.length === 0) break;

    // In later rounds, increase attack probability
    const adjustedEvents = validEvents.map((e) => ({
      ...e,
      weight: e.type === "attack" || e.type === "duel"
        ? e.weight * (1 + roundNumber * 0.15)
        : e.type === "heal" || e.type === "hide"
          ? e.weight * Math.max(0.3, 1 - roundNumber * 0.08)
          : e.weight,
    }));

    const selectedEvent = weightedPick(adjustedEvents);
    const event = processEvent(selectedEvent.type, alive, state.players);
    if (event) events.push(event);
  }

  // Track eliminations
  const aliveAfter = state.players.filter((p) => p.alive).length;

  return {
    number: roundNumber,
    events,
    aliveBefore,
    aliveAfter,
    location,
    stormActive,
  };
}

export function checkGameEnd(state: GameState): boolean {
  const alive = state.players.filter((p) => p.alive);
  return alive.length <= 1;
}

export function getWinner(state: GameState): Player | null {
  const alive = state.players.filter((p) => p.alive);
  return alive.length === 1 ? alive[0] : null;
}

export function getLeaderboard(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.kills !== b.kills) return b.kills - a.kills;
    return b.hp - a.hp;
  });
}
