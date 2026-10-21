import React from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react';
export default function EmptyState({title='Kayıt bulunamadı',description,children}){return <div className="empty"><MagnifyingGlass size={30}/><h3>{title}</h3>{description&&<p>{description}</p>}{children}</div>}
