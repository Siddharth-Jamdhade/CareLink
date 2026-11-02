import { render, screen, fireEvent } from "@testing-library/react";
import Welcome from "./pages/Welcome";
import { getConsent, saveConsent, withdrawConsent } from "./consent";
import { readCache, writeCache } from "./api";
import CameraCapture from "./pages/CameraCapture";
jest.mock("react-router-dom", () => ({ useParams: () => ({ id: "demo" }), useNavigate: () => jest.fn() }));

beforeEach(() => localStorage.clear());

test("requires explicit consent and permits declining without saving", () => {
  const onAccept = jest.fn();
  render(<Welcome onAccept={onAccept} />);
  expect(screen.getByRole("button", { name: /Agree and continue/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(getConsent()).toBeNull();
  expect(onAccept).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText(/I understand and agree/));
  fireEvent.click(screen.getByRole("button", { name: /Agree and continue/ }));
  expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ accepted: true, offline: false, version: 1 }));
});

test("patient caching remains disabled even after consent; withdrawal clears old caches", () => {
  writeCache("patients", [{ name: "Synthetic" }]);
  expect(readCache("patients")).toBeNull();
  saveConsent(true);
  writeCache("patients", [{ name: "Synthetic" }]);
  expect(readCache("patients")).toBeNull();
  expect(Object.keys(localStorage).filter(key => key.endsWith(":patients"))).toHaveLength(0);
  localStorage.setItem("https://other.example:journey-demo", "{}");
  localStorage.setItem("unrelated", "preserved");
  withdrawConsent();
  expect(getConsent()).toBeNull();
  expect(readCache("patients")).toBeNull();
  expect(localStorage.getItem("https://other.example:journey-demo")).toBeNull();
  expect(localStorage.getItem("unrelated")).toBe("preserved");
});

test("turning off offline access deletes previous saved patient information", () => {
  saveConsent(true);
  writeCache("patients", [{ name: "Synthetic" }]);
  saveConsent(false);
  expect(Object.keys(localStorage).filter(key => key.endsWith(":patients"))).toHaveLength(0);
});

test("camera and gallery require a separate record-processing confirmation", () => {
  render(<CameraCapture />);
  expect(screen.getByRole("button", { name: "Start camera" })).toBeDisabled();
  expect(screen.getByLabelText("Upload record from gallery")).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/I have permission/));
  expect(screen.getByRole("button", { name: "Start camera" })).toBeEnabled();
  expect(screen.getByLabelText("Upload record from gallery")).toBeEnabled();
});
