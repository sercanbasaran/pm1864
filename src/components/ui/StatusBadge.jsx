import React from 'react';
import {Chip} from '@mui/material';
export default function StatusBadge({status}){return <Chip size="small" label={status} color={status==='Aktif'?'success':'default'} variant="outlined"/>}
