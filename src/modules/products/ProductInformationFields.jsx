import React from 'react';
import {Stack,Typography} from '@mui/material';
import {MaterialTextarea} from '../../components/ui/Material.jsx';
import {productInformationFields} from '../../product-information.js';
export default function ProductInformationFields({product,onChange}){
 return <Stack spacing={3}><div><Typography variant="h2" sx={{mb:1}}>Besin ve saklama bilgileri</Typography><Typography variant="body2" color="text.secondary">Bu bilgiler ürünün tüm varyantları için geçerlidir. Besin değerlerini 100 g temelinde girin.</Typography></div>{productInformationFields.map(field=><div key={field.key}><label>{field.label}<MaterialTextarea rows={field.key==='nutrition'?4:3} maxLength={field.maxLength} placeholder={field.placeholder} value={product[field.key]||''} onChange={e=>onChange({...product,[field.key]:e.target.value})}/></label><Typography variant="caption" color="text.secondary" sx={{display:'block',mt:.5,textAlign:'right'}}>{(product[field.key]||'').length} / {field.maxLength}</Typography></div>)}</Stack>;
}
