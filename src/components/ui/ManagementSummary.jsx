import React from 'react';
import Card from './Card.jsx';
export default function ManagementSummary({label,items,title,description,action}){
 return <div className="management-summary" aria-label={label} style={{'--summary-columns':items.length+(action?1:0)}}>
  {items.map(item=><Card key={item.label}><div className="management-summary-stat"><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div></Card>)}
  {action&&<Card><div className="management-summary-create"><strong>{title}</strong><p>{description}</p>{action}</div></Card>}
 </div>;
}
