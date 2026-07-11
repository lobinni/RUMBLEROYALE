# { "Depends": "py-genlayer:test" }
from genlayer import *
import json
from typing import Any, Dict


class RumbleRoyale(gl.Contract):
    data_json: str

    def __init__(self) -> None:
        self.data_json = json.dumps(
            {
                "users": {},
                "games": {},
                "leaderboard": [],
                "players": {},
                "total_games": 0,
            },
            separators=(",", ":"),
        )

    # ── internal helpers ──

    def _load(self) -> Dict[str, Any]:
        return json.loads(self.data_json or "{}")

    def _save(self, data: Dict[str, Any]) -> None:
        self.data_json = json.dumps(data, separators=(",", ":"))

    def _addr(self, w: str) -> str:
        return str(w or "").strip().lower()

    def _hash(self, seed: str) -> str:
        h = 0
        for c in seed:
            h = ((h * 131) + ord(c)) & 0xFFFFFFFFFFFFFFFF
        o = ""
        for _ in range(64):
            h = (
                (h * 6364136223846793005) + 1442695040888963407
            ) & 0xFFFFFFFFFFFFFFFF
            o += "0123456789abcdef"[(h >> 60) & 0xF]
        return o

    # ── user registration ──

    @gl.public.write
    def register_user(self, wallet: str, username: str) -> str:
        d = self._load()
        a = self._addr(wallet)
        users = d.get("users", {})

        # Check if wallet already registered
        assert a not in users, "Wallet already registered"

        # Validate username
        nm = str(username or "").strip()[:20]
        assert len(nm) >= 3, "Username must be at least 3 characters"

        # Check if username already taken
        for addr, user in users.items():
            if user.get("username", "").lower() == nm.lower():
                assert False, "Username already taken"

        # Register user
        users[a] = {
            "username": nm,
            "registered_at": d.get("total_games", 0),
        }
        d["users"] = users

        # Initialize player stats
        players = d.get("players", {})
        if a not in players:
            players[a] = {
                "username": nm,
                "games_played": 0,
                "total_kills": 0,
                "wins": 0,
                "best_rank": 999,
            }
        d["players"] = players

        self._save(d)
        return json.dumps({"success": True, "username": nm})

    @gl.public.view
    def get_user(self, wallet: str) -> str:
        d = self._load()
        a = self._addr(wallet)
        users = d.get("users", {})
        if a in users:
            return json.dumps(users[a])
        return json.dumps({})

    @gl.public.view
    def is_username_taken(self, username: str) -> str:
        d = self._load()
        nm = str(username or "").strip().lower()
        users = d.get("users", {})
        for addr, user in users.items():
            if user.get("username", "").lower() == nm:
                return json.dumps({"taken": True})
        return json.dumps({"taken": False})

    # ── write methods ──

    @gl.public.write
    def start_game(
        self, wallet: str, player_count: int, seed: str
    ) -> str:
        d = self._load()
        a = self._addr(wallet)

        # Check if user is registered
        users = d.get("users", {})
        assert a in users, "User not registered"

        username = users[a].get("username", "Unknown")

        c = d.get("total_games", 0) + 1
        d["total_games"] = c
        gid = "game_" + str(c)

        game = {
            "game_id": gid,
            "player_count": player_count,
            "seed_hash": self._hash(seed + "_" + gid),
            "phase": "playing",
            "player_address": a,
            "player_name": username,
        }

        games = d.get("games", {})
        games[gid] = game
        d["games"] = games

        self._save(d)
        return json.dumps(game)

    @gl.public.write
    def submit_result(
        self,
        game_id: str,
        wallet: str,
        rank: int,
        kills: int,
        survived: int,
        total_rounds: int,
    ) -> str:
        d = self._load()
        games = d.get("games", {})

        assert game_id in games, "Game not found"
        game = games[game_id]
        assert game.get("phase") == "playing", "Already completed"

        game["phase"] = "completed"
        game["rank"] = rank
        game["kills"] = kills
        game["survived"] = survived
        game["total_rounds"] = total_rounds
        games[game_id] = game
        d["games"] = games

        a = self._addr(wallet)
        players = d.get("players", {})
        if a in players:
            p = players[a]
            p["games_played"] = p.get("games_played", 0) + 1
            p["total_kills"] = p.get("total_kills", 0) + kills
            if survived == 1:
                p["wins"] = p.get("wins", 0) + 1
            if rank < p.get("best_rank", 999):
                p["best_rank"] = rank
            players[a] = p
            d["players"] = players

        lb = d.get("leaderboard", [])

        existing_idx = None
        for i, entry in enumerate(lb):
            if entry.get("address") == a:
                existing_idx = i
                break

        player_entry = {
            "player": game["player_name"],
            "address": a,
            "wins": players[a]["wins"] if a in players else 0,
            "kills": players[a]["total_kills"] if a in players else 0,
            "games": players[a]["games_played"] if a in players else 0,
            "best_rank": players[a]["best_rank"] if a in players else rank,
        }

        if existing_idx is not None:
            lb[existing_idx] = player_entry
        else:
            lb.append(player_entry)

        lb = sorted(
            lb,
            key=lambda x: (x.get("wins", 0), x.get("kills", 0)),
            reverse=True,
        )[:50]
        d["leaderboard"] = lb

        self._save(d)
        return json.dumps({
            "rank": rank,
            "kills": kills,
            "survived": survived,
            "total_rounds": total_rounds,
        })

    # ── view methods ──

    @gl.public.view
    def get_leaderboard(self) -> str:
        d = self._load()
        return json.dumps(d.get("leaderboard", []))

    @gl.public.view
    def get_player_stats(self, wallet: str) -> str:
        d = self._load()
        a = self._addr(wallet)
        players = d.get("players", {})
        if a in players:
            return json.dumps(players[a])
        return json.dumps({
            "games_played": 0,
            "total_kills": 0,
            "wins": 0,
            "best_rank": 999,
        })

    @gl.public.view
    def get_total_games(self) -> int:
        d = self._load()
        return d.get("total_games", 0)

    @gl.public.view
    def get_game(self, game_id: str) -> str:
        d = self._load()
        games = d.get("games", {})
        if game_id in games:
            return json.dumps(games[game_id])
        return json.dumps({})
