import { test, expect } from "@playwright/test";

// Minimal smoke suite — no Playwright tests existed in this repo before.
// Verifies the app boots, SSR renders, route guards actually redirect
// (not just "the page exists"), and no console errors fire on first paint.
// Intentionally does not attempt authenticated flows (no seeded test
// account/credentials exist in this environment).

test("unauthenticated visitor is redirected from / to /login", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByPlaceholder("you@college.edu").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("a protected student route redirects to /login when signed out", async ({ page }) => {
  await page.goto("/drives");
  await expect(page).toHaveURL(/\/login/);
});

test("a protected college route redirects to /login when signed out", async ({ page }) => {
  await page.goto("/college");
  await expect(page).toHaveURL(/\/login/);
});

test("a protected billing route redirects to /login when signed out", async ({ page }) => {
  await page.goto("/billing");
  await expect(page).toHaveURL(/\/login/);
});

test("a protected courses route redirects to /login when signed out", async ({ page }) => {
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("Sprint 28 admin routes require auth", () => {
  for (const path of [
    "/admin",
    "/admin/colleges",
    "/admin/drives",
    "/admin/courses",
    "/admin/credits",
    "/admin/audit",
  ]) {
    test(`${path} redirects to /login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Sprint 29 notification routes require auth", () => {
  for (const path of ["/notifications", "/business/notifications"]) {
    test(`${path} redirects to /login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Sprint 30: business routes moved to BusinessShell still require auth", () => {
  for (const path of ["/business/advertising", "/business/marketing"]) {
    test(`${path} redirects to /login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test("/messages redirects to /login when signed out", async ({ page }) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/login/);
});

test("signup page renders without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/signup");
  await expect(page.getByPlaceholder("you@college.edu").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
