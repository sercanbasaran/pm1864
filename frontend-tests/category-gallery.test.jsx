import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryGallery from "../src/modules/categories/CategoryGallery.jsx";
import { uploadFile } from "../src/modules/media/media-api.js";
vi.mock("../src/modules/media/media-api.js", () => ({ uploadFile: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
test("gallery slides, detaches selected image and uploads multiple images before refreshing and linking", async () => {
  const images = [
    { id: "a", url: "/a.png" },
    { id: "b", url: "/b.png" },
  ];
  const onChange = vi.fn(async () => true),
    onRefresh = vi.fn(async () => ({ categories: [] }));
  render(
    <CategoryGallery
      images={images}
      onChange={onChange}
      onRefresh={onRefresh}
    />,
  );
  await settle();
  fireEvent.click(document.querySelector('[aria-label="Sonraki görsel"]'));
  await settle();
  expect(
    document.querySelector(".category-gallery-track").style.transform,
  ).toBe("translateX(-100%)");
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent === "Kaldır",
    ),
  );
  await settle();
  expect(onChange).toHaveBeenLastCalledWith([images[0]]);
  uploadFile.mockImplementation(async (file) => ({
    asset: { id: file.name, url: "/" + file.name },
  }));
  const files = [
    new File(["a"], "c.png", { type: "image/png" }),
    new File(["b"], "d.png", { type: "image/png" }),
  ];
  fireEvent.change(document.querySelector("input[type=file]"), {
    target: { files },
  });
  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[1][0].map((i) => i.id)).toEqual([
    "a",
    "b",
    "c.png",
    "d.png",
  ]);
  expect(onRefresh.mock.invocationCallOrder[0]).toBeLessThan(
    onChange.mock.invocationCallOrder[1],
  );
});

test("gallery accepts dropped images and ignores drops when disabled", async () => {
  uploadFile.mockImplementation(async file => ({asset:{id:file.name,url:"/"+file.name}}));
  const onChange = vi.fn(async () => true), onRefresh = vi.fn(async () => ({}));
  const {rerender} = render(<CategoryGallery onChange={onChange} onRefresh={onRefresh} />);
  const file = new File(["x"], "drop.png", {type:"image/png"});
  fireEvent.drop(document.querySelector(".category-gallery"), {dataTransfer:{types:["Files"], files:[file]}});
  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  expect(onChange.mock.calls[0][0][0].id).toBe("drop.png");
  rerender(<CategoryGallery onChange={onChange} onRefresh={onRefresh} disabled />);
  fireEvent.drop(document.querySelector(".category-gallery"), {dataTransfer:{types:["Files"], files:[file]}});
  expect(uploadFile).toHaveBeenCalledTimes(1);
});
