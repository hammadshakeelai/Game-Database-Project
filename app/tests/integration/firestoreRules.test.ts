import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

/**
 * Security rules are part of the application, so they get tested like it.
 *
 * These run against the Firestore emulator as a *client*, which means the rules
 * are actually enforced — unlike the server's Admin SDK writes, which bypass them.
 */

let env: RulesTestEnvironment;

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

beforeAll(async () => {
  const host = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8391').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-super-ttt',
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host: host[0],
      port: Number(host[1]),
    },
  });

  // Seed documents the way the server would, bypassing rules.
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ALICE), {
      displayName: 'Alice',
      photoURL: null,
      createdAt: Date.now(),
      matchesPlayed: 3,
      wins: 2,
      losses: 1,
      draws: 0,
    });
    await setDoc(doc(db, 'users', BOB), {
      displayName: 'Bob',
      photoURL: null,
      createdAt: Date.now(),
      matchesPlayed: 3,
      wins: 1,
      losses: 2,
      draws: 0,
    });
    await setDoc(doc(db, 'match_records', 'ABC123'), {
      playerX: ALICE,
      playerO: BOB,
      playerXName: 'Alice',
      playerOName: 'Bob',
      winner: 'X',
      reason: 'line',
      movesCount: 17,
      createdAt: Date.now(),
      finishedAt: Date.now(),
    });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

function asAlice() {
  return env.authenticatedContext(ALICE).firestore();
}
function asBob() {
  return env.authenticatedContext(BOB).firestore();
}
function asAnonymous() {
  return env.unauthenticatedContext().firestore();
}

describe('users collection', () => {
  it('lets a signed-in player read any profile', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users', BOB)));
  });

  it('denies a signed-out visitor', async () => {
    await assertFails(getDoc(doc(asAnonymous(), 'users', ALICE)));
  });

  it('lets a player change their own display name', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'users', ALICE), { displayName: 'Alice A.' }));
  });

  it('refuses a player editing someone else profile', async () => {
    await assertFails(updateDoc(doc(asBob(), 'users', ALICE), { displayName: 'Hacked' }));
  });

  it('refuses a player inflating their own win count', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'users', ALICE), { wins: 9999 }));
  });

  it('refuses a stat change smuggled alongside a legitimate name change', async () => {
    await assertFails(
      updateDoc(doc(asAlice(), 'users', ALICE), { displayName: 'Alice', wins: 500 }),
    );
  });

  it('refuses creating a profile from the client', async () => {
    await assertFails(
      setDoc(doc(asAlice(), 'users', 'brand-new-uid'), { displayName: 'Ghost', wins: 100 }),
    );
  });

  it('refuses deleting a profile', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'users', ALICE)));
  });
});

describe('match_records collection', () => {
  it('lets a signed-in player read a result', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'match_records', 'ABC123')));
  });

  it('refuses a signed-out reader', async () => {
    await assertFails(getDoc(doc(asAnonymous(), 'match_records', 'ABC123')));
  });

  it('refuses a player fabricating a win', async () => {
    await assertFails(
      setDoc(doc(asAlice(), 'match_records', 'FAKE01'), {
        playerX: ALICE,
        playerO: BOB,
        playerXName: 'Alice',
        playerOName: 'Bob',
        winner: 'X',
        reason: 'line',
        movesCount: 5,
        createdAt: Date.now(),
        finishedAt: Date.now(),
      }),
    );
  });

  it('refuses rewriting a finished result', async () => {
    await assertFails(updateDoc(doc(asBob(), 'match_records', 'ABC123'), { winner: 'O' }));
  });

  it('refuses deleting a result', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'match_records', 'ABC123')));
  });
});

describe('undeclared collections', () => {
  it('denies reads and writes to anything without explicit rules', async () => {
    await assertFails(getDoc(doc(asAlice(), 'secrets', 'x')));
    await assertFails(setDoc(doc(asAlice(), 'secrets', 'x'), { a: 1 }));
  });
});
