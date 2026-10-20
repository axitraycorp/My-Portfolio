import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Navbar from "../Navbar";
import { profile, sections } from "@/content/profile";

const links = sections.filter((s) => s.id !== "hero");

describe("Navbar", () => {
   it("renders the site name", () => {
      render(<Navbar name={profile.name} links={links} />);
      expect(screen.getByRole("link", { name: new RegExp(profile.name) })).toHaveAttribute(
         "href",
         "/"
      );
   });

   it("links to every home-page section", () => {
      render(<Navbar name={profile.name} links={links} />);
      expect(screen.getByRole("link", { name: "Robot" })).toHaveAttribute("href", "/#robot");
      expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/#projects");
      expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
   });

   it("has a theme toggle", () => {
      render(<Navbar name={profile.name} links={links} />);
      expect(
         screen.getByRole("button", { name: /switch to (light|dark) theme/i })
      ).toBeInTheDocument();
   });
});
