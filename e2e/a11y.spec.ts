import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/projects/perception-arm", "/projects", "/cv"];

for (const theme of ["dark", "light"] as const) {
   for (const path of PAGES) {
      test(`${path} has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
         await page.addInitScript((t) => {
            localStorage.setItem("theme", t);
            sessionStorage.setItem("booted", "1"); // skip the boot sequence
         }, theme);
         await page.goto(path);
         await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

         const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            // The WebGL canvas is decorative (aria-hidden) and not analysable
            .exclude(".hero-scene")
            .analyze();

         const summary = results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
         );
         expect(summary).toEqual([]);
      });
   }
}

test("page has no horizontal scroll", async ({ page }) => {
   await page.addInitScript(() => sessionStorage.setItem("booted", "1"));
   for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
         () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
   }
});
