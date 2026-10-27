// Parsing has an isolated global scope and a deadline so malformed spreadsheets
// cannot block the application's main thread indefinitely.
export function readProductWorkbook(buffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./product-import.worker.js", import.meta.url),
      { type: "module" },
    );
    const finish = (error, rows) => {
      clearTimeout(timer);
      worker.terminate();
      error ? reject(new Error(error)) : resolve(rows);
    };
    const timer = setTimeout(
      () =>
        finish(
          "Dosyanın işlenmesi çok uzun sürdü. Daha küçük bir dosya deneyin.",
        ),
      10000,
    );
    worker.onmessage = ({ data }) => finish(data.error, data.rows);
    worker.onerror = () => finish("Dosya okunamadı.");
    worker.postMessage(buffer, [buffer]);
  });
}
