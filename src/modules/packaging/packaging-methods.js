export const defaultPackagingMethods = () => [
  { id: "method-metal", name: "Metal kutu", kind: "metal", active: true },
  {
    id: "method-cardboard",
    name: "Karton kutu",
    kind: "cardboard",
    active: true,
  },
  { id: "method-plated", name: "Tabakta servis", kind: "plated", active: true },
];
export const packagingMethodName = (methods, kind) =>
  (methods ?? defaultPackagingMethods()).find((method) => method.kind === kind)
    ?.name || "";
export function resolvePackagingMethod(
  value,
  methods = defaultPackagingMethods(),
) {
  return (
    methods.find((m) => m.name === value) ||
    methods.find(
      (m) =>
        m.kind ===
        defaultPackagingMethods().find((d) => d.name === value)?.kind,
    )
  );
}
export const packagingMethodOptions = (methods, current = "") =>
  (methods ?? defaultPackagingMethods())
    .filter((m) => m.active || m.name === current)
    .map((m) => m.name);
export function upgradePackagingMethods(doc) {
  if (Array.isArray(doc.packagingMethods)) return false;
  doc.packagingMethods = defaultPackagingMethods();
  for (const p of doc.products || [])
    for (const v of p.variants || []) {
      const name = typeof v.packaging === "string" ? v.packaging.trim() : "";
      if (name && !doc.packagingMethods.some((m) => m.name === name))
        doc.packagingMethods.push({
          id: `method-legacy-${doc.packagingMethods.length}`,
          name,
          kind: "custom",
          active: true,
        });
    }
  return true;
}
