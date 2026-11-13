import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECISIONS, PRIORITIES, RATHERS, SYNC_PROMPTS, THEMES } from '../src/content.js';
import { judge } from '../src/matching.js';
import { Room } from '../src/room.js';

test('judge: English exact, typo, close and miss', () => {
  assert.equal(judge('Pizza', 'pizza!'), 'match');
  assert.equal(judge('the tacos', 'Taco'), 'match');
  assert.equal(judge('pizzza', 'pizza'), 'match');
  assert.equal(judge('Hoop court', 'Basketball court'), 'close');
  assert.equal(judge('sushi', 'lasagna'), 'miss');
  assert.equal(judge('😂', '😂'), 'match');
  assert.equal(judge('', 'x'), 'miss');
});

test('judge: Arabic spelling variants', () => {
  assert.equal(judge('البيتزا', 'بيتزا'), 'match'); // definite article
  assert.equal(judge('قهوة', 'القهوه'), 'match'); // taa marbuta
  assert.equal(judge('أسد', 'اسد'), 'match'); // hamza on alef
  assert.equal(judge('مَدرسة', 'مدرسه'), 'match'); // diacritics
  assert.equal(judge('٧', '7'), 'match'); // Eastern Arabic digits
  assert.equal(judge('قطة', 'كلب'), 'miss');
});

test('content: every prompt and choice is bilingual and themed', () => {
  for (const list of [SYNC_PROMPTS, DECISIONS, PRIORITIES, RATHERS]) {
    for (const entry of list) assert.ok(THEMES.includes(entry.theme), JSON.stringify(entry.text));
    // every experiment has questions in every theme
    for (const theme of THEMES) assert.ok(list.some((e) => e.theme === theme), theme);
  }
  for (const r of RATHERS) {
    assert.equal(r.choices.length, 2);
    for (const c of r.choices) assert.ok(c.en && c.ar);
  }
  for (const p of SYNC_PROMPTS) assert.ok(p.text.en && p.text.ar, JSON.stringify(p));
  for (const d of DECISIONS) {
    assert.ok(d.text.en && d.text.ar);
    assert.equal(d.choices.length, 4);
    for (const c of d.choices) assert.ok(c.en && c.ar);
  }
  for (const p of PRIORITIES) {
    assert.ok(p.text.en && p.text.ar);
    assert.equal(p.items.length, 4);
    for (const i of p.items) assert.ok(i.en && i.ar);
  }
});

function setupRoom(tests = ['sync', 'telepathy', 'decision']) {
  const room = new Room('TEST');
  room.join('host-0001', 'Hana', 's0');
  room.join('play-0001', 'Ali', 's1');
  room.join('play-0002', 'Bea', 's2');
  room.autoPair('host-0001');
  room.updateSettings('host-0001', { tests, rounds: 6 });
  return room;
}

test('full sync → telepathy → decision flow with host override', () => {
  const room = setupRoom();
  const [team] = room.fullTeams();
  const [a, b] = team.members;
  room.start('host-0001');
  assert.deepEqual(room.plan, ['sync', 'telepathy', 'decision', 'sync', 'telepathy', 'decision']);
  assert.equal(room.state, 'question_active');

  room.submitSync(a, { answer: 'Basketball court', prediction: 'ramen' });
  assert.equal(room.state, 'question_active');
  room.submitSync(b, { answer: 'Ramen', prediction: 'Hoop court' });
  assert.equal(room.state, 'revealing');
  assert.equal(room.roundResults()[team.id].points, 1); // "close" scores 0 until approved
  room.setVerdict('host-0001', `pred:${b}`, 'match');
  assert.equal(room.roundResults()[team.id].points, 2);
  room.next('host-0001');
  assert.equal(team.score, 2);

  assert.equal(room.state, 'telepathy_active');
  room.pickTile(a, 4);
  room.pickTile(b, 4);
  room.lockTile(a);
  room.lockTile(b);
  assert.equal(room.state, 'revealing');
  assert.equal(room.roundResults()[team.id].points, 2);
  room.next('host-0001');

  assert.equal(room.state, 'decision_active');
  assert.equal(room.toView(a).round.choices.length, 4);
  room.submitDecision(a, { choice: 1, prediction: 1 });
  // Partner can't see a's pick before the reveal
  assert.equal(room.toView(b).round.submissions, undefined);
  assert.equal(room.toView(b).round.mine, null);
  assert.throws(() => room.submitDecision(b, { choice: 9, prediction: 0 }), /pick_both/);
  room.submitDecision(b, { choice: 1, prediction: 2 });
  assert.equal(room.state, 'revealing');
  // a predicted b (1 = 1 ✓), b predicted a (2 ≠ 1 ✗), same choice ✓ → 2
  assert.deepEqual(room.roundResults()[team.id], { points: 2, max: 3, predictionsCorrect: 1, same: true });
  room.next('host-0001');
  assert.equal(team.score, 6);

  room.endGame('host-0001');
  assert.equal(room.state, 'game_over');
  room.dispose();
});

test('settings: tests must be a non-empty subset', () => {
  const room = setupRoom(['decision']);
  assert.deepEqual(room.settings.tests, ['decision']);
  assert.throws(() => room.updateSettings('host-0001', { tests: [] }), /need_one_test/);
  room.start('host-0001');
  assert.equal(room.state, 'decision_active');
  room.dispose();
});

test('non-host cannot control the game; pairs get element ids', () => {
  const room = setupRoom();
  assert.throws(() => room.start('play-0001'), /host_only/);
  const [team] = room.fullTeams();
  assert.ok(Number.isInteger(team.element));
  assert.equal(team.name, null);
  room.renameTeam('play-0001', team.id, 'Bond Squad');
  assert.equal(room.teams.get(team.id).name, 'Bond Squad');
  room.dispose();
});

test('priorities: each item at the same rank scores a point', () => {
  const room = setupRoom(['priority']);
  const [team] = room.fullTeams();
  const [a, b] = team.members;
  room.start('host-0001');
  assert.equal(room.state, 'priority_active');
  assert.equal(room.toView(a).round.items.length, 4);

  // Invalid rankings are rejected: duplicates, wrong length, out of range
  assert.throws(() => room.submitPriority(a, { order: [0, 0, 1, 2] }), /rank_all/);
  assert.throws(() => room.submitPriority(a, { order: [0, 1, 2] }), /rank_all/);
  assert.throws(() => room.submitPriority(a, { order: [0, 1, 2, 7] }), /rank_all/);

  room.submitPriority(a, { order: [2, 0, 3, 1] });
  assert.equal(room.toView(b).round.submissions, undefined); // hidden until reveal
  room.submitPriority(b, { order: [2, 3, 0, 1] }); // ranks 1 and 4 agree
  assert.equal(room.state, 'revealing');
  assert.deepEqual(room.roundResults()[team.id], { points: 2, max: 4, sameRanks: 2 });
  room.next('host-0001');
  assert.equal(team.score, 2);
  room.dispose();
});

test('settings: all four experiments cycle in order', () => {
  const room = setupRoom(['sync', 'telepathy', 'decision', 'priority']);
  room.start('host-0001');
  assert.deepEqual(room.plan, ['sync', 'telepathy', 'decision', 'priority', 'sync', 'telepathy']);
  room.dispose();
});

test('would you rather: two options, predict + same choice', () => {
  const room = setupRoom(['rather']);
  const [team] = room.fullTeams();
  const [a, b] = team.members;
  room.start('host-0001');
  assert.equal(room.state, 'rather_active');
  assert.equal(room.toView(a).round.choices.length, 2);
  assert.throws(() => room.submitDecision(a, { choice: 2, prediction: 0 }), /pick_both/);
  room.submitDecision(a, { choice: 0, prediction: 1 });
  room.submitDecision(b, { choice: 1, prediction: 0 });
  assert.equal(room.state, 'revealing');
  // both predicted correctly, different choices → 2
  assert.deepEqual(room.roundResults()[team.id], { points: 2, max: 3, predictionsCorrect: 2, same: false });
  room.dispose();
});

test('themes: rounds only draw questions from the selected themes', () => {
  const room = setupRoom(['sync', 'decision', 'priority', 'rather']);
  room.updateSettings('host-0001', { themes: ['deep'], rounds: 12 });
  assert.throws(() => room.updateSettings('host-0001', { themes: [] }), /need_one_theme/);
  room.start('host-0001');
  const [team] = room.fullTeams();
  for (let i = 0; i < 12; i++) {
    assert.equal(room.round.prompt.theme ?? room.round.theme, 'deep', `round ${i + 1}: ${room.round.type}`);
    room.reveal('host-0001');
    room.next('host-0001');
  }
  assert.equal(room.state, 'game_over');
  assert.ok(team);
  room.dispose();
});
