import { expect, test } from "@playwright/test";

test("primary CRM navigation is available", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leads" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Students" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Payments" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
});
