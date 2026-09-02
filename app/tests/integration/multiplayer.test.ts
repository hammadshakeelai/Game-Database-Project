import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Socket as ClientSocket } from 'socket.io-client';
import {
  createTestUser,
  emitAck,
  expectNoEvent,
  startHarness,
  waitFor,
  type AckErr,
  type AckOk,
  type Harness,
  type MatchView,
  type TestUser,
} from './harness.js';

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
});

afterAll(async () => {
  await harness.close();
});

/** Create a pvp room hosted by `host` and joined by `guest`. */
async function makeGame(host: ClientSocket, guest: ClientSocket) {
  const created = (await emitAck<AckOk>(host, 'create_match', { mode: 'pvp' })).match;
  const joined = await emitAck<AckOk | AckErr>(guest, 'join_match', { matchId: created.id });
  expect(joined.ok).toBe(true);
  return { matchId: created.id, guestView: (joined as AckOk).match };
}

describe('handshake authentication', () => {
  it('rejects a connection with no token', async () => {
    await expect(harness.connectRaw({})).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it('rejects a forged token', async () => {
    await expect(harness.connectRaw({ token: 'not.a.real.token' })).rejects.toThrow(/AUTH_INVALID/);
  });

  it('accepts a token minted by the Auth emulator', async () => {
    const user = await createTestUser('Ada');
    const socket = await harness.connect(user);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it('binds the connection to the token holder, not to any claimed id', async () => {
    // The client sends no uid at all, and cannot: the server derives it.
    const alice = await createTestUser('Alice');
    const socket = await harness.connect(alice);
    const created = (await emitAck<AckOk>(socket, 'create_match', { mode: 'pvp' })).match;
    expect(created.players.X!.uid).toBe(alice.uid);
    expect(created.role).toBe('X');
    socket.disconnect();
  });
});

describe('rooms', () => {
  let alice: TestUser;
  let bob: TestUser;
  let a: ClientSocket;
  let b: ClientSocket;

  beforeAll(async () => {
    alice = await createTestUser('Alice');
    bob = await createTestUser('Bob');
    a = await harness.connect(alice);
    b = await harness.connect(bob);
  });

  it('creates a room with a shareable code and seats the host as X', async () => {
    const { match } = await emitAck<AckOk>(a, 'create_match', { mode: 'pvp' });
    expect(match.id).toMatch(/^[A-Z2-9]{6}$/);
    expect(match.status).toBe('waiting');
    expect(match.players.X!.uid).toBe(alice.uid);
    expect(match.players.O).toBeNull();
  });

  it('rejects an unknown room code instead of silently creating one', async () => {
    const res = await emitAck<AckErr>(b, 'join_match', { matchId: 'ZZZZZZ' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('ROOM_NOT_FOUND');
  });

  it('accepts a room code typed in lower case', async () => {
    const { match } = await emitAck<AckOk>(a, 'create_match', { mode: 'pvp' });
    const res = await emitAck<AckOk>(b, 'join_match', { matchId: match.id.toLowerCase() });
    expect(res.ok).toBe(true);
    expect(res.match.role).toBe('O');
  });

  it('starts the game once both seats are filled', async () => {
    const { match } = await emitAck<AckOk>(a, 'create_match', { mode: 'pvp' });
    const joined = await emitAck<AckOk>(b, 'join_match', { matchId: match.id });
    expect(joined.match.status).toBe('active');
    expect(joined.match.players.X!.uid).toBe(alice.uid);
    expect(joined.match.players.O!.uid).toBe(bob.uid);
  });

  it('refuses a third player as ROOM_FULL', async () => {
    const carol = await createTestUser('Carol');
    const c = await harness.connect(carol);
    const { matchId } = await makeGame(a, b);

    const res = await emitAck<AckErr>(c, 'join_match', { matchId });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('ROOM_FULL');
    c.disconnect();
  });

  it('treats a re-join by the same player as a reconnect, keeping their seat', async () => {
    const { matchId } = await makeGame(a, b);
    const again = await emitAck<AckOk>(a, 'join_match', { matchId });
    expect(again.match.role).toBe('X');
    expect(again.match.players.X!.uid).toBe(alice.uid);
  });

  it('accepts every later action for a room joined via a lower-case link', async () => {
    // An invite URL can be shared in any casing. Joining used to normalise but
    // subsequent actions did not, so a lower-case link joined fine and then
    // failed on the first move with "this game no longer exists".
    const { match } = await emitAck<AckOk>(a, 'create_match', { mode: 'pvp' });
    const lower = match.id.toLowerCase();
    const joined = await emitAck<AckOk>(b, 'join_match', { matchId: lower });
    expect(joined.ok).toBe(true);

    const seen = waitFor<{ move: { player: string } }>(b, 'move_made');
    a.emit('make_move', { matchId: match.id.toLowerCase(), superGridIndex: 4, subGridIndex: 4 });
    expect((await seen).move.player).toBe('X');
  });

  it('rejects a malformed join payload', async () => {
    const res = await emitAck<AckErr>(b, 'join_match', { matchId: 42 });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_REQUEST');
  });
});

describe('moves', () => {
  let a: ClientSocket;
  let b: ClientSocket;

  beforeAll(async () => {
    a = await harness.connect(await createTestUser('Mover A'));
    b = await harness.connect(await createTestUser('Mover B'));
  });

  it('broadcasts a legal move to both players', async () => {
    const { matchId } = await makeGame(a, b);
    const seenByB = waitFor<{ move: { player: string; superGridIndex: number } }>(b, 'move_made');
    a.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 4 });
    const evt = await seenByB;
    expect(evt.move.player).toBe('X');
    expect(evt.move.superGridIndex).toBe(4);
  });

  it('rejects a move made out of turn', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(b, 'game_error');
    // O tries to move first.
    b.emit('make_move', { matchId, superGridIndex: 0, subGridIndex: 0 });
    expect((await err).code).toBe('NOT_YOUR_TURN');
  });

  it('rejects a move that ignores the forced sub-board', async () => {
    const { matchId } = await makeGame(a, b);
    await waitForMove(a, b, matchId, 0, 5); // X plays cell 5 -> O forced to board 5
    const err = waitFor<{ code: string }>(b, 'game_error');
    b.emit('make_move', { matchId, superGridIndex: 3, subGridIndex: 0 });
    expect((await err).code).toBe('ILLEGAL_MOVE');
  });

  it('rejects a move onto an occupied cell', async () => {
    const { matchId } = await makeGame(a, b);
    await waitForMove(a, b, matchId, 4, 4); // X -> 4/4, O forced to board 4
    const err = waitFor<{ code: string }>(b, 'game_error');
    b.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 4 });
    expect((await err).code).toBe('ILLEGAL_MOVE');
  });

  it('rejects out-of-range indices as a malformed request', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(a, 'game_error');
    a.emit('make_move', { matchId, superGridIndex: 99, subGridIndex: 0 });
    expect((await err).code).toBe('BAD_REQUEST');
  });

  it('rejects a fractional index', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(a, 'game_error');
    a.emit('make_move', { matchId, superGridIndex: 1.5, subGridIndex: 0 });
    expect((await err).code).toBe('BAD_REQUEST');
  });

  it('ignores a client-supplied player field and uses the verified mark', async () => {
    const { matchId } = await makeGame(a, b);
    const seen = waitFor<{ move: { player: string } }>(b, 'move_made');
    // X claims to be playing as O.
    a.emit('make_move', { matchId, superGridIndex: 0, subGridIndex: 0, player: 'O' });
    expect((await seen).move.player).toBe('X');
  });

  it('applies only the first of a double-click', async () => {
    const { matchId } = await makeGame(a, b);
    const first = waitFor<unknown>(b, 'move_made');
    const err = waitFor<{ code: string }>(a, 'game_error');
    a.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 0 });
    a.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 1 });
    await first;
    // The second is rejected because the turn already flipped to O.
    expect((await err).code).toBe('NOT_YOUR_TURN');
  });

  it('awards a contested cell to exactly one player', async () => {
    const { matchId } = await makeGame(a, b);
    // Both players go for the same cell in the same tick. X is on move, so X
    // takes it; O's request must then fail because the cell is occupied.
    const moved = waitFor<{ move: { player: string } }>(a, 'move_made');
    const rejected = waitFor<{ code: string }>(b, 'game_error');
    a.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 4 });
    b.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 4 });

    expect((await moved).move.player).toBe('X');
    // O's attempt is refused either way. Which guard catches it depends on
    // delivery order: if O's packet lands first it is NOT_YOUR_TURN, and if it
    // lands after X's move has flipped the turn it is ILLEGAL_MOVE because the
    // cell is now taken. Both are correct; what matters is that it is refused.
    expect(['NOT_YOUR_TURN', 'ILLEGAL_MOVE']).toContain((await rejected).code);

    const view = (await emitAck<AckOk>(a, 'join_match', { matchId })).match;
    expect(view.state.moves).toHaveLength(1);
    expect(view.state.superBoard[4]![4]).toBe('X');
    expect(view.state.currentPlayer).toBe('O');
  });

  it('keeps one authoritative history when both players move in the same tick', async () => {
    const { matchId } = await makeGame(a, b);
    // A legal interleaving: X plays 4/4, which forces O into board 4. Even fired
    // together, the server must serialise them into a consistent two-move history.
    const secondMove = new Promise<void>(resolve => {
      let count = 0;
      a.on('move_made', () => {
        if (++count === 2) resolve();
      });
    });
    a.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 4 });
    b.emit('make_move', { matchId, superGridIndex: 4, subGridIndex: 5 });
    await secondMove;

    const view = (await emitAck<AckOk>(a, 'join_match', { matchId })).match;
    expect(view.state.moves).toHaveLength(2);
    expect(view.state.superBoard[4]![4]).toBe('X');
    expect(view.state.superBoard[4]![5]).toBe('O');
    // Turn returns to X, and the board is internally consistent.
    expect(view.state.currentPlayer).toBe('X');
    expect(view.state.nextRequiredSubBoard).toBe(5);
  });
});

/** Play one move and wait for the broadcast, so tests stay deterministic. */
async function waitForMove(
  mover: ClientSocket,
  observer: ClientSocket,
  matchId: string,
  superGridIndex: number,
  subGridIndex: number,
): Promise<void> {
  const seen = waitFor(observer, 'move_made');
  mover.emit('make_move', { matchId, superGridIndex, subGridIndex });
  await seen;
}

describe('authorization on game-ending actions', () => {
  let a: ClientSocket;
  let b: ClientSocket;
  let c: ClientSocket;

  beforeAll(async () => {
    a = await harness.connect(await createTestUser('End A'));
    b = await harness.connect(await createTestUser('End B'));
    c = await harness.connect(await createTestUser('Outsider'));
  });

  it('resigns the resigner, never the opponent', async () => {
    const { matchId } = await makeGame(a, b);
    const update = waitFor<MatchView>(b, 'match_update');
    a.emit('resign', { matchId });
    const view = await update;
    expect(view.status).toBe('finished');
    // X resigned, so O wins.
    expect(view.result).toEqual({ winner: 'O', reason: 'resign' });
  });

  it('refuses a resign from someone who is not in the match', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(c, 'game_error');
    c.emit('resign', { matchId });
    expect((await err).code).toBe('NOT_A_PLAYER');
  });

  it('lets only the opponent accept a draw offer', async () => {
    const { matchId } = await makeGame(a, b);
    const offered = waitFor<MatchView>(b, 'match_update');
    a.emit('offer_draw', { matchId });
    expect((await offered).drawOfferedBy).toBe('X');

    // The offerer cannot accept their own offer.
    const selfErr = waitFor<{ code: string }>(a, 'game_error');
    a.emit('accept_draw', { matchId });
    expect((await selfErr).code).toBe('NO_DRAW_OFFER');

    // A non-player cannot accept it either.
    const outsiderErr = waitFor<{ code: string }>(c, 'game_error');
    c.emit('accept_draw', { matchId });
    expect((await outsiderErr).code).toBe('NOT_A_PLAYER');

    // The opponent can.
    const done = waitFor<MatchView>(a, 'match_update');
    b.emit('accept_draw', { matchId });
    const view = await done;
    expect(view.status).toBe('finished');
    expect(view.result).toEqual({ winner: 'Draw', reason: 'agreement' });
  });

  it('clears a draw offer when a move is played', async () => {
    const { matchId } = await makeGame(a, b);
    const offered = waitFor<MatchView>(b, 'match_update');
    a.emit('offer_draw', { matchId });
    await offered;

    const afterMove = waitFor<MatchView>(b, 'match_update');
    a.emit('make_move', { matchId, superGridIndex: 0, subGridIndex: 0 });
    expect((await afterMove).drawOfferedBy).toBeNull();
  });

  it('refuses moves after the game has ended', async () => {
    const { matchId } = await makeGame(a, b);
    const ended = waitFor<MatchView>(b, 'match_update');
    a.emit('resign', { matchId });
    await ended;

    const err = waitFor<{ code: string }>(b, 'game_error');
    b.emit('make_move', { matchId, superGridIndex: 0, subGridIndex: 0 });
    expect((await err).code).toBe('GAME_OVER');
  });

  it('refuses a hint to a player who is not on move', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(b, 'game_error');
    b.emit('request_hint', { matchId });
    expect((await err).code).toBe('NOT_YOUR_TURN');
  });

  it('refuses a hint to a non-player', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(c, 'game_error');
    c.emit('request_hint', { matchId });
    expect((await err).code).toBe('NOT_A_PLAYER');
  });
});

describe('rematch', () => {
  let a: ClientSocket;
  let b: ClientSocket;

  beforeAll(async () => {
    a = await harness.connect(await createTestUser('Re A'));
    b = await harness.connect(await createTestUser('Re B'));
  });

  it('requires both players to agree, then swaps who starts', async () => {
    const { matchId } = await makeGame(a, b);
    const ended = waitFor<MatchView>(b, 'match_update');
    a.emit('resign', { matchId });
    const finished = await ended;
    const originalX = finished.players.X!.uid;
    const originalO = finished.players.O!.uid;

    // One request alone does not start a new game.
    const pending = await emitAck<{ ok: boolean; pending?: boolean }>(a, 'request_rematch', {
      matchId,
    });
    expect(pending.pending).toBe(true);
    await expectNoEvent(a, 'rematch_ready');

    // The second request does.
    const ready = waitFor<{ matchId: string }>(a, 'rematch_ready');
    await emitAck(b, 'request_rematch', { matchId });
    const newMatchId = (await ready).matchId;
    expect(newMatchId).not.toBe(matchId);

    // Both join the new game; the previous O now plays X.
    const aView = (await emitAck<AckOk>(a, 'join_match', { matchId: newMatchId })).match;
    const bView = (await emitAck<AckOk>(b, 'join_match', { matchId: newMatchId })).match;
    expect(aView.players.X!.uid).toBe(originalO);
    expect(aView.players.O!.uid).toBe(originalX);
    expect(bView.status).toBe('active');
    expect(aView.state.moves).toHaveLength(0);
    expect(aView.state.winner).toBeNull();
  });

  it('refuses a rematch while the game is still in play', async () => {
    const { matchId } = await makeGame(a, b);
    const err = waitFor<{ code: string }>(a, 'game_error');
    a.emit('request_rematch', { matchId });
    expect((await err).code).toBe('BAD_REQUEST');
  });
});

describe('reconnect and refresh recovery', () => {
  it('restores the same seat and board after a reconnect', async () => {
    const alice = await createTestUser('Refresh A');
    const bob = await createTestUser('Refresh B');
    let a = await harness.connect(alice);
    const b = await harness.connect(bob);

    const { matchId } = await makeGame(a, b);
    await waitForMove(a, b, matchId, 4, 4);

    // Simulate a page refresh: drop the socket, open a new one, rejoin.
    a.disconnect();
    await new Promise(r => setTimeout(r, 150));
    a = await harness.connect(alice);
    const restored = (await emitAck<AckOk>(a, 'join_match', { matchId })).match;

    expect(restored.role).toBe('X');
    expect(restored.status).toBe('active');
    expect(restored.state.moves).toHaveLength(1);
    expect(restored.state.superBoard[4]![4]).toBe('X');
    expect(restored.state.currentPlayer).toBe('O');
    a.disconnect();
    b.disconnect();
  });

  it('tells the opponent when a player drops, and when they return', async () => {
    const alice = await createTestUser('Drop A');
    const bob = await createTestUser('Drop B');
    let a = await harness.connect(alice);
    const b = await harness.connect(bob);
    const { matchId } = await makeGame(a, b);

    const dropped = waitFor<MatchView>(b, 'match_update');
    a.disconnect();
    expect((await dropped).players.X!.connected).toBe(false);

    const returned = waitFor<MatchView>(b, 'match_update');
    a = await harness.connect(alice);
    await emitAck(a, 'join_match', { matchId });
    expect((await returned).players.X!.connected).toBe(true);

    a.disconnect();
    b.disconnect();
  });
});

describe('chat', () => {
  it('uses the verified sender name and rejects a non-player', async () => {
    const a = await harness.connect(await createTestUser('Chat A'));
    const b = await harness.connect(await createTestUser('Chat B'));
    const c = await harness.connect(await createTestUser('Chat C'));
    const { matchId } = await makeGame(a, b);

    const received = waitFor<{ senderName: string; text: string }>(b, 'message_received');
    a.emit('send_message', { matchId, text: 'good luck', senderName: 'Impostor' });
    const msg = await received;
    expect(msg.text).toBe('good luck');
    expect(msg.senderName).not.toBe('Impostor');

    const err = waitFor<{ code: string }>(c, 'game_error');
    c.emit('send_message', { matchId, text: 'let me in' });
    expect((await err).code).toBe('NOT_A_PLAYER');

    a.disconnect();
    b.disconnect();
    c.disconnect();
  });

  it('rate limits a flood', async () => {
    const a = await harness.connect(await createTestUser('Flood A'));
    const b = await harness.connect(await createTestUser('Flood B'));
    const { matchId } = await makeGame(a, b);

    const err = waitFor<{ code: string }>(a, 'game_error');
    for (let i = 0; i < 8; i++) a.emit('send_message', { matchId, text: `spam ${i}` });
    expect((await err).code).toBe('RATE_LIMITED');

    a.disconnect();
    b.disconnect();
  });

  it('rejects an empty or oversized message', async () => {
    const a = await harness.connect(await createTestUser('Msg A'));
    const b = await harness.connect(await createTestUser('Msg B'));
    const { matchId } = await makeGame(a, b);

    const emptyErr = waitFor<{ code: string }>(a, 'game_error');
    a.emit('send_message', { matchId, text: '   ' });
    expect((await emptyErr).code).toBe('BAD_REQUEST');

    const bigErr = waitFor<{ code: string }>(a, 'game_error');
    a.emit('send_message', { matchId, text: 'x'.repeat(501) });
    expect((await bigErr).code).toBe('BAD_REQUEST');

    a.disconnect();
    b.disconnect();
  });
});

describe('play against the computer', () => {
  it('answers the player move with a bot move', async () => {
    const a = await harness.connect(await createTestUser('Solo'));
    const { match } = await emitAck<AckOk>(a, 'create_match', { mode: 'bot', botDifficulty: 2 });
    expect(match.status).toBe('active');
    expect(match.players.O!.uid).toBe('BOT');

    const botMove = new Promise<{ move: { player: string } }>(resolve => {
      const seen: { move: { player: string } }[] = [];
      a.on('move_made', evt => {
        seen.push(evt as { move: { player: string } });
        if (seen.length === 2) resolve(seen[1]!);
      });
    });
    a.emit('make_move', { matchId: match.id, superGridIndex: 4, subGridIndex: 4 });
    expect((await botMove).move.player).toBe('O');
    a.disconnect();
  });
});
