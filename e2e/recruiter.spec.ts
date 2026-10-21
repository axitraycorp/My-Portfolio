import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
   await page.addInitScript(() => sessionStorage.setItem("booted", "1"));
});

test("home page has an 'At a glance' summary that links to the CV", async ({ page }) => {
   await page.goto("/");
   const glance = page.locator("#at-a-glance");
   await expect(glance.getByRole("heading", { name: /At a glance/ })).toBeVisible();
   await expect(
      glance.getByRole("list", { name: "Target roles" }).getByRole("listitem")
   ).not.toHaveCount(0);

   await glance.getByRole("link", { name: "View CV" }).click();
   await expect(page).toHaveURL(/\/cv$/);
});

test("CV page renders from profile.ts and prints without site chrome", async ({ page }) => {
   await page.goto("/cv");
   const cv = page.getByRole("article");
   await expect(cv.getByRole("heading", { level: 1 })).toBeVisible();
   for (const section of ["Summary", "Skills", "Projects", "Experience", "Education"]) {
      await expect(cv.getByRole("heading", { name: section, level: 2 })).toBeVisible();
   }
   await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
   // Placeholders are never shown
   await expect(cv).not.toContainText("TODO");

   await page.emulateMedia({ media: "print" });
   await expect(page.getByRole("button", { name: "Download PDF" })).toBeHidden();
   await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
   await expect(page.locator(".assistant-launcher")).toBeHidden();
   await expect(cv).toBeVisible();
});
