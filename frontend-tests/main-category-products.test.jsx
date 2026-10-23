import React, { useState } from "react";
import { test, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryFields from "../src/modules/categories/CategoryFields.jsx";

afterEach(cleanup);
const categories = [
  {id:"r",name:"Baklava",code:"0100",active:true},
  {id:"c",name:"Fistikli",code:"101",active:true,parentId:"r"},
  {id:"r2",name:"Lokum",code:"0200",active:true},
];
function Form() {
  const [product,setProduct]=useState({categoryId:"r",category:"Baklava"});
  return <><CategoryFields product={product} categories={categories} onChange={setProduct}/><output>{product.categoryId}:{product.category}</output></>;
}
async function choose(index,value){
  const select=document.querySelectorAll("sl-select")[index];
  select.value=value||"__empty__";
  fireEvent(select,new CustomEvent("sl-change",{bubbles:true}));
  await settle();
}
test("subcategory is optional and clearing it restores the selected root",async()=>{
 render(<Form/>);await settle();
 expect(document.querySelector("output").textContent).toBe("r:Baklava");
 await choose(1,"c");expect(document.querySelector("output").textContent).toBe("c:Fistikli");
 await choose(1,"");expect(document.querySelector("output").textContent).toBe("r:Baklava");
 await choose(0,"r2");expect(document.querySelector("output").textContent).toBe("r2:Lokum");
 expect(document.body.textContent).toContain("SKU alt kategori kodu 000 olur");
});
