import Card from '../components/ui/Card.jsx';
import EditorPage from '../components/layout/EditorPage.jsx';
import ShoelaceTheme from '../theme/ShoelaceTheme.jsx';
import Notification from '../components/ui/Notification.jsx';
import {Button} from '../components/ui/Controls.jsx';
import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Info,X} from '@phosphor-icons/react';
import {CatalogProvider,useCatalog} from './CatalogContext.jsx';
import {modules,legacyPages} from './modules.js';
import {can,roleFor} from '../permissions.js';
import {selectable} from '../hierarchy.js';
import {newVariant} from '../modules/variants/VariantFields.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import Modal from '../components/ui/Modal.jsx';
import ModuleBoundary from '../components/ui/ModuleBoundary.jsx';
import ProductEditor from '../modules/products/ProductEditor.jsx';
import BulkPriceDialog from '../modules/pricing/BulkPriceDialog.jsx';
const CategoryManagement=lazy(()=>import('../modules/categories/CategoryManagement.jsx'));
const ProductManagement=lazy(()=>import('../modules/products/ProductManagement.jsx'));
const VariantManagement=lazy(()=>import('../modules/variants/VariantManagement.jsx'));
const CodeManagement=lazy(()=>import('../modules/codes/CodeManagement.jsx'));
const UserManagement=lazy(()=>import('../modules/users/UserManagement.jsx'));
const MediaManagement=lazy(()=>import('../modules/media/MediaManagement.jsx'));
const PriceManagement=lazy(()=>import('../modules/pricing/PriceManagement.jsx'));
const Overview=lazy(()=>import('../modules/overview/Overview.jsx'));
const ActivityLog=lazy(()=>import('../modules/activity/ActivityLog.jsx'));
const HelpCenter=lazy(()=>import('../modules/help/HelpCenter.jsx'));
const ProfileForm=lazy(()=>import('../modules/account/ProfileForm.jsx'));
import PasswordForm from '../modules/account/PasswordForm.jsx';
import {request} from '../api.js';
export function App({snapshot,user,onLogout,onUserUpdated}){
 const [toast,setToast]=useState('');useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast]);
 return <ShoelaceTheme><CatalogProvider snapshot={snapshot} notify={setToast}><Workspace user={user} onLogout={onLogout} onUserUpdated={onUserUpdated}/><Notification message={toast} onClose={()=>setToast('')}/></CatalogProvider></ShoelaceTheme>;
}
function ProfileSection({focused,children}){const ref=useRef(null);useEffect(()=>{if(!focused)return;const frame=requestAnimationFrame(()=>ref.current?.focus());return()=>cancelAnimationFrame(frame)},[focused]);return <section ref={ref} id="profile-information" tabIndex={-1} aria-label="Profil bilgileri">{children}</section>}
function Workspace({user,onLogout,onUserUpdated}){
 const catalog=useCatalog(),{products,categories,logs,settings,busy,mutate,notify}=catalog;
 const allowed=id=>modules.some(m=>m.id===id&&can(user,m.permission));
 const initial=window.location.hash.slice(1);const [route,setRoute]=useState(allowed(initial.split(/[/?]/)[0])?initial:'overview'),[focus,setFocus]=useState(null),[bulk,setBulk]=useState(null),[notifications,setNotifications]=useState(false);
 const [path,search='']=route.split('?'),[page,record,action]=path.split('/'),params=new URLSearchParams(search);
 useEffect(()=>{const changed=()=>{const next=window.location.hash.slice(1);setRoute(allowed(next.split(/[/?]/)[0])?next:'overview')};window.addEventListener('hashchange',changed);window.addEventListener('popstate',changed);return()=>{window.removeEventListener('hashchange',changed);window.removeEventListener('popstate',changed)}},[user.role]);
 function navigate(next,{replace=false}={}){const id=legacyPages[next]||next;if(!allowed(id.split(/[/?]/)[0])){notify('Bu bölüme erişim yetkiniz yok.');return}setRoute(id);window.history[replace?'replaceState':'pushState'](null,'','#'+id)}
 function closeEditor(){navigate(page,{replace:true})}
 function browse(filters={}){setFocus({...filters});navigate('products')}
 function open(product,variants=false,append=false){navigate((variants?'variants':'products')+'/'+product.id+'/edit'+(variants?'?tab=variants'+(append?'&append=1':''):''))}
 function create(categoryId){if(!can(user,'products.write'))return;const category=categories.find(c=>c.id===categoryId&&selectable(c,categories))||categories.find(c=>selectable(c,categories));if(!category){notify('Ürün eklemek için önce aktif bir ana kategori ve alt kategori oluşturun.');navigate('categories');return}navigate('products/new?category='+encodeURIComponent(category.id))}
 let editing=null;
 if(['products','variants'].includes(page)&&record){
  const category=categories.find(c=>c.id===params.get('category')&&selectable(c,categories))||categories.find(c=>selectable(c,categories));
  const product=record==='new'?(category?{isNew:true,name:'',categoryId:category.id,category:category.name,status:'Taslak',description:'',allergens:'',customImage:'',variants:[{...newVariant(),size:'Standart'}]}:null):products.find(p=>String(p.id)===record&&action==='edit');
  if(product)editing={product:params.get('append')==='1'?{...structuredClone(product),variants:[...structuredClone(product.variants),newVariant()]}:product,tab:params.get('tab')==='variants'?'Varyant & fiyat':'Genel bilgiler'};
 }
 async function saveCategory(category,isNew){try{await mutate('/categories'+(isNew?'':'/'+category.id),{category},isNew?'POST':'PUT');notify('Kategori kaydedildi.');return true}catch(e){notify(e.message);return false}}
 async function savePrices(id,prices){try{await mutate('/prices/products/'+id,{prices},'PATCH');notify('Varyant fiyatları kaydedildi.');return true}catch(e){notify(e.message);return false}}
 const onBulk=ids=>{if(ids.length)setBulk(ids)};
 const content={
  categories:<CategoryManagement route={route} onNavigate={navigate} onClose={closeEditor} categories={categories} products={products} onSave={saveCategory} onProducts={category=>browse({category})} onNewProduct={create} skuPrefix={settings.skuPrefix} readOnly={!can(user,'categories.write')} canCreateProduct={can(user,'products.write')}/>,
  products:<ProductManagement user={user} focus={focus} onEdit={p=>open(p)} onNew={create} onBulk={onBulk}/>,
  variants:<VariantManagement products={products} categories={categories} canWrite={can(user,'products.write')} onEdit={(p,append)=>open(p,true,append)}/>,
  codes:<CodeManagement user={user}/>,users:<UserManagement route={route} onNavigate={navigate} onClose={closeEditor} user={user} onChanged={async()=>onUserUpdated((await request('/session')).user)}/>,media:<MediaManagement user={user}/>,
  prices:<PriceManagement products={products} categories={categories} canWrite={can(user,'prices.write')} onSave={savePrices} onBulk={onBulk} busy={busy}/>,
  overview:<Overview products={products} categories={categories} logs={logs} onBrowse={browse} onActivity={()=>navigate('activity')} onNewProduct={create} canCreate={can(user,'products.write')}/>,activity:<ActivityLog logs={logs}/>,help:<HelpCenter user={user} onNavigate={navigate}/>,
  account:<Card className="panel account-panel"><div className="panel-title"><div><h2>{user.name}</h2><p className="muted">{user.email}</p></div><span className="role-badge">{roleFor(user.role)?.name}</span></div><ProfileSection focused={params.get('section')==='profile'}><ProfileForm user={user} onChanged={onUserUpdated}/></ProfileSection><PasswordForm user={user} onChanged={onUserUpdated}/></Card>
 };
 return <AppShell user={user} page={page} onNavigate={navigate} onLogout={onLogout} onNotifications={()=>setNotifications(true)}><ModuleBoundary module={page}><Suspense fallback={<Card className="panel" role="status">Bölüm yükleniyor…</Card>}>{allowed(page)?(['products','variants'].includes(page)&&record?(editing&&!(record==='new'&&!can(user,'products.write'))?<ProductEditor key={route} product={editing.product} tab={editing.tab} readOnly={!can(user,'products.write')} onClose={closeEditor}/>:<EditorPage title="Kayıt bulunamadı" onClose={closeEditor}><p>Bu kayıt bulunamadı veya işlem için yetkiniz yok.</p></EditorPage>):content[page]):null}</Suspense></ModuleBoundary>{bulk&&<BulkPriceDialog ids={bulk} onClose={()=>setBulk(null)}/>} {notifications&&<Modal title="Katalog bildirimleri" onClose={()=>setNotifications(false)}><div className="notification-items"><p>Güncel kayıtlardan hesaplanan tamamlanacak işler.</p><Button className="overview-task" onClick={()=>{setNotifications(false);browse({status:'Taslak'})}}><span>Taslak ürünler</span><strong>{products.filter(p=>p.status==='Taslak').length}</strong></Button><Button className="overview-task" onClick={()=>{setNotifications(false);browse({quality:'image'})}}><span>Görseli olmayanlar</span><strong>{products.filter(p=>!p.customImage).length}</strong></Button><Button className="btn full" onClick={()=>{setNotifications(false);navigate('activity')}}>İşlem geçmişini aç</Button></div></Modal>}</AppShell>;
}
