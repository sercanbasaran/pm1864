import React from "react";
import {test, expect, vi, afterEach} from "vitest";
import {render, cleanup} from "@testing-library/react";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import {CatalogProvider} from "../src/app/CatalogContext.jsx";
import {moduleFor, parentFor} from "../src/app/modules.js";
import {settle} from "./shadow-queries.js";
afterEach(cleanup);
test("varyant tipleri sistem ayarları altında, varyant listesi ayrı gösterilir",async()=>{
 expect(parentFor("variant-types").id).toBe("system-settings");
 expect(moduleFor("variant-types").label).toBe("Varyant tipleri");
 render(<CatalogProvider snapshot={{revision:0,products:[],categories:[],variantTypes:[]}} notify={vi.fn()}><VariantManagement products={[]} categories={[]} canWrite onEdit={vi.fn()} onCard={vi.fn()} /></CatalogProvider>);await settle();
 expect(document.querySelector('sl-tab-group')).toBeNull();
 expect(document.querySelector('.variant-manager').textContent).toContain('Varyant yönetimi');
 expect(document.querySelector('.variant-type-manager')).toBeNull();
});
