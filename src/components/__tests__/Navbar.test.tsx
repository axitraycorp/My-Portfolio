import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Navbar from "../Navbar";
import { profile } from "@/content/profile";

describe("Navbar", () => {
   it("renders the site name from profile.ts", () => {
      render(<Navbar />);
      expect(screen.getByRole("link", { name: new RegExp(profile.name) })).toHaveAttribute(
         "href",
         "/"
      );
   });

   it("links to every home-page section", () => {
      render(<Navbar />);
      expect(screen.getByRole("link", { name: "Robot" })).toHaveAttribute("href", "/#robot");
      expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/#projects");
      expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
   });

   it("has a theme toggle", () => {
      render(<Navbar />);
      expect(
         screen.getByRole("button", { name: /switch to (light|dark) theme/i })
      ).toBeInTheDocument();
   });
});
