import { render, screen } from "@testing-library/react";
import RecordDetails from "./RecordDetails";

test("shows recorded details and preserves diagnostic uncertainty", () => {
  render(<RecordDetails data={{ provider_name: "Dr. Demo", visit_date: "2026-10-20", documented_diagnosis: "Rule out anaemia", pending_items: '["Review report"]' }} />);
  expect(screen.getByText("Dr. Demo")).toBeInTheDocument();
  expect(screen.getByText("2026-10-20")).toBeInTheDocument();
  expect(screen.getByText("Rule out anaemia")).toBeInTheDocument();
  expect(screen.getByText("Review report")).toBeInTheDocument();
  expect(screen.getAllByText("Not recorded or unreadable").length).toBeGreaterThan(0);
  expect(screen.getByText(/not an AI diagnosis/)).toBeInTheDocument();
});
