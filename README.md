# ⚔️ Rumble Royale - On-Chain Battle Royale Game

A fully on-chain battle royale survival race game built on **GenLayer blockchain** with MetaMask wallet integration.

![Rumble Royale](https://img.shields.io/badge/GenLayer-Studionet-purple)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan)

## 🎮 How It Works

1. **Connect MetaMask** — Your wallet connects to GenLayer Studionet
2. **Register Username** — Create a unique battle name (one-time, permanent)
3. **Start Race** — Calls `start_game()` on GenLayer contract via MetaMask
4. **Watch the Race** — Runners automatically dodge traps, collect power-ups
5. **Last One Standing** — Results recorded on-chain via `submit_result()`
6. **Leaderboard** — View top players from blockchain

## 🏁 Gameplay

**Side-scrolling Survival Race** with 5 lanes:

- All runners are AI-controlled
- Username displayed above each character
- Your registered name is highlighted in gold ★

### ⚠️ Traps (Red - Avoid!)
| Trap | Emoji | Damage |
|------|-------|--------|
| Spike | 🔺 | 20 |
| Fire | 🔥 | 25 |
| Lightning | ⚡ | 30 |
| Bomb | 💣 | 35 |
| Hole | 🕳️ | 40 |
| Boulder | 🪨 | 15 |

### 💎 Power-ups (Green - Collect!)
| Item | Emoji | Effect |
|------|-------|--------|
| Heal | ❤️ | +20-40 HP |
| Speed | ⚡ | Speed boost 3s |
| Shield | 🛡️ | +30 armor |
| Weapon | ⚔️ | Slight speed up |
| Star | ⭐ | Invincible 5s |
| Magnet | 🧲 | Permanent +speed |

## ⛓️ Smart Contract

**Contract Address:** `0x2c7F41e491B8eBe0c38508D95C1625Bd225e5563`

**Explorer:** [View on GenLayer](https://explorer-studio.genlayer.com/address/0x2c7F41e491B8eBe0c38508D95C1625Bd225e5563)

### Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `register_user(wallet, username)` | Write | One-time username registration |
| `start_game(wallet, player_count, seed)` | Write | Start a new game |
| `submit_result(game_id, wallet, rank, kills, survived, rounds)` | Write | Record game result |
| `get_user(wallet)` | View | Get user info |
| `get_leaderboard()` | View | Get top 50 players |
| `get_player_stats(wallet)` | View | Get player statistics |
| `get_total_games()` | View | Total games played |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | GenLayer (Studionet) |
| Contract | Python (Intelligent Contract) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| SDK | genlayer-js |
| Wallet | MetaMask |

## 🚀 Deploy to Vercel

### Option 1: One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/rumble-royale)

### Option 2: Manual Deploy

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/rumble-royale.git
cd rumble-royale

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev

# 4. Build for production
npm run build

# 5. Deploy to Vercel
npx vercel --prod
```

### Option 3: GitHub + Vercel Auto-deploy

```bash
# 1. Initialize git
git init
git add .
git commit -m "Initial commit - Rumble Royale"

# 2. Create repo on GitHub and push
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rumble-royale.git
git push -u origin main

# 3. Go to vercel.com/new
# 4. Import your GitHub repo
# 5. Framework: Vite (auto-detected)
# 6. Click Deploy - done!
```

## 📁 Project Structure

```
├── contracts/
│   └── rumble_royale.py      # GenLayer Intelligent Contract
├── src/
│   ├── components/
│   │   ├── GameCanvas.tsx    # Main game (Canvas 2D)
│   │   ├── SetupScreen.tsx   # Wallet connect & registration
│   │   ├── WinnerScreen.tsx  # Victory screen + on-chain submit
│   │   ├── LeaderboardScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── lib/
│   │   └── genlayer.ts       # GenLayer SDK integration
│   ├── data/
│   │   └── gameData.ts       # Game constants
│   ├── engine/
│   │   └── gameEngine.ts     # Game logic (legacy)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json
```

## 🔧 Environment

No environment variables needed! The contract address is hardcoded in `src/lib/genlayer.ts`.

To use your own contract:
1. Deploy `contracts/rumble_royale.py` on [studio.genlayer.com](https://studio.genlayer.com)
2. Update `CONTRACT` address in `src/lib/genlayer.ts`

## 📄 License

MIT

---

**Built with ❤️ for GenLayer Hackathon**
