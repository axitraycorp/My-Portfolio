import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
   await page.addInitScript(() => sessionStorage.setItem("booted", "1"));
});

test("the lab lists every robot type and opens a clean starter build", async ({ page }) => {
   await page.goto("/lab");
   await expect(page.locator('a[href^="/lab/build?type="]')).toHaveCount(8);
   await page.getByRole("link", { name: "Build a hexapod spider" }).click();
   await expect(page).toHaveURL(/\/lab\/build\?type=hexapod/);
   const summary = page.getByRole("status", { name: "Check summary" });
   await expect(summary).toContainText("0 errors");
   await expect(summary).toContainText("0 warnings");
});

test("a broken wire is reported as an error", async ({ page }) => {
   await page.goto("/lab/build?type=mecanum-rover");
   await page.getByRole("tab", { name: "Wiring" }).click();
   // The first starter wire runs from the battery: removing it leaves the robot unpowered
   await page.getByRole("button", { name: /^Disconnect / }).first().click();
   await expect(page.getByRole("status", { name: "Check summary" })).not.toContainText("0 errors");
   await page.getByRole("tab", { name: /Checks/ }).click();
   await expect(page.getByRole("tabpanel")).toContainText(/power/i);
});

test("switching environments shows that wheeled robots can't climb stairs", async ({ page }) => {
   await page.goto("/lab/build?type=tank-rover");
   await page.getByRole("button", { name: /Stairs/ }).click();
   await expect(page.locator("#env-title")).toContainText(/Stairs/);
   await expect(page.getByRole("button", { name: /Stairs/ })).toContainText("fail");
});

for (const theme of ["dark", "light"] as const) {
   for (const path of ["/lab", "/lab/build?type=robot-dog", "/lab/login"]) {
      test(`${path} has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
         await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
         await page.goto(path);
         await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
         const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .exclude(".lab-scene canvas")
            .analyze();
         expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
   }
}

test("lab pages have no horizontal scroll", async ({ page }) => {
   for (const path of ["/lab", "/lab/build?type=humanoid", "/lab/login"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
   }
});
