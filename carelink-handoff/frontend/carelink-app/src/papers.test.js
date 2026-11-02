import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CameraCapture from "./pages/CameraCapture";
import API from "./api";
jest.mock("react-router-dom", () => ({ useParams: () => ({ id: "demo" }), useNavigate: () => jest.fn() }));
jest.mock("./api", () => ({ __esModule: true, default: { post: jest.fn() }, errorMessage: () => "AI quota reached." }));
beforeEach(() => jest.clearAllMocks());

test("processes multiple papers independently and retries only failed papers", async () => {
  API.post.mockResolvedValueOnce({ data: { extracted_data: { document_type: "ANC Card" } } })
    .mockRejectedValueOnce({ response: { status: 502 } })
    .mockResolvedValueOnce({ data: { extracted_data: { document_type: "Prescription" } } });
  render(<CameraCapture />);
  fireEvent.click(screen.getByLabelText(/I have permission/));
  fireEvent.change(screen.getByLabelText("Upload record from gallery"), { target: { files: [
    new File(["image"], "first.png", { type: "image/png" }),
    new File(["image"], "second.png", { type: "image/png" }),
  ] } });
  fireEvent.click(screen.getByRole("button", { name: "Extract selected papers" }));
  expect(await screen.findByText("1/2 saved")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry failed papers" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Retry failed papers" }));
  expect(await screen.findByText("2/2 saved")).toBeInTheDocument();
  expect(API.post).toHaveBeenCalledTimes(3);
  expect(API.post.mock.calls.map(call => call[1].get("file").name)).toEqual(["first.png", "second.png", "second.png"]);
});

test("does not automatically retry an upload with an unknown server outcome", async () => {
  API.post.mockRejectedValue(new Error("timeout"));
  render(<CameraCapture />);
  fireEvent.click(screen.getByLabelText(/I have permission/));
  fireEvent.change(screen.getByLabelText("Upload record from gallery"), { target: { files: [new File(["image"], "paper.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Extract selected papers" }));
  expect(await screen.findByText(/This paper may have been saved/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Extract selected papers" })).toBeDisabled();
  expect(API.post).toHaveBeenCalledTimes(1);
});
