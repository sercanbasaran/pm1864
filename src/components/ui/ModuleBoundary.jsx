import React from 'react';
export default class ModuleBoundary extends React.Component{
 state={failed:false};static getDerivedStateFromError(){return {failed:true}}
 componentDidUpdate(before){if(before.module!==this.props.module&&this.state.failed)this.setState({failed:false})}
 render(){return this.state.failed?<section className="panel"><h2>Bölüm yüklenemedi</h2><p>Bağlantınızı kontrol edip sayfayı yenileyin.</p><button className="btn" onClick={()=>window.location.reload()}>Sayfayı yenile</button></section>:this.props.children}
}
