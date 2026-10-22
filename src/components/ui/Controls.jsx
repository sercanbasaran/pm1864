import React,{forwardRef,useRef,useLayoutEffect,useState,Children,isValidElement} from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button/index.js';
import SlInput from '@shoelace-style/shoelace/dist/react/input/index.js';
import SlTextarea from '@shoelace-style/shoelace/dist/react/textarea/index.js';
import SlCheckbox from '@shoelace-style/shoelace/dist/react/checkbox/index.js';
import SlSelect from '@shoelace-style/shoelace/dist/react/select/index.js';
import SlOption from '@shoelace-style/shoelace/dist/react/option/index.js';
function useControl(forwarded,label,disabled,autoFocus){
 const ref=useRef(null),[inherited,setInherited]=useState(false);
 useLayoutEffect(()=>{const host=ref.current;if(!host)return;const fieldset=host.closest('fieldset'),outer=host.closest('label');
  const name=label|| (outer?[...outer.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||outer.querySelector('strong')?.textContent:'');
  if(name&&['SL-INPUT','SL-TEXTAREA','SL-SELECT'].includes(host.tagName))host.label=name;
  function sync(){setInherited(!!fieldset?.disabled)}sync();const observer=new MutationObserver(sync);if(fieldset)observer.observe(fieldset,{attributes:true,attributeFilter:['disabled']});
  let alive=true;host.updateComplete?.then(()=>{if(!alive)return;const input=host.shadowRoot?.querySelector('input,textarea,button');if(name&&input)input.setAttribute('aria-label',name);if(autoFocus)host.focus()});
  const focus=e=>{if(e.target===outer)host.focus()};outer?.addEventListener('click',focus);
  return()=>{alive=false;observer.disconnect();outer?.removeEventListener('click',focus)};
 },[label,autoFocus]);
 return {ref:node=>{ref.current=node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)forwarded.current=node},disabled:!!disabled||inherited};
}
export const Button=forwardRef(function Button({className='',children,type='submit',variant,...props},ref){const control=useControl(ref,props['aria-label'],props.disabled);return <SlButton {...props} {...control} type={type} size="small" className={className} variant={variant||(/dark|primary/.test(className)?'primary':className.includes('icon-btn')?'text':'default')} circle={className.includes('icon-btn')}>{children}</SlButton>});
export const Input=forwardRef(function Input({type='text',className='',onChange,readOnly,maxLength,minLength,autoFocus,...props},ref){
 const control=useControl(ref,props['aria-label'],props.disabled,autoFocus);
 if(type==='file'||type==='hidden')return <input ref={ref} type={type} className={className} onChange={onChange} {...props}/>;
 if(type==='checkbox')return <SlCheckbox {...props} {...control} className={className} onSlChange={e=>onChange?.(e)}/>;
 return <SlInput {...props} {...control} className={'ui-input '+className} value={props.value==null?'':String(props.value)} type={type} readonly={readOnly} maxlength={maxLength} minlength={minLength} onSlInput={e=>onChange?.(e)}/>;
});
export const Textarea=forwardRef(function Textarea({onChange,maxLength,minLength,readOnly,autoFocus,...props},ref){const control=useControl(ref,props['aria-label'],props.disabled,autoFocus);return <SlTextarea {...props} {...control} className="ui-textarea" readonly={readOnly} maxlength={maxLength} minlength={minLength} resize="vertical" onSlInput={e=>onChange?.(e)}/>});
const encode=value=>value===''?'__empty__':encodeURIComponent(String(value));
export const Select=forwardRef(function Select({onChange,children,value='',className='',...props},ref){const control=useControl(ref,props['aria-label'],props.disabled);const options=[];function collect(nodes){Children.forEach(nodes,node=>{if(!isValidElement(node))return;if(node.type==='option')options.push(node);else if(node.props.children)collect(node.props.children)})}collect(children);return <SlSelect {...props} {...control} className={'ui-select '+className} value={encode(value)} hoist onSlChange={e=>{const value=e.target.value;onChange?.({target:{value:value==='__empty__'?'':decodeURIComponent(value)},currentTarget:e.currentTarget})}}>{options.map((o,i)=><SlOption key={i} value={encode(o.props.value??o.props.children)} disabled={o.props.disabled}>{o.props.children}</SlOption>)}</SlSelect>});
export const Table=props=><table {...props}/>;
export const TableHead=props=><thead {...props}/>;
export const TableBody=props=><tbody {...props}/>;
export const TableRow=props=><tr {...props}/>;
export const TableHeading=props=><th {...props}/>;
export const TableCell=props=><td {...props}/>;
