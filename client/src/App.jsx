/**
 * Top-level router: picks the screen from the server-driven room state.
 *
 *   no room          → Landing
 *   waiting          → Lobby
 *   question_active  → SyncQuestion
 *   telepathy_active → TelepathyActive
 *   decision_active  → DecisionActive
 *   priority_active  → PriorityActive
 *   rather_active    → RatherActive
 *   revealing        → Sync / Telepathy / Decision / Priority reveal (by round type)
 *   game_over        → GameOver
 */

import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Header, HostBar, Scoreboard } from './components/shell.jsx';
import { Toasts, cx } from './components/ui.jsx';
import { FrozenWhenExiting, useGame } from './game.jsx';
import { DecisionActive, DecisionReveal } from './screens/Decision.jsx';
import GameOver from './screens/GameOver.jsx';
import Landing from './screens/Landing.jsx';
import Lobby from './screens/Lobby.jsx';
import { PriorityActive, PriorityReveal } from './screens/Priority.jsx';
import { RatherActive, RatherReveal } from './screens/Rather.jsx';
import SyncQuestion from './screens/SyncQuestion.jsx';
import SyncReveal from './screens/SyncReveal.jsx';
import { TelepathyActive, TelepathyReveal } from './screens/Telepathy.jsx';

function CurrentScreen() {
  const { view } = useGame();
  const key = `${view.state}-${view.round?.number ?? 0}-${view.round?.deadline ?? 0}`;
  // Every new screen (next round, reveal, report) starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [key]);
  let screen;
  switch (view.state) {
    case 'waiting':
      screen = <Lobby />;
      break;
    case 'question_active':
      screen = <SyncQuestion />;
      break;
    case 'telepathy_active':
      screen = <TelepathyActive />;
      break;
    case 'decision_active':
      screen = <DecisionActive />;
      break;
    case 'priority_active':
      screen = <PriorityActive />;
      break;
    case 'rather_active':
      screen = <RatherActive />;
      break;
    case 'revealing':
      screen =
        {
          sync: <SyncReveal />,
          telepathy: <TelepathyReveal />,
          decision: <DecisionReveal />,
          priority: <PriorityReveal />,
          rather: <RatherReveal />,
        }[view.round?.type] ?? null;
      break;
    case 'game_over':
      screen = <GameOver />;
      break;
    default:
      screen = null;
  }
  return (
    <AnimatePresence mode="wait">
      <FrozenWhenExiting key={key}>{screen}</FrozenWhenExiting>
    </AnimatePresence>
  );
}

function GameLayout() {
  const { view, isHost } = useGame();
  const inGame = view.state !== 'waiting' && view.state !== 'game_over';
  const showHostBar = isHost && view.state !== 'waiting';

  return (
    <div className={cx('min-h-dvh', showHostBar ? 'pb-32' : 'pb-10')}>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
        {inGame ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="lg:hidden">
              <Scoreboard compact />
            </div>
            <div className="min-w-0">
              <CurrentScreen />
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-5">
                <Scoreboard />
              </div>
            </aside>
          </div>
        ) : (
          <CurrentScreen />
        )}
      </main>
      {showHostBar ? <HostBar /> : null}
    </div>
  );
}

export default function App() {
  const { view } = useGame();
  return (
    <>
      <AnimatePresence mode="wait">
        {view ? (
          <FrozenWhenExiting key="game">
            <GameLayout />
          </FrozenWhenExiting>
        ) : (
          <Landing key="landing" />
        )}
      </AnimatePresence>
      <Toasts />
    </>
  );
}
