import React, { useState } from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import { Button, Select } from "../../components/ui/Controls.jsx";
import { categoryRows } from "./category-list.js";
import { salesChannels } from "../../sales-availability.js";
import { emptyCategoryFilters } from "./category-list.js";

export default function CategoryFilters({ categories, filters, onChange }) {
  const [open, setOpen] = useState(false);
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
    <SlDetails summary={open ? "Filtreleri Kapat" : "Filtreleri Aç"} onSlShow={() => setOpen(true)} onSlHide={() => setOpen(false)} className="category-filter-accordion">
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
        {field(
          "status",
          "Kategori durumu",
          [
            ["", "Tüm durumlar"],
            ["active", "Aktif"],
            ["inactive", "Pasif"],
          ],
          false,
        )}
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
    </SlDetails>
  );
}
