import { test, expect } from "@playwright/test";

/**
 * Staff/admin APIs must reject anonymous callers.
 * TanStack `/_serverFn/*` paths are gone — cover Next Route Handlers instead.
 */
test.describe("authorization", () => {
  test("admin dashboard API rejects guests", async ({ request }) => {
    const res = await request.get("/api/admin/dashboard", { failOnStatusCode: false });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("admin orders PATCH rejects guests", async ({ request }) => {
    const res = await request.patch("/api/admin/orders", {
      data: { id: "x", status: "confirmed" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("admin page prompts guests to log in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/লগইন|log in|অনুমতি|access required/i).first()).toBeVisible();
  });

  test("public health is open; missing upload is not", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBe(200);
    const missing = await request.get("/api/uploads/does-not-exist.jpg", { failOnStatusCode: false });
    expect([400, 403, 404, 500]).toContain(missing.status());
  });
});
