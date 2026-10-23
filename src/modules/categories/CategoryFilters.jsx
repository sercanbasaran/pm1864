import React from "react";
import { Button, Select } from "../../components/ui/Controls.jsx";
import { roots } from "../../hierarchy.js";
import { salesChannels } from "../../sales-availability.js";
import { emptyCategoryFilters } from "./category-list.js";

export default function CategoryFilters({ categories, filters, onChange }) {
  const field = (key, label, options) => (
    <Select
      label={label}
      value={filters[key]}
      onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
    >
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </Select>
  );
  return (
    <div className="category-filters">
      {field("parent", "Ana kategori", [
        ["", "Tüm ana kategoriler"],
        ...roots(categories).map((c) => [c.id, `${c.name} (${c.code})`]),
      ])}
      {field("type", "Kategori türü", [
        ["", "Tüm türler"],
        ["main", "Ana kategori"],
        ["child", "Alt kategori"],
      ])}
      {field("status", "Kategori durumu", [
        ["", "Tüm durumlar"],
        ["active", "Aktif"],
        ["inactive", "Pasif"],
      ])}
      {field("channel", "Satış kanalı", [
        ["", "Tüm kanallar"],
        ...salesChannels.map((c) => [c.key, c.label]),
      ])}
      <Select
        label="Kanal durumu"
        value={filters.channelState}
        disabled={!filters.channel}
        onChange={(e) => onChange({ ...filters, channelState: e.target.value })}
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
  );
}
