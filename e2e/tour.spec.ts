import { expect, test } from "@playwright/test";

test.describe("Unit-7 scripted tour", () => {
   test("starts the tour and highlights the robot section", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("button", { name: "Start the tour" }).click();

      const panel = page.getByRole("dialog", { name: "Unit-7" });
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Step 1 of 7")).toBeVisible();

      // Step 2 is the robot: its architecture diagram gets the bounding box
      await panel.getByRole("button", { name: "Next" }).click();
      await expect(panel.getByRole("heading", { name: "The robot" })).toBeVisible();

      const spotlight = page.getByTestId("spotlight");
      await expect(spotlight).toHaveAttribute("data-section", "robot");
      await expect(spotlight).toHaveAttribute("data-target", "architecture");
      await expect(page.locator("#architecture")).toBeInViewport();
   });

   test("arrow keys step through the tour and Escape closes it", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Start the tour" }).click();
      const panel = page.getByRole("dialog", { name: "Unit-7" });
      await expect(panel.getByText("Step 1 of 7")).toBeVisible();

      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await expect(panel.getByText("Step 3 of 7")).toBeVisible();
      await page.keyboard.press("ArrowLeft");
      await expect(panel.getByText("Step 2 of 7")).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(page.getByTestId("spotlight")).toHaveCount(0);
      // Focus returns to the control that opened the panel
      await expect(page.getByRole("button", { name: "Start the tour" })).toBeFocused();
   });

   test("falls back to the scripted tour in offline mode when the API is unavailable", async ({
      page,
   }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /Open Unit-7/ }).click();

      const panel = page.getByRole("dialog", { name: "Unit-7" });
      await panel.getByRole("button", { name: "What's special about the robot?" }).click();

      await expect(panel.getByText("offline mode · scripted tour")).toBeVisible();
      await expect(panel.getByText(/Step \d of 7/)).toBeVisible();
      await expect(panel.getByRole("button", { name: "Chat" })).toBeDisabled();
   });
});
