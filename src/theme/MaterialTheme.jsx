import React from 'react';
import {ThemeProvider,createTheme,CssBaseline} from '@mui/material';
import {trTR} from '@mui/material/locale';
export const materialTheme=createTheme({
 palette:{primary:{main:'#A50000'},secondary:{main:'#9C742E'},background:{default:'#F6F5F2',paper:'#FFFFFF'},text:{primary:'#262321',secondary:'#706B65'},divider:'#E8E4DE',success:{main:'#287650'}},
 typography:{fontFamily:'Avenir, "Segoe UI", sans-serif',h1:{fontSize:'2rem',fontWeight:700},h2:{fontSize:'1.4rem',fontWeight:700},button:{textTransform:'none',fontWeight:600}},
 transitions:{duration:{shortest:120,shorter:160,short:180,standard:200,enteringScreen:200,leavingScreen:160}},
 shape:{borderRadius:12},
 components:{MuiButton:{defaultProps:{disableElevation:true},styleOverrides:{root:{gap:8,minHeight:36}}},MuiInputBase:{styleOverrides:{root:{fontSize:14}}},MuiTableCell:{styleOverrides:{root:{borderColor:'#E8E4DE'},head:{fontSize:11,fontWeight:700,letterSpacing:'.05em',color:'#706B65',background:'#FAF9F7'}}},MuiDialog:{defaultProps:{fullWidth:true,maxWidth:'sm'}},MuiPaper:{defaultProps:{elevation:0}},MuiTooltip:{defaultProps:{arrow:true}}}
},trTR);
export default function MaterialTheme({children}){return <ThemeProvider theme={materialTheme}><CssBaseline/>{children}</ThemeProvider>}
