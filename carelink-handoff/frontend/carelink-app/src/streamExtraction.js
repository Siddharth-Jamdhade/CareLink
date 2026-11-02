import API, { backendOrigin } from "./api";

export async function streamExtraction(patientId, form, signal, onEvent) {
  // Older servers/browsers can safely use the original endpoint before streaming starts.
  const fallback = () => API.post(`/records/upload/${patientId}`, form, { signal, timeout: 180000 });
  if (!window.ReadableStream || !window.TextDecoder || !window.fetch) return fallback();
  const response = await fetch(`${backendOrigin()}/api/records/upload-stream/${patientId}`, { method: "POST", body: form, signal, credentials: "include", headers: { "X-CareLink-Client": "1" } });
  if ([404, 405, 501].includes(response.status)) return fallback();
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.detail || "Upload failed"), { response: { data, status: response.status } });
  }
  if (!response.body) throw new Error("Stream interrupted. Check the journey before retrying.");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        const lines = block.split("\n");
        const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
        const dataText = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
        if (!dataText) continue;
        const data = JSON.parse(dataText);
        if (event === "error") throw Object.assign(new Error(data.detail), { response: { data } });
        onEvent(event, data);
        if (event === "done") return { data };
      }
      if (done) throw new Error("Stream interrupted. Check the journey before retrying to avoid duplicates.");
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
