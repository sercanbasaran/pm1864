import { afterEach, test, expect, vi } from "vitest";
import { readProductWorkbook } from "../src/modules/products/read-product-workbook.js";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
test("Excel worker sonucu alındığında sonlandırılır", async () => {
  let worker;
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        worker = this;
      }
      postMessage = vi.fn();
      terminate = vi.fn();
    },
  );
  const result = readProductWorkbook(new ArrayBuffer(4));
  worker.onmessage({ data: { rows: [{ "Ürün adı": "Baklava" }] } });
  expect(await result).toEqual([{ "Ürün adı": "Baklava" }]);
  expect(worker.terminate).toHaveBeenCalledOnce();
});
test("yanıt vermeyen Excel worker süre aşımında sonlandırılır", async () => {
  vi.useFakeTimers();
  let worker;
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        worker = this;
      }
      postMessage = vi.fn();
      terminate = vi.fn();
    },
  );
  const result = readProductWorkbook(new ArrayBuffer(4));
  const failure = expect(result).rejects.toThrow("çok uzun");
  await vi.advanceTimersByTimeAsync(10000);
  await failure;
  expect(worker.terminate).toHaveBeenCalledOnce();
});
