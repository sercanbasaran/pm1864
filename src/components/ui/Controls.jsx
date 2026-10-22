import React,{forwardRef,useRef,useLayoutEffect,useState,Children,isValidElement,cloneElement} from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button/index.js';
import SlInput from '@shoelace-style/shoelace/dist/react/input/index.js';
import SlTextarea from '@shoelace-style/shoelace/dist/react/textarea/index.js';
import SlCheckbox from '@shoelace-style/shoelace/dist/react/checkbox/index.js';
import SlSelect from '@shoelace-style/shoelace/dist/react/select/index.js';
import SlOption from '@shoelace-style/shoelace/dist/react/option/index.js';

// Adapt React events and fieldset disabling; visual properties stay at Shoelace defaults.
function useControl(forwarded,label,disabled,autoFocus){
 const ref=useRef(null),[inherited,setInherited]=useState(false);
 useLayoutEffect(()=>{
  const host=ref.current;if(!host)return;
  const fieldset=host.closest('fieldset');
  const sync=()=>setInherited(!!fieldset?.disabled);sync();
  const observer=new MutationObserver(sync);if(fieldset)observer.observe(fieldset,{attributes:true,attributeFilter:['disabled']});
  let alive=true;
  host.updateComplete?.then(()=>{if(!alive)return;const input=host.shadowRoot?.querySelector('input,textarea,button');if(label&&input)input.setAttribute('aria-label',label);if(autoFocus)host.focus()});
  return()=>{alive=false;observer.disconnect()};
 },[label,autoFocus]);
 return {ref:node=>{ref.current=node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)forwarded.current=node},disabled:!!disabled||inherited};
}
export const Button=forwardRef(function Button({className='',children,type='submit',variant,...props},ref){
 const control=useControl(ref,props['aria-label'],props.disabled),items=Children.toArray(children);
 const contents=items.map((child,i)=>isValidElement(child)&&child.props.size&&typeof child.type!=='string'?cloneElement(child,{slot:i===items.length-1&&i>0?'suffix':'prefix'}):child);
 return <SlButton {...props} {...control} type={type} className={className} variant={variant||((className.includes('selected')||className.includes('is-active'))?'primary':'default')} circle={props.circle??className.includes('icon-btn')}>{contents}</SlButton>;
});
export const Input=forwardRef(function Input({type='text',className='',onChange,readOnly,maxLength,minLength,autoFocus,label,children,...props},ref){
 const control=useControl(ref,props['aria-label']||label,props.disabled,autoFocus);
 if(type==='file'||type==='hidden')return <input ref={ref} type={type} className={className} onChange={onChange} {...props}/>;
 if(type==='checkbox')return <SlCheckbox {...props} {...control} className={className} onSlChange={e=>onChange?.(e)}>{label||children}</SlCheckbox>;
 return <SlInput {...props} {...control} className={className} label={label||props['aria-label']} value={props.value==null?'':String(props.value)} type={type} readonly={readOnly} maxlength={maxLength} minlength={minLength} onSlInput={e=>onChange?.(e)}/>;
});
export const Textarea=forwardRef(function Textarea({onChange,maxLength,minLength,readOnly,autoFocus,label,...props},ref){
 const control=useControl(ref,props['aria-label']||label,props.disabled,autoFocus);
 return <SlTextarea {...props} {...control} label={label||props['aria-label']} readonly={readOnly} maxlength={maxLength} minlength={minLength} onSlInput={e=>onChange?.(e)}/>;
});
const encode=value=>value===''?'__empty__':encodeURIComponent(String(value));
export const Select=forwardRef(function Select({onChange,children,value='',className='',label,...props},ref){
 const control=useControl(ref,props['aria-label']||label,props.disabled),options=[];
 function collect(nodes){Children.forEach(nodes,node=>{if(!isValidElement(node))return;if(node.type==='option')options.push(node);else if(node.props.children)collect(node.props.children)})}collect(children);
 return <SlSelect {...props} {...control} className={className} label={label||props['aria-label']} value={encode(value)} hoist onSlChange={e=>{const value=e.target.value;onChange?.({target:{value:value==='__empty__'?'':decodeURIComponent(value)},currentTarget:e.currentTarget})}}>{options.map((o,i)=><SlOption key={i} value={encode(o.props.value??o.props.children)} disabled={o.props.disabled}>{o.props.children}</SlOption>)}</SlSelect>;
});
// Shoelace has no data-table component; semantic tables use layout.css for readability.
export const Table=props=><table {...props}/>;
export const TableHead=props=><thead {...props}/>;
export const TableBody=props=><tbody {...props}/>;
export const TableRow=props=><tr {...props}/>;
export const TableHeading=props=><th {...props}/>;
export const TableCell=props=><td {...props}/>;
