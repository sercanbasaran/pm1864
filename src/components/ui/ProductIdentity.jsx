import React from 'react';
import {Button} from './Controls.jsx';
import ProductImage from './ProductImage.jsx';
import './product-identity.css';
export default function ProductIdentity({product,children,className='',textClassName='',...props}) {
 return <Button type="button" {...props} className={`product-cell ${className}`.trim()}>
  <ProductImage product={product}/>
  <div className={`product-cell-text ${textClassName}`.trim()}>{children}</div>
 </Button>;
}
