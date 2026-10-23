import { categoryMatches, roots } from "../../hierarchy.js";
import {
  categorySalesAvailability,
  salesChannels,
} from "../../sales-availability.js";

export const emptyCategoryFilters = {
  query: "",
  parent: [],
  type: [],
  status: "",
  channel: [],
  channelState: "enabled",
  quality: [],
};
export function categoryProductCount(category, categories, products) {
  return products.filter((p) =>
    category.parentId
      ? p.categoryId === category.id
      : categoryMatches(p, category.id, categories),
  ).length;
}
export function categoryActive(category, categories) {
  return (
    !!category.active &&
    (!category.parentId ||
      !!categories.find((c) => c.id === category.parentId)?.active)
  );
}
export function categoryQuality(category, categories, products) {
  return {
    description: !category.description?.trim(),
    identity:
      !category.name?.trim() ||
      !(category.parentId ? /^\d{3}$/ : /^\d{4}$/).test(category.code || "") ||
      !category.slug?.trim() ||
      (!!category.parentId &&
        !categories.some((c) => c.id === category.parentId)),
    empty: categoryProductCount(category, categories, products) === 0,
  };
}
export function categorySummary(categories, products) {
  return {
    channels: salesChannels.map((channel) => {
      const enabled = categories.filter(
        (c) => categorySalesAvailability(c, categories)[channel.key],
      );
      return {
        ...channel,
        main: enabled.filter((c) => !c.parentId).length,
        children: enabled.filter((c) => c.parentId).length,
      };
    }),
    quality: Object.fromEntries(
      ["description", "identity", "empty"].map((key) => [
        key,
        categories.filter((c) => categoryQuality(c, categories, products)[key])
          .length,
      ]),
    ),
  };
}
export function categoryRows(
  categories,
  products,
  filters = emptyCategoryFilters,
  sort = { key: "code", direction: "asc" },
) {
  const f = { ...emptyCategoryFilters, ...filters };
  const selected = (value) =>
    Array.isArray(value) ? value : value ? [value] : [];
  const any = (value, predicate) =>
    !selected(value).length || selected(value).some(predicate);
  const matches = (c) => {
    const text = `${c.name} ${c.code}`.toLocaleLowerCase("tr");
    return (
      text.includes(f.query.trim().toLocaleLowerCase("tr")) &&
      any(f.parent, (id) => c.id === id || c.parentId === id) &&
      any(f.type, (type) => (type === "main" ? !c.parentId : !!c.parentId)) &&
      (!f.status ||
        categoryActive(c, categories) === (f.status === "active")) &&
      any(
        f.channel,
        (channel) =>
          categorySalesAvailability(c, categories)[channel] ===
          (f.channelState === "enabled"),
      ) &&
      any(
        f.quality,
        (quality) => categoryQuality(c, categories, products)[quality],
      )
    );
  };
  const value = (c) => {
    switch (sort.key) {
      case "count":
        return categoryProductCount(c, categories, products);
      case "status":
        return Number(categoryActive(c, categories));
      case "type":
        return Number(!!c.parentId);
      case "channels":
        return Object.values(categorySalesAvailability(c, categories)).filter(
          Boolean,
        ).length;
      default:
        return c[sort.key] || "";
    }
  };
  const compare = (a, b) => {
    const x = value(a),
      y = value(b);
    const result =
      typeof x === "number"
        ? x - y
        : String(x).localeCompare(String(y), "tr", { numeric: true });
    return (
      (sort.direction === "desc" ? -result : result) ||
      String(a.id).localeCompare(String(b.id))
    );
  };
  // Keep hierarchy for the default order; explicit column sorts order all results.
  if (sort.key !== "hierarchy") return categories.filter(matches).sort(compare);
  return roots(categories)
    .sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true }))
    .flatMap((root) => [
      root,
      ...categories
        .filter((c) => c.parentId === root.id)
        .sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true })),
    ])
    .filter(matches);
}
