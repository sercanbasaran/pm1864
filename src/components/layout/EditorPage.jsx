import React,{useEffect,useRef,useId} from 'react';
import {Paper,Box,Typography,Button} from '@mui/material';
import {ArrowLeft} from '@phosphor-icons/react';
export default function EditorPage({title,onClose,busy=false,children}){
 const ref=useRef(null),id=useId();
 useEffect(()=>{ref.current?.focus()},[]);
 return <Paper component="section" role="region" aria-label={title} className="editor-page" sx={{border:1,borderColor:'divider',borderRadius:3,overflow:'hidden'}}><Box sx={{px:{xs:2,md:3},py:2,borderBottom:1,borderColor:'divider',display:'flex',alignItems:'center',justifyContent:'space-between',gap:2,flexWrap:'wrap'}}><Typography id={id} ref={ref} tabIndex={-1} component="h2" variant="h2">{title}</Typography><Button type="button" disabled={busy} startIcon={<ArrowLeft size={18}/>} onClick={onClose}>Listeye dön</Button></Box><Box sx={{p:{xs:2,md:3}}}>{children}</Box></Paper>;
}
