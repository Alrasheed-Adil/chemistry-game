# Chemistry lab

A real-time multiplayer compatibility test for pairs. Friends, couples or teammates run four experiments and finish with a **lab report**: a certificate showing their compatibility index, bond type and per-test results.

The game is fully bilingual in **English and العربية (Arabic, right-to-left)**. Each player picks their own language, so a mixed group sees every prompt in their own language.

### The experiments

| | Experiment | How it works | Points |
| --- | --- | --- | --- |
| **Sy** | **Sync** | Everyone gets the same prompt. Type **your own answer** and **predict your partner's**. Clear matches are scored automatically. **The host decides close calls** ("Basketball court" vs "Hoop court"). | +1 per correct prediction, +1 if you gave the same answer |
| **Tp** | **Telepathy** | A 3×3 well plate appears (emoji, colors, shapes, numbers or words). Without talking, both partners try to pick the same well. | +2 for the same well |
| **Dc** | **Decision** | A situation with four options (A–D, or أ–د in Arabic). Choose what **you** would do and predict what **your partner** will choose. | +1 per correct prediction, +1 if you chose the same option |
| **Pr** | **Priorities** | Four items to rank from 1 (top priority) to 4. Tap them into a numbered rack in order; nothing starts pre-ranked, so a match is never an accident. | +1 for each item you both put at the same rank (up to 4) |

The lab report turns each pair's score into a **compatibility index**: points earned out of points possible. The index is shown on a universal-indicator strip and classified as a bond:

| Index | Bond type |
| --- | --- |
| 85%+ | Covalent bond: you share almost everything |
| 65–84% | Ionic bond: a strong pull, even where you differ |
| 45–64% | Hydrogen bond: steady, with room to grow |
| 25–44% | Van der Waals forces: a faint attraction |
| below 25% | Noble gases: no reaction yet |

Built with **React 18, Vite, Tailwind CSS v4 and Framer Motion** on the client, and **Node, Express and Socket.io** on the server.

---

## Quick start

Requirements: **Node 20+** (tested on Node 22).

```bash
npm install      # installs root, server and client (npm workspaces)
npm run dev      # game server on :3001 + Vite client on :5173
```

Open **http://localhost:5173**, start a session and share the 4-character code or the invite link.

- **Testing alone:** open several browser **tabs**. Each tab is a separate player. The player identity is stored per tab in `sessionStorage`; the language choice is shared across tabs in `localStorage`.
- **Playing on phones:** use the `Network:` URL that Vite prints, on any device connected to the same Wi-Fi.

### Production / single port

```bash
npm run build    # builds the client into client/dist
npm start        # Express serves client/dist + Socket.io on one port (PORT env, default 3001)
```

### Tests

```bash
npm test -w server   # state machine (all four experiments), Arabic + English matching, content checks
```

### Deploy to Render

The repo includes a [Render Blueprint](render.yaml). It sets up one Node web service: Express serves the built client and Socket.io on the same port, and Render supports WebSockets out of the box.

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. Render reads `render.yaml` and creates the `chemistry-game` service.
   - Doing it by hand instead? Create a **Web Service** with runtime **Node**, build command `npm ci --include=dev && npm run build`, start command `npm start`, and health check path `/health`.
3. Open the `https://<service>.onrender.com` URL. Invite links use whatever domain the game is served from, so they work automatically.

Things to know:

- **Run a single instance.** Rooms live in server memory. With more than one instance, players in the same session could land on different servers. Scaling out would need a shared store such as Redis plus the Socket.io Redis adapter.
- **Every deploy or restart ends sessions in progress**, because the in-memory state is wiped.
- **The free plan sleeps after about 15 minutes with no traffic.** The first visit after that takes 30–60 seconds to wake the service.

---

## How to play

1. **Start a session.** You become the **host**.
2. Players join with the code or link, then **start a pair** or **join an open seat**. Each pair is labelled with a chemical element in its flame-test color (Sodium, Copper, Lithium, …), and players can rename their pair. The host can **pair everyone randomly**, move players between pairs or remove them.
3. The host sets the **test protocol**: which experiments to run (any combination), the number of rounds and each experiment's time limit. Then they press **Start testing**. Rounds cycle through the selected experiments.
   - The host can play in a pair or stay out and run the session from a shared screen.
   - Incomplete pairs watch.
4. A round ends when everyone has locked in, when the timer runs out, or when the host presses **Reveal now**. The host can also swap the prompt with **New prompt**.
5. In Sync reveals, the host can tap ✓/✗ on any prediction to override the automatic match. Then the host presses **Confirm and continue** to bank the points.
6. After the last round, everyone gets the **lab report**.

### Answer matching

`server/src/matching.js` ignores case, punctuation, accents, articles and plurals, and forgives small typos (`pizzza` = `pizza`). For Arabic it also strips diacritics and the definite article ال, and treats these spellings as equal: أ/إ/آ → ا, ة → ه, ى → ي. It converts Eastern Arabic digits to Western ones, so `البيتزا` = `بيتزا` and `قهوة` = `القهوه`. Similar answers are marked **inconclusive**, and an inconclusive answer scores nothing until the host accepts it. Answers in different languages fall to the host to judge.

---

## Design

The interface is designed to look like a clinical lab, not a party app:

- **Palette:** a pale borosilicate-glass background (`#EAF0EF`) with a faint hexagonal molecule lattice, white work surfaces, and blue-black notebook ink (`#13233A`) for text and primary actions. Color with meaning comes from the **universal-indicator spectrum** (acid red → amber → green → blue), used only for results.
- **Identity:** pairs and experiments are **periodic-table tiles**. Pair colors are real **flame-test colors**.
- **Type:** **Readex Pro** is used for both Latin and Arabic. It is derived from Lexend, a typeface designed from reading-proficiency research. Letter-spacing is turned off and line-height raised for Arabic text.
- **Instruments:**
  - The timer is a graduated **burette** that drains.
  - Telepathy is a **well plate** with A–C / 1–3 coordinates.
  - Locked answers show a sealed **vial**.
  - Matches fizz with **bubbles**.
- **The one bold moment:** the lab report, with a certificate, bond classification, indicator reading and a stamp that lands once.

The layout mirrors automatically for Arabic: it uses logical CSS properties (`ms-`, `ps-`, `start-`), and `<html dir>` follows the selected language. Motion respects `prefers-reduced-motion`.

---

## Project structure

```
chemistry-game/
├── package.json              # npm workspaces + dev / build / start scripts
├── render.yaml               # Render Blueprint (single Node web service)
├── server/
│   ├── src/
│   │   ├── index.js          # Express + Socket.io bootstrap; serves client/dist in prod
│   │   ├── sockets.js        # socket event → Room method wiring, per-player broadcasts
│   │   ├── room.js           # ★ authoritative state machine (pairs, rounds, scoring)
│   │   ├── matching.js       # fuzzy answer matching, English + Arabic
│   │   └── content.js        # bilingual prompts, decisions, rankings, well plates
│   └── test/game.test.js
└── client/
    ├── vite.config.js        # proxies /socket.io → :3001 in dev
    └── src/
        ├── i18n.jsx          # EN/AR dictionaries, RTL, elements, bond classification
        ├── game.jsx          # socket connection, room store, actions, reconnect logic
        ├── App.jsx           # picks the screen from room state
        ├── index.css         # design tokens (Tailwind v4 @theme)
        ├── components/
        │   ├── ui.jsx        # Button, ElementTile, Burette, IndicatorStrip, Bubbles, PromptCard…
        │   ├── shell.jsx     # Header, Readings scoreboard, Host controls, lock-in progress
        │   └── BondScale.jsx # indicator strip with bond labels
        └── screens/
            ├── Landing.jsx       # intake form, experiments, how results are read
            ├── Lobby.jsx         # pairs, test protocol
            ├── SyncQuestion.jsx  # answer + prediction
            ├── SyncReveal.jsx    # side-by-side results + host ✓/✗
            ├── Telepathy.jsx     # well plate pick + reveal
            ├── Decision.jsx      # A–D situation pick + reveal
            ├── Priority.jsx      # 1–4 ranking rack + side-by-side reveal
            └── GameOver.jsx      # lab report / certificate
```

### Room states

```
waiting ──start──▶ question_active  (Sync)      ──┐
                   telepathy_active (Telepathy) ──┼─(all locked / timer / host)─▶ revealing ──next──▶ …
                   decision_active  (Decision)  ──┤
                   priority_active  (Priorities)──┘
                                                          last round ──▶ game_over ──▶ waiting
```

`revealing` is shared by all four experiments. `round.type` (`'sync'`, `'telepathy'`, `'decision'` or `'priority'`) tells the client which reveal screen to show.

### Networking model

- The **server is authoritative**. Clients send intents (`sync:submit`, `decision:submit`, `priority:submit`, `telepathy:pick`, `host:verdict`, …), and every event gets an `{ ok, code }` acknowledgement.
- Error `code`s are language-neutral and are translated on the client (`errors.*` in `i18n.jsx`).
- Content is sent as `{ en, ar }` pairs, and each client shows its own language.
- After each change, every player receives a **personalised snapshot** (`room:state`). While a round is active, other players' answers and picks are **left out** of the snapshot.
- Timers run on the server. Clients receive a `deadline` plus the server time and correct for clock drift.
- **Reconnects:** a refresh or a dropped Wi-Fi connection puts the player back where they were. If the host is disconnected for more than 20 seconds, host rights pass to another player. Rooms that sit empty for 10 minutes are deleted.

### Adding content

Prompts, decisions, rankings and well plates live in `server/src/content.js`, and every entry needs both `en` and `ar`; the tests check this. UI copy lives in `client/src/i18n.jsx`.
