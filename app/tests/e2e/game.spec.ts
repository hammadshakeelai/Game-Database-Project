import { expect, test, type Page, type BrowserContext } from '@playwright/test';

/**
 * Full two-player flows, driven through two independent browser contexts so the
 * players have genuinely separate sessions, storage, and sockets.
 *
 * Sign-in goes through the Firebase Auth emulator: automating Google's real
 * OAuth screens would be fragile and is not something to script.
 */

let counter = 0;
function uniqueEmail(prefix: string): string {
  return `${prefix}${Date.now()}${counter++}@example.test`;
}

/** Open a page, sign in through the emulator, and land in the lobby. */
async function signIn(context: BrowserContext, prefix: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => '__signInForTests' in window, null, { timeout: 20_000 });
  await page.evaluate(
    ([email, password]) =>
      (
        window as unknown as {
          __signInForTests: (e: string, p: string) => Promise<void>;
        }
      ).__signInForTests(email!, password!),
    [uniqueEmail(prefix), 'test-password-123'],
  );
  await page.waitForURL('**/play', { timeout: 20_000 });
  return page;
}

/** Read the room code shown in the lobby header of a created game. */
async function createGame(page: Page): Promise<string> {
  await page.getByRole('button', { name: /create a game/i }).click();
  await page.waitForURL(/\/play\/[A-Z0-9]{6}/, { timeout: 20_000 });
  const url = page.url();
  return url.slice(url.lastIndexOf('/') + 1);
}

async function joinGame(page: Page, code: string): Promise<void> {
  await page.getByLabel('Game code').fill(code);
  await page.getByRole('button', { name: /^join$/i }).click();
  await page.waitForURL(`**/play/${code}`, { timeout: 20_000 });
}

/** Click a cell by its sub-board and cell index. */
function cell(page: Page, superIdx: number, subIdx: number) {
  return page.getByTestId(`cell-${superIdx}-${subIdx}`);
}

test.describe('two-player game', () => {
  test('sign in, create, share, join, play, and see a synchronized result', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const alice = await signIn(contextA, 'alice');
    const bob = await signIn(contextB, 'bob');

    // Flow 1 — Alice creates a room and receives an invitation code.
    const code = await createGame(alice);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    await expect(alice.getByText(/waiting for an opponent/i)).toBeVisible();

    // Flow 2 — Bob joins and both see an initialised board.
    await joinGame(bob, code);
    await expect(alice.getByText(/your turn/i)).toBeVisible({ timeout: 15_000 });
    await expect(bob.getByText(/x's turn/i)).toBeVisible({ timeout: 15_000 });

    // Flow 3 — a move by Alice appears on Bob's board, and vice versa.
    await cell(alice, 4, 4).click();
    await expect(cell(bob, 4, 4)).toHaveText('X', { timeout: 15_000 });
    await expect(bob.getByText(/your turn/i)).toBeVisible();

    await cell(bob, 4, 0).click();
    await expect(cell(alice, 4, 0)).toHaveText('O', { timeout: 15_000 });

    // Flow 6 — a refresh restores the match rather than losing it.
    await alice.reload();
    await expect(cell(alice, 4, 4)).toHaveText('X', { timeout: 20_000 });
    await expect(cell(alice, 4, 0)).toHaveText('O');

    // Flow 4 — resignation produces the same result on both clients.
    await bob.getByRole('button', { name: /resign/i }).click();
    await bob.getByRole('button', { name: /tap again to confirm/i }).click();

    await expect(alice.getByRole('heading', { name: /you won/i })).toBeVisible({ timeout: 15_000 });
    await expect(bob.getByRole('heading', { name: /you lost/i })).toBeVisible({ timeout: 15_000 });

    // Flow 5 — a rematch needs both players, then gives both a clean board.
    await alice.getByRole('button', { name: /^rematch$/i }).click();
    await expect(alice.getByRole('button', { name: /waiting for opponent/i })).toBeVisible();

    await bob.getByRole('button', { name: /^rematch$/i }).click();

    // Both players must be moved to a DIFFERENT match, so wait for the code in
    // the URL to actually change rather than for the shape of the URL.
    const movedOn = (url: URL) =>
      /\/play\/[A-Z0-9]{6}$/.test(url.pathname) && !url.pathname.endsWith(code);
    await alice.waitForURL(movedOn, { timeout: 20_000 });
    await bob.waitForURL(movedOn, { timeout: 20_000 });
    expect(alice.url()).toBe(bob.url());

    // The new board is empty for both.
    await expect(cell(alice, 4, 4)).toHaveText('');
    await expect(cell(bob, 4, 4)).toHaveText('');

    await contextA.close();
    await contextB.close();
  });

  test('records the result against the winner and loser', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const alice = await signIn(contextA, 'winner');
    const bob = await signIn(contextB, 'loser');

    const code = await createGame(alice);
    await joinGame(bob, code);
    await expect(alice.getByText(/your turn/i)).toBeVisible({ timeout: 15_000 });

    await bob.getByRole('button', { name: /resign/i }).click();
    await bob.getByRole('button', { name: /tap again to confirm/i }).click();
    await expect(alice.getByRole('heading', { name: /you won/i })).toBeVisible({ timeout: 15_000 });

    // The lobby should show the result in the player's record.
    await alice.getByRole('link', { name: /back to the lobby/i }).click();
    await alice.waitForURL('**/play');
    await expect(alice.getByText(/^Won$/).first()).toBeVisible({ timeout: 15_000 });

    await contextA.close();
    await contextB.close();
  });
});

test.describe('room errors', () => {
  test('shows a clear message for a code that does not exist', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, 'lost');

    await page.getByLabel('Game code').fill('ZZZZZZ');
    await page.getByRole('button', { name: /^join$/i }).click();
    await expect(page.getByRole('alert')).toContainText(/could not find that game/i);
    // Crucially, it did NOT silently create a new room.
    await expect(page).toHaveURL(/\/play$/);

    await context.close();
  });

  test('refuses a third player with a full-room message', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    const [alice, bob, carol] = await Promise.all([
      signIn(contexts[0]!, 'host'),
      signIn(contexts[1]!, 'guest'),
      signIn(contexts[2]!, 'third'),
    ]);

    const code = await createGame(alice);
    await joinGame(bob, code);
    await expect(alice.getByText(/your turn/i)).toBeVisible({ timeout: 15_000 });

    await carol.getByLabel('Game code').fill(code);
    await carol.getByRole('button', { name: /^join$/i }).click();
    await expect(carol.getByRole('alert')).toContainText(/already has two players/i);

    await Promise.all(contexts.map(c => c.close()));
  });
});

test.describe('play against the computer', () => {
  test('the computer replies to a move', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, 'solo');

    await page.getByRole('button', { name: /play the computer/i }).click();
    await page.waitForURL(/\/play\/[A-Z0-9]{6}/, { timeout: 20_000 });

    await cell(page, 4, 4).click();
    await expect(cell(page, 4, 4)).toHaveText('X', { timeout: 15_000 });
    // The bot answers inside its own board within a second or two.
    await expect(page.getByText('O').first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});

test.describe('unauthenticated access', () => {
  test('sends a signed-out visitor to sign-in and keeps the invite link', async ({ page }) => {
    await page.goto('/play/ABC123');
    await expect(page).toHaveURL(/\/\?next=/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('the lobby is not reachable without signing in', async ({ page }) => {
    await page.goto('/play');
    await expect(page).toHaveURL(/\/\?next=/, { timeout: 20_000 });
  });
});
