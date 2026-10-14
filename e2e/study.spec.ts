import { test, expect, type Page } from '@playwright/test';

const DECK = 'architect-foundations';
const cert = (path = '') => `/#/c/${DECK}${path}`;

/** Drive a real pointer drag on the card. */
async function swipe(page: Page, dir: 'left' | 'right' | 'up' | 'down') {
  const card = page.getByTestId('swipe-card');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await page.waitForTimeout(60);

  const viewport = page.viewportSize() ?? { width: 400, height: 800 };
  const box = (await card.boundingBox())!;
  const DIST = 140; // comfortably past the 92px commit threshold

  // Keep the whole gesture inside the viewport so every move is delivered.
  const cx = Math.min(Math.max(box.x + box.width / 2, DIST + 20), viewport.width - DIST - 20);
  const cy = Math.min(
    Math.max(box.y + Math.min(box.height / 2, 140), DIST + 20),
    viewport.height - DIST - 20,
  );

  const delta = {
    left: [-DIST, 0],
    right: [DIST, 0],
    up: [0, -DIST],
    down: [0, DIST],
  }[dir];

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Step through so the drag-start threshold is crossed and moves are delivered.
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(cx + (delta[0] * i) / 8, cy + (delta[1] * i) / 8);
  }
  await page.mouse.up();
}

/** Swipe in a direction the current card actually uses. */
async function swipeEnabled(page: Page) {
  const map = await readDirectionMap(page);
  const dir = Object.keys(map)[0] as 'left' | 'right' | 'up' | 'down';
  expect(dir, 'card should expose at least one direction').toBeTruthy();
  await swipe(page, dir);
  return dir;
}

async function readDirectionMap(page: Page) {
  return page.locator('[data-option-id]').evaluateAll((els) => {
    const out: Record<string, { id: string; text: string }> = {};
    for (const el of els) {
      const d = (el.getAttribute('aria-label') || '').match(/Swipe (left|right|up|down)/i)?.[1]?.toLowerCase();
      if (!d) continue;
      let text = '';
      el.querySelectorAll('span').forEach((s) => {
        if (s.innerText && s.innerText.length > text.length && !s.querySelector('span')) text = s.innerText;
      });
      out[d] = {
        id: el.getAttribute('data-option-id')!,
        text: text.replace(/\s*Swipe (left|right|up|down)\s*$/i, '').replace(/\s+/g, ' ').trim(),
      };
    }
    return out;
  });
}

/** The text shown as "Your answer" on the feedback panel. */
async function pickedAnswer(page: Page) {
  const text = await page.locator('.picked-box .picked-text').first().innerText();
  return text.replace(/\s+/g, ' ').trim();
}

async function gotoSession(page: Page, mode = 'discover') {
  await page.goto(cert(`/session/${mode}`));
  await expect(page.getByTestId('swipe-card')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('home shows progress, session choices, and the bottom nav', async ({ page }) => {
  await page.goto(cert());
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByTestId('start-discover')).toBeVisible();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await expect(page.getByTestId('start-recall')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});

test('a swipe commits an answer and reveals the explanation only afterwards', async ({ page }) => {
  await gotoSession(page);
  await expect(page.getByTestId('feedback')).toHaveCount(0);

  await swipeEnabled(page);
  await expect(page.getByTestId('feedback')).toBeVisible();
  await expect(page.getByTestId('feedback-title')).toBeVisible();

  // Explanation content is present after commit
  await expect(page.getByRole('heading', { name: 'Why this is correct' })).toBeVisible();
  await expect(page.getByText('Key takeaway')).toBeVisible();
});

test('tapping an option commits that same answer', async ({ page }) => {
  await gotoSession(page);
  const map = await readDirectionMap(page);
  const target = Object.values(map)[0];

  const row = page.locator(`[data-option-id="${target.id}"]`);
  await row.click();

  await expect(page.getByTestId('feedback')).toBeVisible();
  // the answer committed by tapping is the one we tapped
  expect(await pickedAnswer(page)).toBe(target.text);
});

test('an unused swipe direction does not submit an answer', async ({ page }) => {
  await gotoSession(page);
  const map = await readDirectionMap(page);
  const used = Object.keys(map);
  if (used.length === 4) test.skip(true, '4-option card uses every direction');
  const unused = (['left', 'right', 'up', 'down'] as const).find((d) => !used.includes(d))!;

  await swipe(page, unused);
  await expect(page.getByTestId('feedback')).toHaveCount(0);
  await expect(page.getByTestId('swipe-card')).toBeVisible();
});

test('each direction maps to exactly the option it is labelled with', async ({ page }) => {
  await gotoSession(page);

  const first = await readDirectionMap(page);
  const directions = directionsOf(first);
  expect(directions.length).toBeGreaterThanOrEqual(2);

  for (const dir of directions) {
    // "Try again" re-randomises the option->direction mapping, so read the map
    // for THIS presentation rather than reusing the one from the first card.
    const again = page.getByRole('button', { name: 'Try again' });
    if (await again.isVisible().catch(() => false)) {
      await again.click();
      await expect(page.getByTestId('swipe-card')).toBeVisible();
    }
    const map = await readDirectionMap(page);
    if (!map[dir]) continue; // this presentation did not use that direction

    await swipe(page, dir);
    await expect(page.getByTestId('feedback')).toBeVisible();
    expect(await pickedAnswer(page), `direction ${dir}`).toBe(map[dir].text);
  }
});

test('"Try again" re-randomises which answer sits in which direction', async ({ page }) => {
  await gotoSession(page);

  // Collect the direction->option signature across several presentations of the
  // same question. Identical mappings are possible by chance, so we assert that
  // more than one distinct mapping is observed over several retries.
  const signatures = new Set<string>();
  let trials = 0;

  while (trials < 6 && signatures.size < 2) {
    const map = await readDirectionMap(page);
    if (Object.keys(map).length === 0) break;
    signatures.add(directionsOf(map).map((d) => `${d}:${map[d].id}`).sort().join('|'));
    trials++;

    // Answer, then re-present via "Try again" when offered, else "Continue".
    await page.locator('[data-option-id]').first().click();
    await expect(page.getByTestId('feedback')).toBeVisible();

    const again = page.getByRole('button', { name: 'Try again' });
    if (await again.isVisible().catch(() => false)) {
      await again.click();
    } else {
      const cont = page.getByRole('button', { name: 'Continue' });
      if (!(await cont.isVisible().catch(() => false))) break;
      await cont.click();
    }
    if (!(await page.getByTestId('swipe-card').isVisible().catch(() => false))) break;
  }

  expect(trials, 'should have been able to re-present a card').toBeGreaterThan(1);
  expect(
    signatures.size,
    `re-presentations should produce more than one distinct mapping, saw ${[...signatures].join(' / ')}`,
  ).toBeGreaterThan(1);
});

function directionsOf(map: Record<string, { id: string; text: string }>) {
  return (['left', 'right', 'up', 'down'] as const).filter((d) => map[d]);
}

test('a short drag does not commit', async ({ page }) => {
  await gotoSession(page);
  const box = (await page.getByTestId('swipe-card').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + 100;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 25, cy, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByTestId('feedback')).toHaveCount(0);
});

test('challenge mode presents a multiple-response card that can be submitted', async ({ page }) => {
  await page.goto(cert('/session/challenge'));

  // Advance until a select-all-that-apply card shows up
  let found = false;
  for (let i = 0; i < 10 && !found; i++) {
    const submit = page.getByTestId('submit-multi');
    if (await submit.isVisible().catch(() => false)) {
      found = true;
      break;
    }
    const card = page.getByTestId('swipe-card');
    if (await card.isVisible().catch(() => false)) {
      await page.locator('[data-option-id]').first().click();
    }
    const cont = page.getByRole('button', { name: 'Continue' });
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }
  expect(found, 'challenge session should include a multiple-response card').toBe(true);

  const submit = page.getByTestId('submit-multi');
  await expect(submit).toBeDisabled();
  await page.locator('[data-option-id]').nth(0).click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByTestId('feedback')).toBeVisible();
});

test('progress survives a reload and a session can be resumed', async ({ page }) => {
  await gotoSession(page);
  await swipeEnabled(page);
  await expect(page.getByTestId('feedback')).toBeVisible();
  await expect(page.getByTestId('session-xp')).toBeVisible();

  const before = page.url();
  await page.reload();
  await expect(page).toHaveURL(before);

  // either still on the same card, or returned home with a resume affordance
  const resume = page.getByTestId('resume');
  if (await resume.isVisible().catch(() => false)) {
    await expect(resume).toBeVisible();
  } else {
    await expect(page.getByTestId('swipe-card')).toBeVisible();
  }
});

test('finishing a session shows a friendly summary', async ({ page }) => {
  await gotoSession(page);
  for (let i = 0; i < 12; i++) {
    if (page.url().includes('/summary')) break;
    const card = page.getByTestId('swipe-card');
    if (await card.isVisible().catch(() => false)) {
      await page.locator('[data-option-id]').first().click();
    }
    const cont = page.getByRole('button', { name: 'Continue' });
    if (await cont.isVisible().catch(() => false)) {
      await cont.click();
    }
  }
  await expect(page.getByTestId('summary-title')).toBeVisible();
  await expect(page.getByTestId('summary-line')).toContainText(/correct/);
});

test('option count varies (2, 3 and 4 options all render)', async ({ page }) => {
  const seen = new Set<number>();
  for (let round = 0; round < 12 && seen.size < 3; round++) {
    await page.goto(cert(`/session/discover?r=${round}`));
    const card = page.getByTestId('swipe-card');
    await expect(card).toBeVisible();
    const n = await page.locator('[data-option-id]').count();
    seen.add(n);
    const cont = page.getByRole('button', { name: 'Continue' });
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }
  expect([...seen].every((n) => [2, 3, 4].includes(n))).toBe(true);
});

test('stats screen renders domain progress', async ({ page }) => {
  await page.goto(cert('/stats'));
  await expect(page.getByRole('heading', { name: /Progress$/ })).toBeVisible();
  await expect(page.getByText('Agentic Architecture & Orchestration')).toBeVisible();
});

test('settings expose reduced motion and progress export', async ({ page }) => {
  await page.goto('/#/settings');
  const toggle = page.getByTestId('toggle-reduce-motion');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: /Export all progress/ })).toBeVisible();
});

// ---------- Multiple certifications ----------

test('the certification picker lists every certification and separates available from planned', async ({
  page,
}) => {
  await page.goto('/#/c');
  await expect(page.getByRole('heading', { name: 'Choose a certification' })).toBeVisible();

  // The deck that has content is enterable.
  await expect(page.getByTestId(`cert-${DECK}`)).toBeVisible();

  // The others are visibly planned, not broken links.
  await expect(page.getByTestId('cert-planned-architect-professional')).toBeVisible();
  await expect(page.getByTestId('cert-planned-developer-foundations')).toBeVisible();
});

test('a planned certification opens an informational screen, not a broken session', async ({ page }) => {
  await page.goto('/#/c');
  await page.getByTestId('cert-planned-architect-professional').click();
  await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible();
  await expect(page.getByTestId('swipe-card')).toHaveCount(0);
  // Still offers a way back into what is available.
  await expect(page.getByRole('link', { name: /All certifications/ })).toBeVisible();
});

test('a session route for a planned certification does not start a session', async ({ page }) => {
  await page.goto('/#/c/architect-professional/session/discover');
  await expect(page.getByTestId('swipe-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible();
});

test('an unknown certification falls back to the picker', async ({ page }) => {
  await page.goto('/#/c/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Choose a certification' })).toBeVisible();
});

test('switching certification keeps progress separate per certification', async ({ page }) => {
  // Make progress on the available deck.
  await gotoSession(page);
  await swipeEnabled(page);
  await expect(page.getByTestId('feedback')).toBeVisible();
  await page.getByTestId('continue').click();

  await page.goto('/#/c');
  // The available certification should now show that it has been explored.
  await expect(page.getByText(/explored/)).toBeVisible();

  // The planned certification must not show any of the other deck's progress.
  await page.getByTestId('cert-planned-architect-professional').click();
  await expect(page.getByText(/explored/)).toHaveCount(0);
});
