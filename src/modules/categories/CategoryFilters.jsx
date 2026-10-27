import React from "react";
import { Button, Select } from "../../components/ui/Controls.jsx";
import { categoryRows } from "./category-list.js";
import { salesChannels } from "../../sales-availability.js";
import { emptyCategoryFilters } from "./category-list.js";

export default function CategoryFilters({ categories, filters, onChange, open }) {
  const field = (key, label, options, multiple = true) => (
    <Select
      label={label}
      multiple={multiple}
      clearable={multiple}
      placeholder="Tümü"
      value={filters[key]}
      onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
    >
      {options
        .filter(([value]) => !multiple || value)
        .map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
    </Select>
  );
  return (
    <div id="category-filter-panel" className="category-filter-accordion" hidden={!open}>
      <div className="category-filters">
        {field("type", "Kategori türü", [
          ["", "Tüm türler"],
          ["main", "Ana kategori"],
          ["child", "Alt kategori"],
        ])}
        <Select
          label="Kategori"
          multiple
          clearable
          placeholder="Tüm kategoriler"
          value={filters.parent}
          onChange={(e) => onChange({ ...filters, parent: e.target.value })}
        >
          {categoryRows(categories, [], undefined, {
            key: "hierarchy",
            direction: "asc",
          }).map((c) => (
            <option
              key={c.id}
              value={c.id}
              className={
                c.parentId ? "category-filter-child" : "category-filter-main"
              }
            >
              <span>
                {c.parentId ? "↳ " : ""}
                {c.name}
              </span>{" "}
              <span className="category-filter-code">{c.code}</span>
            </option>
          ))}
        </Select>
        {field("channel", "Satış kanalı", [
          ["", "Tüm kanallar"],
          ...salesChannels.map((c) => [c.key, c.label]),
        ])}
        <Select
          label="Kanal durumu"
          value={filters.channelState}
          disabled={!filters.channel?.length}
          onChange={(e) =>
            onChange({ ...filters, channelState: e.target.value })
          }
        >
          <option value="enabled">Etkin</option>
          <option value="disabled">Devre dışı</option>
        </Select>
        {field("quality", "Tamamlanacak kayıtlar", [
          ["", "Tüm kayıtlar"],
          ["description", "Açıklaması olmayanlar"],
          ["identity", "Temel bilgisi eksik olanlar"],
          ["empty", "Ürün bağlanmamış olanlar"],
        ])}
        <Button
          type="button"
          onClick={() => onChange({ ...emptyCategoryFilters })}
        >
          Filtreleri temizle
        </Button>
      </div>
    </div>
  );
}
