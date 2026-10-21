import React,{useId} from 'react';
import {Dialog,DialogTitle,DialogContent,IconButton} from '@mui/material';
import {X} from '@phosphor-icons/react';
export default function Modal({title,onClose,busy=false,children,wide=false}){
 const id=useId();
 return <Dialog open maxWidth={wide?'lg':'sm'} aria-labelledby={id} onClose={(_,reason)=>{if(!busy&&reason!=='backdropClick')onClose()}}><DialogTitle id={id} sx={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:1,borderColor:'divider',fontWeight:700}}>{title}<IconButton disabled={busy} aria-label="Pencereyi kapat" onClick={onClose}><X size={22}/></IconButton></DialogTitle><DialogContent className={wide?'material-editor':'material-dialog'} sx={{p:3}}>{children}</DialogContent></Dialog>;
}
