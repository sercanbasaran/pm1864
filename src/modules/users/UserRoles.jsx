import React from "react";
import { ShieldCheck, Check, X } from "@phosphor-icons/react";
import Card from "../../components/ui/Card.jsx";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import { roles, permissionLabels } from "../../permissions.js";

export default function UserRoles() {
  return (
    <Card className="panel permission-panel">
      <div className="panel-title">
        <div>
          <div className="eyebrow">YETKİ MİMARİSİ</div>
          <h2>Roller ve izinler</h2>
        </div>
        <ShieldCheck size={25} />
      </div>
      <div className="role-descriptions">
        {roles.map((r) => (
          <Card key={r.id}>
            <strong>{r.name}</strong>
            <p>{r.description}</p>
          </Card>
        ))}
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Kaydırılabilir tablo"
      >
        <Table className="permission-table">
          <TableHead>
            <TableRow>
              <TableHeading>YETKİ</TableHeading>
              {roles.map((r) => (
                <TableHeading key={r.id}>{r.name}</TableHeading>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(permissionLabels).map(([id, label]) => (
              <TableRow key={id}>
                <TableCell>{label}</TableCell>
                {roles.map((r) => (
                  <TableCell key={r.id}>
                    <span
                      aria-label={
                        r.permissions.includes(id) ? "İzin var" : "İzin yok"
                      }
                    >
                      {r.permissions.includes(id) ? (
                        <Check size={17} />
                      ) : (
                        <X size={16} />
                      )}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="muted">
        Roller merkezi olarak tanımlıdır. Her API isteğinde sunucu tarafından
        doğrulanır.
      </p>
    </Card>
  );
}
