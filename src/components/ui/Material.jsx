import React,{forwardRef} from 'react';
import {Button,IconButton,InputBase,Checkbox,NativeSelect,Table,TableHead,TableBody,TableRow,TableCell} from '@mui/material';
export const MaterialButton=forwardRef(function MaterialButton({className='',children,...props},ref){
 const icon=className.includes('icon-btn');
 const Component=icon?IconButton:Button;
 return <Component ref={ref} type="submit" className={className} variant={icon?undefined:/dark|primary/.test(className)?'contained':'text'} {...props}>{children}</Component>;
});
export const MaterialInput=forwardRef(function MaterialInput({type='text',className='',...props},ref){
 if(type==='hidden'||type==='file')return <input ref={ref} type={type} className={className} {...props}/>;
 if(type==='checkbox'||type==='radio'){
  const {'aria-label':label,...rest}=props;
  return <Checkbox inputRef={ref} className={className} slotProps={{input:{'aria-label':label}}} {...rest}/>;
 }
 const {'aria-label':label,min,max,step,pattern,maxLength,minLength,...rest}=props;
 return <InputBase inputRef={ref} type={type} className={'material-input '+className} inputProps={{'aria-label':label,min,max,step,pattern,maxLength,minLength}} {...rest}/>;
});
export const MaterialSelect=forwardRef(function MaterialSelect({'aria-label':label,className='',children,...props},ref){return <NativeSelect inputRef={ref} className={'material-select '+className} disableUnderline inputProps={{'aria-label':label}} {...props}>{children}</NativeSelect>});
export const MaterialTextarea=forwardRef(function MaterialTextarea({'aria-label':label,...props},ref){return <InputBase multiline inputRef={ref} className="material-input" inputProps={{'aria-label':label}} {...props}/>});
export const MaterialTable=Table;
export const MaterialTableHead=TableHead;
export const MaterialTableBody=TableBody;
export const MaterialTableRow=TableRow;
export function MaterialTableHeading(props){return <TableCell variant="head" component="th" {...props}/>}
export const MaterialTableCell=TableCell;
