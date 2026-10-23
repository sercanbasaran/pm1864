import React from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import { parentFor } from "../../app/modules.js";

export default function PlannedModule({ module, onNavigate }) {
  const parent = parentFor(module.id);
  return (
    <Card className="panel">
      <h2>{module.label} altyapısı</h2>
      <SlAlert open variant="neutral">
        Hazırlık aşamasında. Bu alt modülün navigasyon ve sayfa yapısı hazır;
        kayıt oluşturma ve düzenleme işlemleri henüz devrede değil.
      </SlAlert>
      <p>{module.description}</p>
      <Button type="button" onClick={() => onNavigate(parent.id)}>
        {parent.label} ana modülüne dön
      </Button>
    </Card>
  );
}
