import { ApiError } from "../errors.js";

export async function readJsonBody(request, limit) {
  const type = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (type !== "application/json")
    throw new ApiError(415, "JSON içerik gerekli.");
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit)
    throw new ApiError(413, "İstek boyutu sınırı aşıldı.");
  const reader = request.body?.getReader();
  const chunks = [];
  let bytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) {
          await reader.cancel().catch(() => {});
          throw new ApiError(413, "İstek boyutu sınırı aşıldı.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
  } catch {
    throw new ApiError(400, "Geçersiz JSON.");
  }
  if (!body || Array.isArray(body) || typeof body !== "object")
    throw new ApiError(400, "JSON nesnesi gerekli.");
  return body;
}
