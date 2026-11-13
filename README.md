# Chemistry lab

A real-time multiplayer compatibility test for pairs. Friends, couples or teammates run up to seven experiments and finish with a **lab report**: a certificate showing their compatibility index, bond type and per-test results.

The game is fully bilingual in **English and العربية (Arabic, right-to-left)**. Each player picks their own language, so a mixed group sees every prompt in their own language.

### The experiments

| | Experiment | How it works | Points |
| --- | --- | --- | --- |
| **Sy** | **Sync** | Everyone gets the same prompt. Type **your own answer** and **predict your partner's**. Clear matches are scored automatically. **The host decides close calls** ("Basketball court" vs "Hoop court"). | +1 per correct prediction, +1 if you gave the same answer |
| **Tp** | **Telepathy** | A 3×3 well plate appears (emoji, colors, shapes, numbers or words). Without talking, both partners try to pick the same well. | +2 for the same well |
| **Dc** | **Decision** | A situation with four options (A–D, or أ–د in Arabic). Choose what **you** would do and predict what **your partner** will choose. | +1 per correct prediction, +1 if you chose the same option |
| **Wr** | **Would you rather** | Two hard options ("know a truth that hurts" or "believe a lie that comforts"). Choose one, and predict which your partner chose. | +1 per correct prediction, +1 if you chose the same |
| **Pr** | **Priorities** | Four items to rank from 1 (top priority) to 4. Tap them into a numbered rack in order; nothing starts pre-ranked, so a match is never an accident. | +1 for each item you both put at the same rank (up to 4) |
| **Pt** | **Bare minimum or princess treatment** | The viral debate, couples edition. Five things a partner might do ("Opening the car door for you", "Texting good morning every day"). Call each one *bare minimum* or *princess treatment*; the reveal also shows how the whole room split. | +1 for each statement you called the same way (up to 5) |
| **Fr** | **Bare minimum or princess treatment: friends edition** | The same game for friendship, not romance ("Holding your stuff while you're on a ride", "Picking up your call at 2 a.m."). | +1 for each statement you called the same way (up to 5) |

The treatment editions use their own statement pools (40 each) and ignore question themes.

### Avatars

Each player gets a random avatar and can change it from the lobby (tap **Change avatar** or your own avatar). The catalog in `shared/avatars.js` has ~70 parody avatars in five groups: screen legends, pop stars, movie heroes, anime and lab legends (Keanu Leaves, Hairy Potter, Na-ramen-to, Amr Kebab, Ibn Sina-bon…). They're emoji compositions with pun names, not likenesses or official artwork. One avatar per person per session.

### Question themes

The host picks which **themes** the questions come from (any combination). Every experiment has questions in every theme:

| Theme | What it covers | Examples |
| --- | --- | --- |
| **Light** | Everyday, playful questions | "Your go-to comfort food?", "Live by the sea or in the mountains?" |
| **Deep** | Philosophy, meaning, identity and values | "In one word, what makes a life well lived?", the trolley problem, "Be wise but unhappy, or happy but naïve?" |
| **Bonds** | Relationships, trust and feelings | "What breaks trust fastest?", "Rank what is hardest to forgive" |

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
npm test -w server   # state machine (all seven experiments), avatars, themes, Arabic + English matching, content checks
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
3. The host sets the **test protocol**: which experiments to run, which **question themes** to draw from (Light, Deep, Bonds, in any combination), the number of rounds and each experiment's time limit. Then they press **Start testing**. Rounds cycle through the selected experiments.
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
├── shared/avatars.js         # avatar catalog, imported by server and client
├── server/
│   ├── src/
│   │   ├── index.js          # Express + Socket.io bootstrap; serves client/dist in prod
│   │   ├── sockets.js        # socket event → Room method wiring, per-player broadcasts
│   │   ├── room.js           # ★ authoritative state machine (pairs, rounds, scoring)
│   │   ├── matching.js       # fuzzy answer matching, English + Arabic
│   │   └── content.js        # bilingual question bank, tagged by theme (light / deep / bonds)
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
        │   ├── AvatarPicker.jsx # avatar sheet, grouped by category
        │   └── BondScale.jsx # indicator strip with bond labels
        └── screens/
            ├── Landing.jsx       # intake form, experiments, how results are read
            ├── Lobby.jsx         # pairs, test protocol
            ├── SyncQuestion.jsx  # answer + prediction
            ├── SyncReveal.jsx    # side-by-side results + host ✓/✗
            ├── Telepathy.jsx     # well plate pick + reveal
            ├── Decision.jsx      # A–D situation pick + reveal
            ├── Priority.jsx      # 1–4 ranking rack + side-by-side reveal
            ├── Rather.jsx        # would-you-rather versus cards + reveal
            ├── Treatment.jsx     # bare minimum / princess treatment calls + reveal
            └── GameOver.jsx      # lab report / certificate
```

### Room states

```
waiting ──start──▶ question_active  (Sync)      ──┐
                   telepathy_active (Telepathy) ──┼─(all locked / timer / host)─▶ revealing ──next──▶ …
                   decision_active  (Decision)  ──┤
                   priority_active  (Priorities)──┤
                   rather_active    (Would you rather)──┤
                   treatment_active (Princess treatment, either edition)┘
                                                          last round ──▶ game_over ──▶ waiting
```

`revealing` is shared by all seven experiments. `round.type` (`'sync'`, `'telepathy'`, `'decision'`, `'priority'`, `'rather'`, `'princess'` or `'bestie'`) tells the client which reveal screen to show.

### Networking model

- The **server is authoritative**. Clients send intents (`sync:submit`, `decision:submit` (also used by Would you rather), `priority:submit`, `treatment:submit`, `player:avatar`, `telepathy:pick`, `host:verdict`, …), and every event gets an `{ ok, code }` acknowledgement.
- Error `code`s are language-neutral and are translated on the client (`errors.*` in `i18n.jsx`).
- Content is sent as `{ en, ar }` pairs, and each client shows its own language.
- After each change, every player receives a **personalised snapshot** (`room:state`). While a round is active, other players' answers and picks are **left out** of the snapshot.
- Timers run on the server. Clients receive a `deadline` plus the server time and correct for clock drift.
- **Reconnects:** a refresh or a dropped Wi-Fi connection puts the player back where they were. If the host is disconnected for more than 20 seconds, host rights pass to another player. Rooms that sit empty for 10 minutes are deleted.

### Adding content

The question bank lives in `server/src/content.js`. Every entry needs both `en` and `ar` and belongs to a theme (`light`, `deep` or `bonds`); the tests check this. UI copy lives in `client/src/i18n.jsx`.
