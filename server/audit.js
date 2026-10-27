import { randomUUID } from "node:crypto";
export function audit(doc, title, detail, actor) {
  doc.logs.unshift({
    id: randomUUID(),
    title,
    detail,
    actor,
    time: new Date().toISOString(),
    type: "info",
  });
  doc.logs = doc.logs.slice(0, 1000);
}
