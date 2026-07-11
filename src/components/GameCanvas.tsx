import { useRef, useEffect, useState, useCallback } from "react";
import { PLAYER_CLASSES, WEAPONS } from "../data/gameData";

// ═══ TYPES ═══
interface Runner {
  id: number;
  name: string;
  emoji: string;
  classEmoji: string;
  className: string;
  x: number;
  y: number;
  vy: number;
  lane: number;        // 0-based lane index
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  shield: number;
  alive: boolean;
  isPlayer: boolean;
  jumpCooldown: number;
  hitFlash: number;
  invincible: number;  // invincibility frames after hit
  score: number;
  boostTimer: number;
  slowTimer: number;
  distance: number;    // total distance run
}

interface Trap {
  x: number;
  lane: number;
  type: "spike" | "fire" | "bomb" | "hole" | "lightning" | "boulder";
  emoji: string;
  damage: number;
  width: number;
  hit: Set<number>;  // players already hit
}

interface PowerUp {
  x: number;
  lane: number;
  type: "heal" | "speed" | "shield" | "weapon" | "star" | "magnet";
  emoji: string;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

interface RaceState {
  runners: Runner[];
  traps: Trap[];
  powerUps: PowerUp[];
  particles: Particle[];
  cameraX: number;
  gameTime: number;
  phase: "countdown" | "racing" | "finished";
  winner: Runner | null;
  logs: { text: string; type: "damage" | "item" | "death" | "info" }[];
  difficulty: number;
  spawnTimer: number;
  groundScroll: number;
}

// ═══ CONSTANTS ═══
const W = 960;
const H = 540;
const GROUND_Y = 440;
const LANE_COUNT = 5;
const LANE_HEIGHT = 60;
const LANE_TOP = GROUND_Y - LANE_COUNT * LANE_HEIGHT;
const GRAVITY = 0.7;
const JUMP_FORCE = -14;
const RUNNER_SIZE = 42;
const BASE_SPEED = 2.5;

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const randF = (a: number, b: number) => Math.random() * (b - a) + a;
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const laneY = (lane: number) => LANE_TOP + lane * LANE_HEIGHT + LANE_HEIGHT - RUNNER_SIZE;

const AVATARS = [
  "🦁","🐺","🦅","🐉","🦊","🐻","🦇","🐍","🦈","🦂",
  "🐲","🦄","🐯","🦉","🐗","🦎","🐙","🦏","🐊","🐸",
  "🦋","🐝","🦀","🐧","🐨","🦩","🐬","🦚","🐒","🦘",
  "🐞","🦜","🐢","🦔","🐠","🦙","🦝","🐰","🐮","🐷",
];
const NAMES = [
  "Shadow","Phoenix","Blaze","Storm","Frost","Viper","Thunder",
  "Raven","Wolf","Dragon","Titan","Hawk","Ghost","Reaper","Nova",
  "Fury","Ember","Blade","Apex","Chaos","Onyx","Zephyr","Crimson",
  "Eclipse","Phantom","Spark","Obsidian","Valor","Nyx","Aether",
  "Pyro","Glacier","Tempest","Wraith","Inferno","Bolt","Dusk",
  "Fang","Jinx","Karma",
];

const TRAP_TYPES: { type: Trap["type"]; emoji: string; damage: number; weight: number }[] = [
  { type: "spike",     emoji: "🔺", damage: 20, weight: 30 },
  { type: "fire",      emoji: "🔥", damage: 25, weight: 20 },
  { type: "bomb",      emoji: "💣", damage: 35, weight: 12 },
  { type: "hole",      emoji: "🕳️", damage: 40, weight: 10 },
  { type: "lightning",  emoji: "⚡", damage: 30, weight: 15 },
  { type: "boulder",   emoji: "🪨", damage: 15, weight: 20 },
];

const POWERUP_TYPES: { type: PowerUp["type"]; emoji: string; weight: number }[] = [
  { type: "heal",    emoji: "❤️", weight: 25 },
  { type: "speed",   emoji: "⚡", weight: 20 },
  { type: "shield",  emoji: "🛡️", weight: 15 },
  { type: "weapon",  emoji: "⚔️", weight: 15 },
  { type: "star",    emoji: "⭐", weight: 8 },
  { type: "magnet",  emoji: "🧲", weight: 12 },
];

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

// ═══ COMPONENT ═══
interface Props {
  playerName: string;
  playerCount: number;
  gameId: string | null;
  onGameEnd: (winner: Runner | null, players: Runner[], rounds: number) => void;
  onBack: () => void;
}

export default function GameCanvas({ playerName, playerCount, gameId, onGameEnd, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RaceState | null>(null);
  const animRef = useRef(0);
  const endedRef = useRef(false);

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const [hud, setHud] = useState({ alive: 0, total: 0, time: 0 });
  const [logDisplay, setLogDisplay] = useState<{ text: string; type: string }[]>([]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ═══ INIT ═══
  const init = useCallback(() => {
    const runners: Runner[] = [];
    const usedNames = new Set<string>();
    const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
    const avatars = [...AVATARS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < playerCount; i++) {
      const isP = i === 0;
      const name = isP ? playerName : (shuffled.find(n => !usedNames.has(n)) || `Bot${i}`);
      usedNames.add(name);
      const cls = pick(PLAYER_CLASSES);
      const lane = i % LANE_COUNT;
      const spd = BASE_SPEED + randF(-0.4, 0.4) + cls.speed * 0.05;
      runners.push({
        id: i, name, emoji: avatars[i % avatars.length],
        classEmoji: cls.emoji, className: cls.nameEn,
        x: 80 + rand(0, 60), y: laneY(lane), vy: 0,
        lane, hp: cls.hp, maxHp: cls.hp,
        speed: spd, baseSpeed: spd,
        shield: 0, alive: true, isPlayer: isP,
        jumpCooldown: 0, hitFlash: 0, invincible: 0,
        score: 0, boostTimer: 0, slowTimer: 0, distance: 0,
      });
    }

    stateRef.current = {
      runners, traps: [], powerUps: [], particles: [],
      cameraX: 0, gameTime: 0,
      phase: "countdown", winner: null,
      logs: [{ text: "🏁 Get ready...", type: "info" }],
      difficulty: 1, spawnTimer: 0, groundScroll: 0,
    };
    endedRef.current = false;
  }, [playerName, playerCount]);

  const addParticle = (x: number, y: number, text: string, color: string, size = 16) => {
    stateRef.current?.particles.push({
      x, y, vx: randF(-2, 2), vy: randF(-5, -1), text, color, life: 60, size,
    });
  };

  const addLog = (text: string, type: "damage" | "item" | "death" | "info") => {
    const s = stateRef.current;
    if (!s) return;
    s.logs.unshift({ text, type });
    if (s.logs.length > 40) s.logs.pop();
    setLogDisplay(s.logs.slice(0, 6));
  };

  // ═══ MAIN LOOP ═══
  useEffect(() => {
    init();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      const s = stateRef.current;
      if (!s) { animRef.current = requestAnimationFrame(loop); return; }

      if (!pausedRef.current) {
        const ticks = speedRef.current;
        for (let t = 0; t < ticks; t++) {
          if ((s.phase as string) === "finished") break;
          update(s);
        }
      }

      render(ctx, s);
      animRef.current = requestAnimationFrame(loop);
    };

    // ═══════════ UPDATE ═══════════
    const update = (s: RaceState) => {
      s.gameTime++;

      // Countdown
      if (s.phase === "countdown") {
        if (s.gameTime === 60) addLog("3...", "info");
        if (s.gameTime === 120) addLog("2...", "info");
        if (s.gameTime === 180) addLog("1...", "info");
        if (s.gameTime >= 240) {
          s.phase = "racing";
          addLog("🏁 GO! GO! GO!", "info");
        }
        return;
      }

      const alive = s.runners.filter(r => r.alive);
      s.difficulty = 1 + (s.gameTime - 240) / 2000;

      // ── Move runners ──
      s.runners.forEach(r => {
        if (!r.alive) return;

        // Timers
        if (r.jumpCooldown > 0) r.jumpCooldown--;
        if (r.hitFlash > 0) r.hitFlash--;
        if (r.invincible > 0) r.invincible--;
        if (r.boostTimer > 0) { r.boostTimer--; if (r.boostTimer === 0) r.speed = r.baseSpeed; }
        if (r.slowTimer > 0) { r.slowTimer--; if (r.slowTimer === 0) r.speed = r.baseSpeed; }

        // Run forward
        const curSpeed = r.speed * (r.boostTimer > 0 ? 1.6 : 1) * (r.slowTimer > 0 ? 0.5 : 1);
        r.x += curSpeed;
        r.distance += curSpeed;

        // Gravity (jumping)
        r.vy += GRAVITY;
        r.y += r.vy;
        const groundLevel = laneY(r.lane);
        if (r.y >= groundLevel) { r.y = groundLevel; r.vy = 0; }

        // AI: detect traps ahead and jump / switch lane
        const nearTraps = s.traps.filter(t =>
          t.x > r.x + 20 && t.x < r.x + 160 && t.lane === r.lane && !t.hit.has(r.id)
        );

        if (nearTraps.length > 0 && r.y >= groundLevel - 2) {
          // Decide: jump or switch lane
          if (Math.random() < 0.55 && r.jumpCooldown === 0) {
            // Jump
            r.vy = JUMP_FORCE;
            r.jumpCooldown = 25;
          } else if (Math.random() < 0.7) {
            // Switch lane
            const possibleLanes = [];
            if (r.lane > 0) possibleLanes.push(r.lane - 1);
            if (r.lane < LANE_COUNT - 1) possibleLanes.push(r.lane + 1);
            // Avoid lanes with traps
            const safeLanes = possibleLanes.filter(l =>
              !s.traps.some(t => t.x > r.x && t.x < r.x + 120 && t.lane === l)
            );
            if (safeLanes.length > 0) {
              r.lane = pick(safeLanes);
            } else if (possibleLanes.length > 0) {
              r.lane = pick(possibleLanes);
            }
          }
        }

        // Random lane switch for variety
        if (Math.random() < 0.003) {
          if (r.lane > 0 && Math.random() < 0.5) r.lane--;
          else if (r.lane < LANE_COUNT - 1) r.lane++;
        }

        // Smoothly move to target lane Y
        const targetY = laneY(r.lane);
        if (r.vy === 0 && Math.abs(r.y - targetY) > 1) {
          r.y += (targetY - r.y) * 0.15;
        }

        // AI: seek powerups in nearby lanes
        const nearPU = s.powerUps.find(p =>
          !p.collected && p.x > r.x && p.x < r.x + 140 && Math.abs(p.lane - r.lane) <= 1
        );
        if (nearPU && Math.random() < 0.3) {
          r.lane = nearPU.lane;
        }

        // Trap collision
        s.traps.forEach(t => {
          if (t.hit.has(r.id)) return;
          if (r.lane !== t.lane) return;
          if (Math.abs(r.x + RUNNER_SIZE / 2 - t.x) > t.width / 2 + 10) return;
          // Check if jumping over
          if (r.y < laneY(r.lane) - 30) return;
          // HIT!
          t.hit.add(r.id);
          if (r.invincible > 0) {
            addParticle(r.x + 20, r.y, "IMMUNE", "#3b82f6", 14);
            return;
          }
          let dmg = Math.round(t.damage * s.difficulty);
          if (r.shield > 0) {
            const absorbed = Math.min(r.shield, dmg);
            r.shield -= absorbed;
            dmg -= absorbed;
            addParticle(r.x + 20, r.y, `🛡️-${absorbed}`, "#3b82f6", 14);
          }
          if (dmg > 0) {
            r.hp -= dmg;
            r.hitFlash = 15;
            r.slowTimer = 40;
            r.speed = r.baseSpeed;
            addParticle(r.x + 20, r.y, `-${dmg}`, "#ef4444", 20);
            addLog(`${t.emoji} ${r.emoji} ${r.name} hit by ${t.type}! (-${dmg} HP)`, "damage");
          }
          if (r.hp <= 0) {
            r.alive = false;
            r.hp = 0;
            addLog(`💀 ${r.emoji} ${r.name} eliminated!`, "death");
            addParticle(r.x, r.y - 10, "💀", "#fff", 30);
            for (let i = 0; i < 6; i++)
              addParticle(r.x + rand(-15, 15), r.y + rand(-20, 0), "✦", "#ef4444", 12);
          }
        });

        // PowerUp collection
        s.powerUps.forEach(p => {
          if (p.collected) return;
          if (r.lane !== p.lane) return;
          if (Math.abs(r.x + RUNNER_SIZE / 2 - p.x) > 25) return;
          p.collected = true;
          applyPowerUp(r, p, s);
        });
      });

      // ── Camera follows the pack ──
      if (alive.length > 0) {
        const avgX = alive.reduce((s, r) => s + r.x, 0) / alive.length;
        const targetCam = avgX - 200;
        s.cameraX += (targetCam - s.cameraX) * 0.08;
      }

      // ── Spawn traps & powerups ──
      s.spawnTimer--;
      if (s.spawnTimer <= 0) {
        const frontX = (alive.length > 0 ? Math.max(...alive.map(r => r.x)) : s.cameraX) + W + rand(50, 200);

        // Spawn traps (1-3)
        const trapCount = rand(1, Math.min(3, Math.ceil(s.difficulty)));
        const usedLanes = new Set<number>();
        for (let i = 0; i < trapCount; i++) {
          let lane: number;
          do { lane = rand(0, LANE_COUNT - 1); } while (usedLanes.has(lane) && usedLanes.size < LANE_COUNT);
          usedLanes.add(lane);
          const tt = weightedPick(TRAP_TYPES);
          s.traps.push({
            x: frontX + i * rand(30, 80), lane, type: tt.type, emoji: tt.emoji,
            damage: tt.damage, width: rand(30, 50), hit: new Set(),
          });
        }

        // Spawn powerup
        if (Math.random() < 0.5) {
          const pLane = rand(0, LANE_COUNT - 1);
          const pt = weightedPick(POWERUP_TYPES);
          s.powerUps.push({
            x: frontX + rand(-40, 80), lane: pLane,
            type: pt.type, emoji: pt.emoji, collected: false,
          });
        }

        s.spawnTimer = Math.max(20, Math.floor(80 - s.difficulty * 8));
      }

      // Clean old traps/powerups
      const minX = s.cameraX - 200;
      s.traps = s.traps.filter(t => t.x > minX);
      s.powerUps = s.powerUps.filter(p => p.x > minX);

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
        return p.life > 0;
      });

      // Win check
      const aliveCount = s.runners.filter(r => r.alive).length;
      if (aliveCount <= 1 && s.runners.length > 1) {
        s.phase = "finished";
        s.winner = s.runners.find(r => r.alive) || null;
        if (s.winner) addLog(`🏆 ${s.winner.emoji} ${s.winner.name} is the last one standing!`, "info");
        else addLog("💀 No survivors!", "info");
        if (!endedRef.current) {
          endedRef.current = true;
          setTimeout(() => onGameEnd(s.winner, s.runners, Math.floor((s.gameTime - 240) / 60)), 3500);
        }
      }

      // HUD
      if (s.gameTime % 6 === 0) {
        setHud({ alive: aliveCount, total: s.runners.length, time: Math.floor(Math.max(0, s.gameTime - 240) / 60) });
      }
    };

    // ── Apply powerup ──
    const applyPowerUp = (r: Runner, p: PowerUp, _s: RaceState) => {
      switch (p.type) {
        case "heal": {
          const amt = rand(20, 40);
          r.hp = Math.min(r.hp + amt, r.maxHp);
          addLog(`❤️ ${r.emoji} ${r.name} healed +${amt} HP`, "item");
          addParticle(r.x + 20, r.y, `+${amt}`, "#22c55e", 18);
          break;
        }
        case "speed":
          r.boostTimer = 180;
          r.speed = r.baseSpeed;
          addLog(`⚡ ${r.emoji} ${r.name} speed boost!`, "item");
          addParticle(r.x + 20, r.y, "⚡FAST", "#eab308", 16);
          break;
        case "shield":
          r.shield += 30;
          addLog(`🛡️ ${r.emoji} ${r.name} gained shield +30`, "item");
          addParticle(r.x + 20, r.y, "🛡️+30", "#3b82f6", 16);
          break;
        case "weapon": {
          const w = pick(WEAPONS);
          r.hp -= rand(0, 5); // sometimes weapons backfire slightly
          r.speed = r.baseSpeed + w.damage * 0.01;
          addLog(`⚔️ ${r.emoji} ${r.name} found ${w.emoji} ${w.nameEn}!`, "item");
          addParticle(r.x + 20, r.y, w.emoji, "#fbbf24", 22);
          break;
        }
        case "star":
          r.invincible = 300;
          r.hp = Math.min(r.hp + 20, r.maxHp);
          addLog(`⭐ ${r.emoji} ${r.name} is INVINCIBLE!`, "item");
          addParticle(r.x + 20, r.y, "⭐", "#fbbf24", 24);
          break;
        case "magnet":
          r.speed = r.baseSpeed + 0.5;
          r.baseSpeed += 0.2;
          addLog(`🧲 ${r.emoji} ${r.name} permanent speed up!`, "item");
          addParticle(r.x + 20, r.y, "🧲+SPD", "#a855f7", 16);
          break;
      }
    };

    // ═══════════ RENDER ═══════════
    const render = (ctx: CanvasRenderingContext2D, s: RaceState) => {
      // ── Background ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, LANE_TOP);
      bgGrad.addColorStop(0, "#0a0a1f");
      bgGrad.addColorStop(1, "#12122e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, LANE_TOP);

      // Stars
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + s.gameTime * 0.03) % W;
        const sy = (i * 43) % LANE_TOP;
        ctx.globalAlpha = 0.2 + Math.sin(s.gameTime * 0.04 + i) * 0.15;
        ctx.fillStyle = "#fff";
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // ── Track lanes ──
      for (let i = 0; i < LANE_COUNT; i++) {
        const ly = LANE_TOP + i * LANE_HEIGHT;
        ctx.fillStyle = i % 2 === 0 ? "#1a1a38" : "#1e1e40";
        ctx.fillRect(0, ly, W, LANE_HEIGHT);

        // Lane divider
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(W, ly);
        ctx.stroke();
        ctx.setLineDash([]);

        // Lane number
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.font = "bold 14px Arial";
        ctx.fillText(`${i + 1}`, 8, ly + LANE_HEIGHT / 2 + 5);
      }

      // Track bottom border
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      // Ground
      ctx.fillStyle = "#15152d";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

      // Scrolling ground marks
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      const scroll = s.cameraX % 50;
      for (let x = -scroll; x < W; x += 50) {
        ctx.fillRect(x, GROUND_Y + 8, 20, 3);
      }

      // Distance markers
      ctx.font = "10px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      const markerStart = Math.floor(s.cameraX / 500) * 500;
      for (let mx = markerStart; mx < s.cameraX + W + 500; mx += 500) {
        const sx = mx - s.cameraX;
        ctx.fillText(`${Math.floor(mx / 10)}m`, sx, GROUND_Y + 20);
        ctx.fillRect(sx, LANE_TOP, 1, GROUND_Y - LANE_TOP);
      }

      // ── Traps ──
      s.traps.forEach(t => {
        const tx = t.x - s.cameraX;
        if (tx < -60 || tx > W + 60) return;
        const ty = LANE_TOP + t.lane * LANE_HEIGHT + LANE_HEIGHT - 35;

        // Danger glow
        ctx.globalAlpha = 0.15 + Math.sin(s.gameTime * 0.15) * 0.1;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(tx, ty + 10, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText(t.emoji, tx, ty + 10);
        ctx.textAlign = "left";
      });

      // ── PowerUps ──
      s.powerUps.forEach(p => {
        if (p.collected) return;
        const px = p.x - s.cameraX;
        if (px < -40 || px > W + 40) return;
        const py = LANE_TOP + p.lane * LANE_HEIGHT + LANE_HEIGHT / 2;
        const floatY = Math.sin(s.gameTime * 0.1 + p.x * 0.05) * 5;

        // Glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(px, py + floatY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.emoji, px, py + floatY + 8);
        ctx.textAlign = "left";
      });

      // ── Runners (sorted by lane for proper overlap) ──
      const sortedRunners = [...s.runners].sort((a, b) => a.lane - b.lane);
      sortedRunners.forEach(r => {
        if (!r.alive) return;
        const rx = r.x - s.cameraX;
        if (rx < -80 || rx > W + 80) return;
        const centerX = rx + RUNNER_SIZE / 2;
        const ry = r.y;

        // Shadow on lane
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(centerX, laneY(r.lane) + RUNNER_SIZE + 3, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Hit flash
        if (r.hitFlash > 0) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(centerX, ry + RUNNER_SIZE / 2, RUNNER_SIZE / 2 + 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Invincible glow
        if (r.invincible > 0) {
          ctx.globalAlpha = 0.3 + Math.sin(s.gameTime * 0.3) * 0.2;
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(centerX, ry + RUNNER_SIZE / 2, RUNNER_SIZE / 2 + 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Speed boost trail
        if (r.boostTimer > 0) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = "#eab308";
          for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX - i * 12, ry + RUNNER_SIZE / 2, 4 - i, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // Player highlight
        if (r.isPlayer) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.5 + Math.sin(s.gameTime * 0.12) * 0.3;
          ctx.beginPath();
          ctx.arc(centerX, ry + RUNNER_SIZE / 2, RUNNER_SIZE / 2 + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Emoji
        ctx.font = "36px Arial";
        ctx.textAlign = "center";
        ctx.fillText(r.emoji, centerX, ry + RUNNER_SIZE - 3);

        // ── Username label ──
        const nameStr = r.name.length > 14 ? r.name.slice(0, 13) + "…" : r.name;
        ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
        const nameW = ctx.measureText(nameStr).width + 12;
        const nameX = centerX - nameW / 2;
        const nameY = ry - 26;

        // BG
        ctx.fillStyle = r.isPlayer ? "rgba(251,191,36,0.3)" : "rgba(0,0,0,0.6)";
        roundRect(ctx, nameX, nameY, nameW, 16, 4);
        ctx.fill();
        if (r.isPlayer) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1;
          roundRect(ctx, nameX, nameY, nameW, 16, 4);
          ctx.stroke();
        }

        // Text
        ctx.fillStyle = r.isPlayer ? "#fbbf24" : "#e2e8f0";
        ctx.fillText(nameStr, centerX, nameY + 12);

        // ── HP bar ──
        const hpY = ry - 8;
        const hpW = 44;
        const hpH = 5;
        const hpPct = clamp(r.hp / r.maxHp, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(centerX - hpW / 2, hpY, hpW, hpH);
        ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(centerX - hpW / 2, hpY, hpW * hpPct, hpH);

        // Shield bar
        if (r.shield > 0) {
          ctx.fillStyle = "#3b82f6";
          const shieldPct = clamp(r.shield / 50, 0, 1);
          ctx.fillRect(centerX - hpW / 2, hpY + hpH, hpW * shieldPct, 2);
        }

        ctx.textAlign = "left";
      });

      // ── Particles ──
      s.particles.forEach(pt => {
        const px = pt.x - s.cameraX;
        if (px < -50 || px > W + 50) return;
        ctx.font = `bold ${pt.size}px Arial`;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = clamp(pt.life / 40, 0, 1);
        ctx.textAlign = "center";
        ctx.fillText(pt.text, px, pt.y);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      });

      // ── HUD overlay ──
      // Top bar
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, 38);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(W, 38); ctx.stroke();

      ctx.font = "bold 14px 'Segoe UI', Arial";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("⚔️ RUMBLE ROYALE", 12, 25);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "13px 'Segoe UI', Arial";
      const aliveCount = s.runners.filter(r => r.alive).length;
      ctx.fillText(`Alive: `, 180, 25);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 15px 'Segoe UI', Arial";
      ctx.fillText(`${aliveCount}`, 225, 25);
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px Arial";
      ctx.fillText(`/ ${s.runners.length}`, 243, 25);

      // Timer
      const secs = Math.max(0, Math.floor((s.gameTime - 240) / 60));
      ctx.fillStyle = "#9ca3af";
      ctx.font = "13px 'Segoe UI', Arial";
      ctx.fillText(`⏱️ ${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`, 300, 25);

      // Player info
      const playerRunner = s.runners.find(r => r.isPlayer);
      if (playerRunner) {
        const pAlive = playerRunner.alive;
        ctx.fillStyle = pAlive ? "#fbbf24" : "#ef4444";
        ctx.font = "bold 13px 'Segoe UI', Arial";
        ctx.fillText(`${playerRunner.emoji} ${playerRunner.name}`, 400, 25);
        if (pAlive) {
          ctx.fillStyle = "#9ca3af";
          ctx.font = "12px Arial";
          ctx.fillText(`HP:${playerRunner.hp}/${playerRunner.maxHp}`, 530, 25);
          if (playerRunner.shield > 0) {
            ctx.fillStyle = "#3b82f6";
            ctx.fillText(`🛡️${playerRunner.shield}`, 610, 25);
          }
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.font = "12px Arial";
          ctx.fillText("ELIMINATED", 530, 25);
        }
      }

      if (gameId) {
        ctx.fillStyle = "#a855f7";
        ctx.font = "10px monospace";
        ctx.fillText(`⛓️ ${gameId}`, W - 120, 25);
      }

      // ── Countdown overlay ──
      if (s.phase === "countdown") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        const sec = Math.ceil((240 - s.gameTime) / 60);
        if (sec > 0) {
          ctx.font = "bold 120px 'Segoe UI', Arial";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(`${sec}`, W / 2, H / 2 + 30);
        }
        ctx.font = "bold 24px 'Segoe UI', Arial";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("Get Ready...", W / 2, H / 2 + 80);
        ctx.textAlign = "left";
      }

      // ── Victory overlay ──
      if (s.phase === "finished") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        if (s.winner) {
          ctx.font = "60px Arial";
          ctx.fillText("🏆", W / 2, H / 2 - 70);
          ctx.font = "bold 42px 'Segoe UI', Arial";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText("LAST ONE STANDING!", W / 2, H / 2 - 15);
          ctx.font = "50px Arial";
          ctx.fillText(s.winner.emoji, W / 2, H / 2 + 50);
          ctx.font = "bold 28px 'Segoe UI', Arial";
          ctx.fillStyle = "#fff";
          ctx.fillText(s.winner.name, W / 2, H / 2 + 90);
          ctx.font = "16px 'Segoe UI', Arial";
          ctx.fillStyle = "#22c55e";
          ctx.fillText(`Distance: ${Math.floor(s.winner.distance / 10)}m`, W / 2, H / 2 + 120);
        } else {
          ctx.font = "bold 38px 'Segoe UI', Arial";
          ctx.fillStyle = "#ef4444";
          ctx.fillText("💀 NO SURVIVORS", W / 2, H / 2);
        }
        ctx.textAlign = "left";
      }
    };

    // Rounded rect helper
    const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPaused(p => !p); };
    window.addEventListener("keydown", onKey);
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("keydown", onKey); };
  }, [init, onGameEnd, gameId]);

  const logColors: Record<string, string> = {
    damage: "text-red-400", item: "text-green-400", death: "text-red-500 font-bold", info: "text-gray-300",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Header */}
      <div className="w-full max-w-[960px] mb-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">← Back</button>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-800 rounded-lg overflow-hidden text-sm">
              {[1, 2, 4].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-3 py-2 transition-all ${speed === s ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                >{s}x</button>
              ))}
            </div>
            <button onClick={() => setPaused(p => !p)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
              {paused ? "▶️" : "⏸️"}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl border-2 border-gray-700/50 shadow-2xl w-full max-w-[960px]" />

      {/* Log */}
      <div className="w-full max-w-[960px] mt-3">
        <div className="bg-gray-800/40 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-sm">📋 Battle Log</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Alive: <span className="text-green-400 font-bold">{hud.alive}</span>/{hud.total}</span>
              <span>⏱️ {Math.floor(hud.time / 60)}:{(hud.time % 60).toString().padStart(2, "0")}</span>
            </div>
          </div>
          <div className="space-y-0.5 max-h-28 overflow-hidden">
            {logDisplay.map((l, i) => (
              <div key={i} className={`text-sm truncate ${logColors[l.type] || "text-gray-400"} ${i > 0 ? "opacity-50" : ""}`}>{l.text}</div>
            ))}
            {logDisplay.length === 0 && <div className="text-gray-600 text-sm">Waiting...</div>}
          </div>
        </div>
      </div>

      {paused && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-4">PAUSED</h2>
            <button onClick={() => setPaused(false)} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">▶️ Resume</button>
          </div>
        </div>
      )}
    </div>
  );
}
