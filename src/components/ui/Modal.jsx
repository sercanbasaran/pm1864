import React,{useEffect,useRef} from 'react';
import {X} from '@phosphor-icons/react';
export default function Modal({title,onClose,busy=false,children,wide=false}){
 const ref=useRef(null);
 useEffect(()=>{const before=document.activeElement;ref.current?.focus();return()=>before?.focus?.()},[]);
 function keyboard(e){if(e.key==='Escape'&&!busy){e.stopPropagation();onClose()}if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
 return <div className="overlay"><section ref={ref} tabIndex={-1} onKeyDown={keyboard} className={wide?'editor':'modal'} role="dialog" aria-modal="true" aria-label={title}><div className="editor-header"><h2>{title}</h2><button type="button" className="icon-btn" disabled={busy} aria-label="Pencereyi kapat" onClick={onClose}><X size={22}/></button></div>{children}</section></div>;
}
