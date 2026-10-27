import { parseProductWorkbook } from "./product-import-parser.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ rows: parseProductWorkbook(data) });
  } catch (error) {
    self.postMessage({ error: error.message || "Dosya okunamadı." });
  }
};
