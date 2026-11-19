import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
   await page.addInitScript(() => sessionStorage.setItem("booted", "1"));
});

test("the lab lists every robot type and opens a clean starter build", async ({ page }) => {
   await page.goto("/lab");
   await expect(page.getByRole("link", { name: /^Build a / })).toHaveCount(8);
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

test("Unit-7 guides a robot arm from a bare frame to a working build", async ({ page }) => {
   await page.goto("/lab/build?type=robot-arm&scratch=1&guide=1");
   const guide = page.getByRole("region", { name: /Unit-7 · build guide/ });
   await expect(guide).toContainText("Brain");
   for (let i = 0; i < 40; i++) {
      if (await guide.getByRole("button", { name: "Open the assembly plan" }).isVisible()) break;
      const connectAll = guide.getByRole("button", { name: /^Connect all/ });
      const recommended = guide.getByRole("listitem").filter({ hasText: "recommended" }).getByRole("button", { name: /^Add / });
      const skip = guide.getByRole("button", { name: /Skip this step|That's enough/ });
      if (await connectAll.isVisible()) await connectAll.click();
      else if ((await recommended.count()) > 0) await recommended.first().click();
      else if (await skip.isVisible()) await skip.click();
      else break;
   }
   await expect(guide.getByRole("button", { name: "Open the assembly plan" })).toBeVisible();
   await expect(page.getByRole("status", { name: "Check summary" })).toContainText("0 errors");
});

test("the assembly plan walks from frame to power-on tests", async ({ page }) => {
   await page.goto("/lab/build?type=mobile-manipulator");
   await page.getByRole("tab", { name: "Assembly plan" }).click();
   const steps = page.getByRole("list", { name: "Assembly and bring-up steps" });
   await expect(steps.getByRole("button", { name: /Frame/ })).toHaveAttribute("aria-expanded", "true");
   await page.getByRole("button", { name: "Next step →" }).click();
   await expect(steps.getByRole("button", { name: /Motors, servos and wheels/ })).toHaveAttribute("aria-expanded", "true");
   await expect(steps).toContainText("Turret, Shoulder, Elbow");
   await steps.getByRole("button", { name: /Power test 1/ }).click();
   await expect(steps).toContainText("Measure with a multimeter");
   await expect(page.getByText("All 5 power-on test stages pass.")).toBeVisible();
});

test("the plan tab has no WCAG A/AA violations", async ({ page }) => {
   await page.goto("/lab/build?type=hexapod");
   await page.getByRole("tab", { name: "Assembly plan" }).click();
   await expect(page.getByRole("list", { name: "Assembly and bring-up steps" })).toBeVisible();
   const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude(".lab-scene canvas")
      .analyze();
   expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

for (const theme of ["dark", "light"] as const) {
   for (const path of ["/lab", "/lab/build?type=robot-dog", "/lab/build?type=hexapod&scratch=1&guide=1", "/lab/login"]) {
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
   await page.goto("/lab/build?type=humanoid");
   await page.getByRole("tab", { name: "Assembly plan" }).click();
   await page.getByRole("button", { name: /Wiring/ }).click();
   const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
   expect(overflow, `plan tab overflows by ${overflow}px`).toBeLessThanOrEqual(0);
});
