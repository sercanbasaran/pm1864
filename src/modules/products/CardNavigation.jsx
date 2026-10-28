import React from 'react';
import {ArrowLeft,ArrowRight} from '@phosphor-icons/react';
import {Button} from '../../components/ui/Controls.jsx';
export default function CardNavigation({navigation,onNavigate}) {
 if(!navigation?.previous&&!navigation?.next)return null;
 return <nav className="card-record-navigation product-pdf-action" aria-label="Kartlar arasında geçiş">
  {['previous','next'].map(direction=>{const row=navigation[direction],previous=direction==='previous';return <Button key={direction} type="button" disabled={!row} href={!onNavigate&&row?row.href:undefined} onClick={onNavigate&&row?()=>onNavigate(row.route):undefined} aria-label={previous?'Önceki kart':'Sonraki kart'} title={row?.name}>
   {previous&&<ArrowLeft size={18}/>} {previous?'Önceki':'Sonraki'} {row&&<span className="card-neighbor-name">{row.name}</span>} {!previous&&<ArrowRight size={18}/>}
  </Button>;})}
 </nav>;
}
