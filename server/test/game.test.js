import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judge } from '../src/matching.js';
import { Room } from '../src/room.js';

test('judge: exact, typo, close and miss', () => {
  assert.equal(judge('Pizza', 'pizza!'), 'match');
  assert.equal(judge('the tacos', 'Taco'), 'match');
  assert.equal(judge('pizzza', 'pizza'), 'match');
  assert.equal(judge('Hoop court', 'Basketball court'), 'close');
  assert.equal(judge('sushi', 'lasagna'), 'miss');
  assert.equal(judge('😂', '😂'), 'match');
  assert.equal(judge('', 'x'), 'miss');
});

function setupRoom() {
  const room = new Room('TEST');
  room.join('host-0001', 'Hana', 's0');
  room.join('play-0001', 'Ali', 's1');
  room.join('play-0002', 'Bea', 's2');
  room.autoPair('host-0001');
  room.updateSettings('host-0001', { mode: 'mixed', rounds: 4 });
  return room;
}

test('full sync + telepathy round flow with host override', () => {
  const room = setupRoom();
  const [team] = room.fullTeams();
  const [a, b] = team.members;
  room.start('host-0001');
  assert.equal(room.state, 'question_active');

  room.submitSync(a, { answer: 'Basketball court', prediction: 'ramen' });
  assert.equal(room.state, 'question_active');
  room.submitSync(b, { answer: 'Ramen', prediction: 'Hoop court' });
  assert.equal(room.state, 'revealing');

  // a predicted b correctly, b's prediction is "close" → 0 until host approves
  assert.equal(room.roundResults()[team.id].points, 1);
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

  // Partner answers stay hidden from each other during active rounds
  room.next('host-0001');
  room.submitSync(a, { answer: 'x', prediction: 'y' });
  assert.equal(room.toView(b).round.submissions, undefined);
  assert.equal(room.toView(b).round.mine, null);

  room.endGame('host-0001');
  assert.equal(room.state, 'game_over');
  room.dispose();
});

test('non-host cannot control the game', () => {
  const room = setupRoom();
  assert.throws(() => room.start('play-0001'), /Only the host/);
  room.dispose();
});
