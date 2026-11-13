# ⚗️ Chemistry

A real-time multiplayer party game for pairs: friends, couples or teammates find out how well they really know each other.

- **💬 Sync mode.** Everyone gets the same prompt. You type **your own answer** and **predict your partner's**. The reveal shows both side by side. Clear matches are scored automatically, and the **host decides close calls** ("Basketball court" vs "Hoop court").
- **🔮 Telepathy mode.** A 3×3 grid appears (emoji, colors, shapes, numbers or words). Without talking, both partners try to pick the same tile before the timer runs out.

Built with **React 18 + Vite + Tailwind CSS v4 + Framer Motion** on the client, and **Node + Express + Socket.io** on the server.

---

## Quick start

Requirements: **Node 18+** (tested on Node 22).

```bash
npm install      # installs root, server and client (npm workspaces)
npm run dev      # starts the game server (:3001) and the Vite client (:5173)
```

Open **http://localhost:5173**, create a room and share the 4-character code or the invite link.

- **Testing alone:** open several browser **tabs**. Each tab is a separate player (identity is kept per tab in `sessionStorage`).
- **Playing on phones:** Vite listens on your LAN. Use the `Network:` URL it prints, for example `http://192.168.1.20:5173`, on any device connected to the same Wi-Fi.

### Production / single port

```bash
npm run build    # builds the client into client/dist
npm start        # Express serves client/dist and Socket.io on one port (PORT env, default 3001)
```

### Tests

```bash
npm test -w server   # room state machine + answer-matching unit tests
```

---

## How to play

1. **Create a room.** You become the **Host** 👑.
2. Players join with the code or link, then **start a team** or **join an open seat** (teams of 2). The host can **auto-pair** free agents, move players between teams or kick them.
3. The host picks the **mode** (Mixed / Sync / Telepathy), the **number of rounds** and the **timers**, then presses **Start**.
   - The host can play on a team or stay off teams and run the game from a shared screen.
   - Incomplete teams spectate.
4. A round ends when everyone has locked in, when the timer expires, or when the host presses **Reveal now**. The host can also **Swap** a prompt they don't like.
5. On the reveal screen, the host can tap ✓/✗ on any guess to override the automatic match. Then the host presses **Confirm & next** to bank the points.
6. After the last round, the final screen shows the winner and each team's **chemistry %** (points earned ÷ points possible).

### Scoring

| Event | Points |
| --- | --- |
| Correct prediction of your partner's answer (each player) | +1 |
| **Jinx**: both partners gave the same answer | +1 |
| Telepathy match: both picked the same tile | +2 |

Automatic matching (`server/src/matching.js`) ignores case, punctuation, accents, articles and plurals. It forgives small typos (`pizzza` = `pizza`). Answers that share a meaningful word or are otherwise similar are marked **close**. A close call scores nothing until the host approves it.

---

## Project structure

```
chemistry-game/
├── package.json              # npm workspaces + `dev` / `build` / `start` scripts
├── server/
│   ├── src/
│   │   ├── index.js          # Express + Socket.io bootstrap; serves client/dist in prod
│   │   ├── sockets.js        # socket event → Room method wiring, per-player broadcasts
│   │   ├── room.js           # ★ authoritative game state machine (teams, rounds, scoring)
│   │   ├── matching.js       # fuzzy answer matching (match / close / miss)
│   │   └── content.js        # prompts, telepathy grids, team names, avatars
│   └── test/game.test.js
└── client/
    ├── vite.config.js        # proxies /socket.io → :3001 in dev
    └── src/
        ├── game.jsx          # socket connection, room store, actions, reconnect logic
        ├── App.jsx           # picks the screen from room state
        ├── components/
        │   ├── ui.jsx        # Button, Avatar, TimerRing, Confetti, PromptCard, …
        │   └── shell.jsx     # Header, Scoreboard, HostBar (host dashboard), TeamProgress
        └── screens/
            ├── Landing.jsx       # name + create / join
            ├── Lobby.jsx         # teams, free agents, host settings
            ├── SyncQuestion.jsx  # answer + prediction form
            ├── SyncReveal.jsx    # side-by-side reveal + host ✓/✗ overrides
            ├── Telepathy.jsx     # grid pick + reveal
            └── GameOver.jsx      # winner, chemistry %, stats
```

### Room states

```
waiting ──start──▶ question_active ──(all locked / timer / host)──▶ revealing ──next──▶ …
                   telepathy_active ─────────────────────────────▶ revealing
                                                         last round ──▶ game_over ──▶ waiting
```

`revealing` is shared by both modes. `round.type` (`'sync'` or `'telepathy'`) tells the client which reveal screen to show.

### Networking model

- The **server is authoritative**. Clients send intents (`sync:submit`, `telepathy:pick`, `host:verdict`, …), and every event gets an `{ ok, error }` acknowledgement.
- After each change the server sends every player a **personalised snapshot** (`room:state`). While a round is active, other players' answers and picks are **left out** of the snapshot, so nobody can read their partner's answer in devtools.
- Timers run on the server. Clients get a `deadline` plus the server time and correct for clock drift.
- **Reconnects:** each tab keeps its player id and room code in `sessionStorage`, so a refresh or a dropped Wi-Fi connection puts you back where you were. If the host is disconnected for more than 20 seconds, host rights pass to the next connected player. Rooms that sit empty for 10 minutes are deleted.

### Adding content

Add prompts to `SYNC_PROMPTS`, or a new grid set to `TELEPATHY_SETS`, in `server/src/content.js`. The server restarts automatically in dev.
