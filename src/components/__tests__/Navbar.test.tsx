import { render, screen } from "@testing-library/react";
import Navbar from "../Navbar";

describe("Navbar", () => {
   it("renders site name", () => {
      render(<Navbar />);
      expect(screen.getByText("Hagon.dev")).toBeInTheDocument();
   });

   it("has navigation links", () => {
      render(<Navbar />);
      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();
   });
});
