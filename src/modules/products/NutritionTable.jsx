import React, { useState } from "react";
import {
  Input,
  Textarea,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import {
  nutritionRows,
  parseNutrition,
  serializeNutrition,
} from "../../nutrition.js";
export default function NutritionTable({
  value = "",
  onChange,
  editing = false,
}) {
  const initial = parseNutrition(value);
  const [draft, setDraft] = useState(initial);
  const data = editing ? draft : initial;
  function update(values, notes = data.notes) {
    setDraft({ values, notes });
    onChange?.(serializeNutrition(values, notes));
  }
  return (
    <div className="nutrition-table">
      <div
        className="table-scroll"
        role="region"
        aria-label="Besin değerleri tablosu"
        tabIndex={0}
      >
        <Table aria-label="100 g için besin değerleri">
          <TableHead>
            <TableRow>
              <TableHeading scope="col">Besin öğesi</TableHeading>
              <TableHeading scope="col">100 g için</TableHeading>
              <TableHeading scope="col">Birim</TableHeading>
            </TableRow>
          </TableHead>
          <TableBody>
            {nutritionRows.map((row) => (
              <TableRow key={row.key}>
                <TableHeading scope="row">{row.label}</TableHeading>
                <TableCell>
                  {editing ? (
                    <Input
                      aria-label={row.label + " (" + row.unit + ")"}
                      type="number"
                      min={0}
                      step="any"
                      value={data.values[row.key]}
                      onChange={(e) =>
                        update({ ...data.values, [row.key]: e.target.value })
                      }
                    />
                  ) : data.values[row.key] !== "" ? (
                    new Intl.NumberFormat("tr-TR", {
                      maximumFractionDigits: 6,
                    }).format(Number(data.values[row.key]))
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{row.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing ? (
        <Textarea
          label="Ek besin bilgisi"
          value={data.notes}
          maxLength={2000}
          rows={2}
          onChange={(e) => update(data.values, e.target.value)}
        />
      ) : (
        data.notes && <p>{data.notes}</p>
      )}
    </div>
  );
}
