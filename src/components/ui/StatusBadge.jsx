import React from 'react';
export default function StatusBadge({status}){return <span className={'badge '+(status==='Aktif'?'green':'gray')}><i/>{status}</span>}
