import { TextDecoder, TextEncoder } from "util";
import { streamExtraction } from "./streamExtraction";
import API from "./api";
jest.mock("./api", () => ({ __esModule: true, default: { post: jest.fn() }, backendOrigin: () => "http://localhost:8000" }));

const original = { fetch: window.fetch, ReadableStream: window.ReadableStream, TextDecoder: window.TextDecoder };
afterEach(() => { Object.assign(window, original); jest.clearAllMocks(); });
function setup(chunks) {
  window.ReadableStream = function () {};
  window.TextDecoder = TextDecoder;
  const reader = { read: jest.fn(), cancel: jest.fn().mockResolvedValue(), releaseLock: jest.fn() };
  chunks.forEach(chunk => reader.read.mockResolvedValueOnce({ value: new TextEncoder().encode(chunk), done: false }));
  reader.read.mockResolvedValue({ done: true });
  window.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: { getReader: () => reader } });
}
test("parses events split across network chunks", async () => {
  setup(['event: field\ndata: {"field":"facility_name",', '"value":"Clinic"}\n\nevent: done\ndata: {"record_id":"saved"}\n', '\n']);
  const event = jest.fn();
  expect(await streamExtraction("patient", new FormData(), undefined, event)).toEqual({ data: { record_id: "saved" } });
  expect(event).toHaveBeenCalledWith("field", { field: "facility_name", value: "Clinic" });
  expect(API.post).not.toHaveBeenCalled();
});
test("interruption never reuploads a potentially committed record", async () => {
  setup(['event: status\ndata: {"step":"conflict"}\n\n']);
  await expect(streamExtraction("patient", new FormData(), undefined, jest.fn())).rejects.toThrow("Check the journey");
  expect(API.post).not.toHaveBeenCalled();
});
test("older server safely falls back to original upload", async () => {
  setup([]); window.fetch.mockResolvedValue({ status: 404 });
  API.post.mockResolvedValue({ data: { record_id: "saved" } });
  await streamExtraction("patient", new FormData(), undefined, jest.fn());
  expect(API.post).toHaveBeenCalledTimes(1);
});
