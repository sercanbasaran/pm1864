import React from 'react';
import {Box} from '@mui/material';
export default function ActionBar({position='top',children}){
 if(!children)return null;
 return <Box className={'card-action-bar card-action-'+position} role="group" aria-label={position==='top'?'Üst aksiyonlar':'Alt aksiyonlar'} sx={{display:'flex',justifyContent:'flex-end',alignItems:'center',flexWrap:'wrap',gap:1,py:1.5,borderColor:'divider',...(position==='top'?{borderBottom:1,mb:2}:{borderTop:1,mt:2}),'& .MuiButton-root':{width:{xs:'100%',sm:'auto'}}}}>{children}</Box>;
}
