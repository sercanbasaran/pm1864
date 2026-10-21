import MaterialTheme from '../theme/MaterialTheme.jsx';
import {Snackbar,Alert} from '@mui/material';
import {MaterialButton} from '../components/ui/Material.jsx';
import React,{lazy,Suspense,useEffect,useState} from 'react';
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
 return <MaterialTheme><CatalogProvider snapshot={snapshot} notify={setToast}><Workspace user={user} onLogout={onLogout} onUserUpdated={onUserUpdated}/><Snackbar open={!!toast} autoHideDuration={5000} onClose={()=>setToast('')} anchorOrigin={{vertical:'bottom',horizontal:'right'}}><Alert severity="info" variant="filled" onClose={()=>setToast('')}>{toast}</Alert></Snackbar></CatalogProvider></MaterialTheme>;
}
function Workspace({user,onLogout,onUserUpdated}){
 const catalog=useCatalog(),{products,categories,logs,settings,busy,mutate,notify}=catalog;
 const allowed=id=>modules.some(m=>m.id===id&&can(user,m.permission));
 const initial=window.location.hash.slice(1);const [page,setPage]=useState(allowed(initial)?initial:'overview'),[focus,setFocus]=useState(null),[editing,setEditing]=useState(null),[bulk,setBulk]=useState(null),[notifications,setNotifications]=useState(false);
 useEffect(()=>{const changed=()=>{const id=window.location.hash.slice(1);if(allowed(id))setPage(id)};window.addEventListener('hashchange',changed);window.addEventListener('popstate',changed);return()=>{window.removeEventListener('hashchange',changed);window.removeEventListener('popstate',changed)}},[user.role]);
 function navigate(next){const id=legacyPages[next]||next;if(!allowed(id)){notify('Bu bölüme erişim yetkiniz yok.');return}setPage(id);window.history.pushState(null,'','#'+id)}
 function browse(filters={}){setFocus({...filters});navigate('products')}
 function open(product,variants=false,append=false){setEditing({product:append?{...structuredClone(product),variants:[...structuredClone(product.variants),newVariant()]}:structuredClone(product),tab:variants?'Varyant & fiyat':'Genel bilgiler'})}
 function create(categoryId){if(!can(user,'products.write'))return;const category=categories.find(c=>c.id===categoryId&&selectable(c,categories))||categories.find(c=>selectable(c,categories));if(!category){notify('Ürün eklemek için önce aktif bir ana kategori ve alt kategori oluşturun.');navigate('categories');return}setEditing({product:{isNew:true,name:'',categoryId:category.id,category:category.name,status:'Taslak',description:'',allergens:'',customImage:'',variants:[{...newVariant(),size:'Standart'}]},tab:'Genel bilgiler'})}
 async function saveCategory(category,isNew){try{await mutate('/categories'+(isNew?'':'/'+category.id),{category},isNew?'POST':'PUT');notify('Kategori kaydedildi.');return true}catch(e){notify(e.message);return false}}
 async function savePrices(id,prices){try{await mutate('/prices/products/'+id,{prices},'PATCH');notify('Varyant fiyatları kaydedildi.');return true}catch(e){notify(e.message);return false}}
 const onBulk=ids=>{if(ids.length)setBulk(ids)};
 const content={
  categories:<CategoryManagement categories={categories} products={products} onSave={saveCategory} onProducts={category=>browse({category})} onNewProduct={create} skuPrefix={settings.skuPrefix} readOnly={!can(user,'categories.write')} canCreateProduct={can(user,'products.write')}/>,
  products:<ProductManagement user={user} focus={focus} onEdit={p=>open(p)} onNew={create} onBulk={onBulk}/>,
  variants:<VariantManagement products={products} categories={categories} canWrite={can(user,'products.write')} onEdit={(p,append)=>open(p,true,append)}/>,
  codes:<CodeManagement user={user}/>,users:<UserManagement user={user} onChanged={async()=>onUserUpdated((await request('/session')).user)}/>,media:<MediaManagement user={user}/>,
  prices:<PriceManagement products={products} categories={categories} canWrite={can(user,'prices.write')} onSave={savePrices} onBulk={onBulk} busy={busy}/>,
  overview:<Overview products={products} categories={categories} logs={logs} onBrowse={browse} onActivity={()=>navigate('activity')} onNewProduct={create} canCreate={can(user,'products.write')}/>,activity:<ActivityLog logs={logs}/>,help:<HelpCenter user={user} onNavigate={navigate}/>,
  account:<section className="panel account-panel"><div className="panel-title"><div><h2>{user.name}</h2><p className="muted">{user.email}</p></div><span className="role-badge">{roleFor(user.role)?.name}</span></div><ProfileForm user={user} onChanged={onUserUpdated}/><PasswordForm user={user} onChanged={onUserUpdated}/></section>
 };
 return <AppShell user={user} page={page} onNavigate={navigate} onLogout={onLogout} onNotifications={()=>setNotifications(true)}><ModuleBoundary module={page}><Suspense fallback={<section className="panel" role="status">Bölüm yükleniyor…</section>}>{allowed(page)?content[page]:null}</Suspense></ModuleBoundary>{editing&&<ProductEditor product={editing.product} tab={editing.tab} readOnly={!can(user,'products.write')} onClose={()=>setEditing(null)}/>} {bulk&&<BulkPriceDialog ids={bulk} onClose={()=>setBulk(null)}/>} {notifications&&<Modal title="Katalog bildirimleri" onClose={()=>setNotifications(false)}><div className="notification-items"><p>Güncel kayıtlardan hesaplanan tamamlanacak işler.</p><MaterialButton className="overview-task" onClick={()=>{setNotifications(false);browse({status:'Taslak'})}}><span>Taslak ürünler</span><strong>{products.filter(p=>p.status==='Taslak').length}</strong></MaterialButton><MaterialButton className="overview-task" onClick={()=>{setNotifications(false);browse({quality:'image'})}}><span>Görseli olmayanlar</span><strong>{products.filter(p=>!p.customImage).length}</strong></MaterialButton><MaterialButton className="btn full" onClick={()=>{setNotifications(false);navigate('activity')}}>İşlem geçmişini aç</MaterialButton></div></Modal>}</AppShell>;
}
