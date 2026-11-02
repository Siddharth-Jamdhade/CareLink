import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VoiceVerification, { matchesFact } from "./VoiceVerification";
import API from "./api";
jest.mock("./api", () => ({ __esModule: true, default: { post: jest.fn() }, errorMessage: () => "Failed" }));

const fact = { id: "fact", facility_name: "Wardha Clinic", visit_date: "2026-09-09", gestational_week: 22, status: "unverified" };
test("voice matching uses word boundaries and tolerates facility keywords", () => {
  expect(matchesFact("I visited Wardha yesterday", fact)).toBe(true);
  expect(matchesFact("I am 22 weeks", fact)).toBe(true);
  expect(matchesFact("122", fact)).toBe(false);
  expect(matchesFact("hello", {})).toBe(false);
});
test("unsupported browser provides a manual verification fallback", () => {
  render(<VoiceVerification fact={fact} />);
  fireEvent.click(screen.getByRole("button", { name: /Patient voice/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
});
test("transcript requires review before saving patient_voice", async () => {
  let speech;
  window.SpeechRecognition = function () { speech = this; this.start = jest.fn(); this.abort = jest.fn(); };
  API.post.mockResolvedValue({});
  const refresh = jest.fn();
  render(<VoiceVerification fact={fact} onVerified={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: /Patient voice/ }));
  const { act } = require("@testing-library/react");
  act(() => { speech.onresult({ results: [[{ transcript: "Wardha Clinic" }]] }); speech.onend(); });
  expect(API.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm patient response" }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(API.post).toHaveBeenCalledWith("/verify/fact/confirm", { source_type: "patient_voice", value: "Wardha Clinic" });
  delete window.SpeechRecognition;
});
