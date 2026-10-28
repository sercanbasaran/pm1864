import React from 'react';
import {Input,Button} from '../../components/ui/Controls.jsx';
import {dimensionFields,productDimensionsLabel} from '../../product-dimensions.js';
export default function ProductDimensions({value,editing=false,onChange}) {
 if(!editing)return <span>{productDimensionsLabel(value)||'Ölçü bilgisi eklenmedi.'}</span>;
 return <div className="product-dimensions-fields">
  <div className="editor-fields">{dimensionFields.map(([key,label])=><Input key={key} label={`${label} (mm)`} type="number" min={0.01} max={100000} step="any" value={value?.[key]??''} onChange={e=>onChange({...value,[key]:e.target.value===''?null:Number(e.target.value)})}/>)}</div>
  <p className="input-help">Tek bir ürünün fiziksel ölçülerini mm cinsinden girin. Alanlar isteğe bağlıdır; el yapımı ürünlerde ölçüler yaklaşık değerlerdir.</p>
  {value&&<Button type="button" size="small" onClick={()=>onChange(null)}>Ölçüleri temizle</Button>}
 </div>;
}
