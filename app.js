// Kasir Kafe - logika aplikasi. Data disimpan di localStorage browser dan disinkronkan ke Supabase.
(function(){
"use strict";
const KEY="kasirkafe.v1", AKEY="kasirkafe.auto";

/* ---------- supabase ---------- */
const SB_URL="https://mlfoxaaolsxltytuhous.supabase.co";
const SB_KEY="sb_publishable_8U_TmHSCOHhvdfkLmusWmg_nP18EO1r";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY):null;
let cloudStamp=null,cloudReady=false,pushT=null,pushing=false;
function queuePush(){
  if(!cloudReady)return;
  clearTimeout(pushT);pushT=setTimeout(pushNow,500);
}
async function pushNow(){
  if(pushing){pushT=setTimeout(pushNow,500);return}
  pushing=true;
  try{
    const r=await sb.from("kasir_data").update({data:db,updated_at:new Date().toISOString()})
      .eq("id","utama").eq("updated_at",cloudStamp).select("updated_at");
    if(r.error)throw r.error;
    if(!r.data||!r.data.length){
      cloudReady=false;
      askConfirm("Data berubah di perangkat lain","Halaman akan dimuat ulang supaya data terbaru terbaca. Perubahan terakhir di layar ini tidak tersimpan ke server.","Muat ulang",()=>location.reload());
    }else cloudStamp=r.data[0].updated_at;
  }catch(e){toast("Gagal menyimpan ke server. Data masih ada di browser ini.")}
  pushing=false;
}
function lockBox(inner){
  const L=$("#lock");L.hidden=false;$("#app").hidden=true;
  L.innerHTML=`<div class="box"><img class="s-logo-img" src="Image/logo.png" alt="Logo" style="width:96px;height:96px"><h2>${esc(db.settings.store)}</h2>${inner}</div>`;
  return L;
}
function showLogin(){
  const L=lockBox(`<p>Masuk dengan akun kasir.</p><form id="loginForm" class="stack" style="gap:12px;text-align:left"><div class="f"><label for="lEmail">Email</label><input class="in" type="email" id="lEmail" required autocomplete="username"></div><div class="f"><label for="lPass">Password</label><input class="in" type="password" id="lPass" required autocomplete="current-password"></div><div class="err" id="lerr"></div><button class="btn block" type="submit" id="lBtn">Masuk</button></form>`);
  L.querySelector("#loginForm").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const b=$("#lBtn");b.disabled=true;b.textContent="Masuk...";
    const r=await sb.auth.signInWithPassword({email:$("#lEmail").value.trim(),password:$("#lPass").value});
    if(r.error){b.disabled=false;b.textContent="Masuk";$("#lerr").textContent="Email atau password salah";return}
    enter();
  });
}
async function enter(){
  lockBox("<p>Memuat data...</p>");
  try{
    const r=await sb.from("kasir_data").select("data,updated_at").eq("id","utama").maybeSingle();
    if(r.error)throw r.error;
    if(r.data){
      const d=r.data.data;
      if(!(d&&d.menu&&d.sales&&d.kas&&d.settings))throw new Error("Data di server tidak valid");
      db=d;cloudStamp=r.data.updated_at;migrate();
    }else{
      const i=await sb.from("kasir_data").insert({id:"utama",data:db}).select("updated_at").single();
      if(i.error)throw i.error;
      cloudStamp=i.data.updated_at;
    }
  }catch(e){
    lockBox(`<p>Gagal memuat data: ${esc(e.message||e)}</p><button class="btn block" type="button" id="lRetry">Coba lagi</button>`);
    $("#lRetry").addEventListener("click",enter);return;
  }
  cloudReady=true;
  try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}
  unlock();
}
async function startApp(){
  if(!sb){lockBox("<p>Pustaka Supabase belum termuat. Periksa koneksi internet dan baris script di index.html.</p>");return}
  const r=await sb.auth.getSession();
  if(r.data&&r.data.session)enter();else showLogin();
}

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const nf=new Intl.NumberFormat("id-ID");
const rp=n=>"Rp "+nf.format(Math.round(n||0));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const digits=s=>parseInt(String(s).replace(/\D/g,""),10)||0;
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>iso(new Date());
const parseD=s=>{const p=s.split("-").map(Number);return new Date(p[0],p[1]-1,p[2])};
const addDays=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return iso(d)};
const fmtD=s=>parseD(s).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
const fmtDay=s=>parseD(s).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"});
const fmtT=ts=>new Date(ts).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}).replace(".",":");
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const short=n=>n>=1e6?(n/1e6).toFixed(1).replace(".",",")+" jt":n>=1e3?Math.round(n/1e3)+" rb":String(n);

/* ---------- data ---------- */
const SEED_MENU=[
 ["Espresso","Kopi","gelas",6000,18000,null,0],["Americano","Kopi","gelas",6500,22000,null,0],["Cappuccino","Kopi","gelas",9000,28000,null,0],
 ["Caffe Latte","Kopi","gelas",9500,29000,null,0],["Kopi Susu Gula Aren","Kopi","gelas",8500,26000,null,0],["V60 Manual Brew","Kopi","gelas",11000,32000,null,0],
 ["Cold Brew","Kopi","gelas",10000,30000,null,0],["Matcha Latte","Non-kopi","gelas",12000,30000,null,0],["Coklat Panas","Non-kopi","gelas",10000,27000,null,0],
 ["Teh Tarik","Non-kopi","gelas",5000,20000,null,0],["Lemon Tea","Non-kopi","gelas",4500,18000,null,0],
 ["Nasi Goreng Kampung","Makanan","porsi",14000,32000,25,8],["Mie Goreng","Makanan","porsi",12000,28000,20,8],["Roti Bakar Coklat Keju","Makanan","porsi",8000,22000,18,6],
 ["Sandwich Ayam","Makanan","porsi",13000,30000,12,5],["Croissant","Camilan","pcs",10000,24000,4,5],["Pisang Goreng","Camilan","porsi",6000,18000,14,5],
 ["Kentang Goreng","Camilan","porsi",7000,20000,16,6],["Brownies","Camilan","pcs",9000,22000,0,4]
];
/* Menu bawaan versi awal, hanya dipakai untuk mengenali dan membersihkan data contoh lama. */
const isSeedMenu=m=>{const n=/^m(\d{1,2})$/.exec(m.id);return !!n&&!!SEED_MENU[n[1]-1]&&SEED_MENU[n[1]-1][0]===m.name};
const hasSample=()=>db.sales.some(s=>s.sample)||db.kas.some(k=>k.sample)||db.menu.some(isSeedMenu);
function freshDB(){
  return {v:1,settings:{store:"Kopi Tutug",pin:"1234",tax:0,qris:null,reseller:{min:10,thresh:20},distributor:{min:50,thresh:100},printer:{width:32}},
    menu:[],
    sales:[],kas:[],sampled:true};
}
let db=null;
try{const raw=localStorage.getItem(KEY);if(raw){const d=JSON.parse(raw);if(d&&d.menu&&d.sales&&d.kas&&d.settings)db=d}}catch(e){}
if(!db)db=freshDB();
/* nama bawaan lama diganti otomatis; nama yang sudah kamu ubah sendiri tidak disentuh */
if(db.settings&&db.settings.store==="Kafe "+"Saya"){db.settings.store="Kopi Tutug";save()}
/* data lama: transaksi yang belum lunas dijadikan open bill, istilah piutang dibuang */
function migrate(){
  let ch=false;
  if(!db.settings.reseller){db.settings.reseller={min:10,thresh:20};ch=true}
  if(!db.settings.distributor){db.settings.distributor={min:50,thresh:100};ch=true}
  db.menu.forEach(m=>{if(!m.ch){m.ch="retail";ch=true}});
  if(!db.settings.printer){db.settings.printer={width:32};ch=true}
  if(!db.settings.banks){db.settings.banks=[];ch=true}
  db.sales.forEach(s=>{
    if(s.open===undefined){
      const paid=(s.payments||[]).reduce((a,p)=>a+p.applied,0);
      s.open=s.total-paid>0;ch=true;
    }
    if(!s.ch){s.ch=s.reseller?"reseller":"retail";ch=true}
    if(s.method==="Piutang"){s.method="Open Bill";ch=true}
    if("due" in s){delete s.due;ch=true}
  });
  if(ch)save();
}
migrate();
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){toast("Penyimpanan browser penuh atau diblokir")}queuePush()}
const menuById=id=>db.menu.find(m=>m.id===id);
const paidOf=s=>(s.payments||[]).reduce((a,p)=>a+p.applied,0);
const remainOf=s=>Math.max(0,s.total-paidOf(s));
const oweOf=s=>Math.max(0,(s.changeDue||0)-(s.changeGiven||[]).reduce((a,g)=>a+g.amount,0));
const profitOf=s=>s.items.reduce((a,i)=>a+(i.price-i.cost)*i.qty,0)-(s.disc||0);
/* harga reseller ditentukan per menu (rp = harga reseller, rb = harga grosir). Tidak ada diskon otomatis. */
const CH={retail:"Eceran",reseller:"Reseller",distributor:"Distributor"};
const chOf=x=>x.ch||"retail";
const menusOf=c=>db.menu.filter(m=>chOf(m)===c);
const chSet=c=>db.settings[c]||{min:1,thresh:0};
function discFor(){return 0}
function resPrice(m,totalQty){
  const r=chSet(chOf(m));
  if(m.rb&&totalQty>(r.thresh||0))return m.rb;
  return m.price;
}
/* Minimal beli: menu yang punya "minimal beli" sendiri memakai angka itu.
   Aturan umum (Pengaturan) hanya berlaku untuk menu yang kolom minimalnya kosong. */
function minProblem(items,ch){
  const gm=chSet(ch).min||1;let free=0,hasFree=false;
  for(const i of items){
    const m=menuById(i.id),mn=m&&m.rmin?m.rmin:0;
    if(mn){if(i.qty<mn)return {msg:i.name+": minimal beli "+mn+". Kurang "+(mn-i.qty)+" lagi (sekarang "+i.qty+")."}}
    else{free+=i.qty;hasFree=true}
  }
  if(hasFree&&free<gm)return {msg:"Minimal ambil "+gm+" item (untuk menu tanpa minimal sendiri). Kurang "+(gm-free)+" lagi (sekarang "+free+")."};
  return null;
}
function applyResPrices(){
  if(!draft||!draft.reseller)return;
  const q=draft.items.reduce((a,i)=>a+i.qty,0);
  draft.items.forEach(i=>{if(i.manual)return;const m=menuById(i.id);if(m)i.price=resPrice(m,q)});
}
const qtyOf=s=>s.items.reduce((a,i)=>a+i.qty,0);
const statusOf=s=>s.open?"Open Bill":"Lunas";
const dOf=s=>s.closedDate||s.date;
function stockState(m){if(m.archived)return["Arsip","p-mute"];if(m.stock==null)return["Tidak dilacak","p-mute"];if(m.stock<=0)return["Habis","p-bad"];if(m.stock<=m.min)return["Menipis","p-warn"];return["Aman","p-ok"]}

function createSale(d,opts){
  opts=opts||{};
  const items=d.items.map(i=>{const m=menuById(i.id);return {id:i.id,name:m?m.name:i.name,cost:m?m.cost:0,price:i.price,qty:i.qty}});
  const sub=items.reduce((a,i)=>a+i.price*i.qty,0);
  const disc=0&&d.reseller?discFor(sub,items.reduce((a,i)=>a+i.qty,0)):0;
  const tax=Math.round((sub-disc)*(db.settings.tax||0)/100);
  const total=sub-disc+tax;
  const recv=d.open?0:(d.received||0), applied=Math.min(recv,total);
  const sameDay=db.sales.filter(s=>s.date===d.date).map(s=>parseInt(s.no.split("-")[2],10)||0);
  const no="INV-"+d.date.replace(/-/g,"")+"-"+pad3((sameDay.length?Math.max.apply(null,sameDay):0)+1);
  const sale={id:uid(),no:no,date:d.date,ts:d.ts||Date.now(),items:items,sub:sub,tax:tax,total:total,method:d.open?"Open Bill":d.method,
    customer:d.customer||"",phone:d.phone||"",ch:d.ch||"retail",reseller:(d.ch||"retail")!=="retail",disc:disc,changeTo:d.changeTo||"",note:d.note||"",open:!!d.open,payments:[],changeDue:0,changeGiven:[],sample:!!opts.sample};
  if(recv>0){
    sale.payments.push({date:d.date,amount:d.owe?recv:applied,applied:applied,method:d.method,received:recv});
    if(d.owe&&recv>total){sale.changeDue=recv-total}
  }
  if(!opts.noStock){items.forEach(i=>{const m=menuById(i.id);if(m&&m.stock!=null)m.stock=Math.max(0,m.stock-i.qty)})}
  db.sales.push(sale);
  return sale;
}
function pad3(n){return String(n).padStart(3,"0")}


/* ---------- kas ---------- */
function kasEntries(from,to){
  const out=[];
  db.sales.forEach(s=>{
    (s.payments||[]).forEach(p=>{out.push({date:p.date,type:"in",cat:"Penjualan",who:s.customer||"Pelanggan",amount:p.amount,ref:s.no,note:p.method,auto:true})});
    (s.changeGiven||[]).forEach(g=>{out.push({date:g.date,type:"out",cat:"Kembalian pelanggan",who:s.changeTo||s.customer||"Pelanggan",amount:g.amount,ref:s.no,note:"",auto:true})});
  });
  db.kas.forEach(k=>out.push({id:k.id,date:k.date,type:k.type,cat:k.cat,who:k.who,amount:k.amount,ref:k.ref,note:k.note,auto:false,sample:k.sample}));
  return out.filter(e=>e.date>=from&&e.date<=to).sort((a,b)=>b.date<a.date?-1:b.date>a.date?1:0);
}
function kasTotals(from,to){let i=0,o=0;kasEntries(from,to).forEach(e=>{if(e.type==="in")i+=e.amount;else o+=e.amount});return {in:i,out:o,net:i-o}}

/* ---------- ui helpers ---------- */
let toastT;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),2200)}
let lastFocus=null;
function openModal(html,wide){lastFocus=document.activeElement;const m=$("#modal");m.className="modal"+(wide?" wide":"");m.innerHTML=html;$("#overlay").hidden=false;const f=m.querySelector("input:not([type=hidden]),select,textarea,button");if(f)f.focus()}
function closeModal(){$("#overlay").hidden=true;$("#modal").innerHTML="";if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus()}
let confirmFn=null;
function askConfirm(title,text,okLabel,fn,danger){
  confirmFn=fn;
  openModal(`<h3>${esc(title)}</h3><p style="margin:0;color:var(--muted)">${esc(text)}</p><div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn ${danger?"bad":""}" type="button" data-act="confirm-ok">${esc(okLabel)}</button></div>`);
}
const ICONS={
 dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 sale:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
 menu:'<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 kas:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h3"/>',
 piu:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 lap:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
 bak:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
 set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 cup:'<path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M9 3v2M12 3v2"/>'
};
const ico=n=>`<svg class="ico" viewBox="0 0 24 24">${ICONS[n]}</svg>`;
const NAV=[["Utama",[["dashboard","Dashboard","dash"],["penjualan","Penjualan","sale"],["menu","Menu & Stok","menu"],["kas","Kas Masuk/Keluar","kas"],["openbill","Open Bill","piu"]]],
           ["Reseller",[["reseller","Penjualan Reseller","sale"],["menures","Menu & Stok Reseller","menu"]]],
           ["Distributor",[["distributor","Penjualan Distributor","sale"],["menudist","Menu & Stok Distributor","menu"]]],
           ["Insight",[["laporan","Laporan","lap"]]],["Sistem",[["backup","Backup & Restore","bak"]]],["Pengaturan",[["pengaturan","Pengaturan","set"]]]];
const TITLES={dashboard:["Dashboard","Ringkasan hari ini"],penjualan:["Penjualan","Catat transaksi dan lihat riwayat"],reseller:["Penjualan Reseller","Transaksi grosir untuk reseller"],menures:["Menu & Stok Reseller","Produk, harga, dan stok khusus reseller"],distributor:["Penjualan Distributor","Transaksi untuk distributor"],menudist:["Menu & Stok Distributor","Produk, harga, dan stok khusus distributor"],menu:["Menu & Stok","Harga, modal, dan persediaan"],kas:["Kas Masuk/Keluar","Arus uang usaha"],
  openbill:["Open Bill","Pesanan yang belum dibayar"],laporan:["Laporan","Rekap penjualan per periode"],backup:["Backup & Restore","Amankan data usaha"],pengaturan:["Pengaturan","Usaha, reseller, printer, PIN, dan QRIS"]};
function renderSide(){
  $("#side").innerHTML=`<div class="s-brand"><img class="s-logo-img" src="Image/logo.png" alt="Logo"><span class="s-name">${esc(db.settings.store)}</span></div>`+
   NAV.map(g=>`<div class="s-grp">${g[0]}</div>`+g[1].map(n=>`<button class="s-link" type="button" data-route="${n[0]}" ${cur===n[0]?'aria-current="page"':''}>${ico(n[2])}<span class="lb">${n[1]}</span></button>`).join("")).join("")+
   `<div class="s-sp"></div><button class="s-link" type="button" data-act="logout">${ico("out")}<span class="lb">Keluar</span></button>`;
}

/* ---------- navigasi ---------- */
let cur="dashboard";
function go(r){
  cur=r;document.body.classList.remove("drawer");
  $("#title").innerHTML=`${esc(TITLES[r][0])}<span class="sub">${esc(TITLES[r][1])}</span>`;
  renderSide();$("#main").innerHTML="";SCREENS[r]();window.scrollTo(0,0);
}
$("#side").addEventListener("click",e=>{const b=e.target.closest("[data-route]");if(b)go(b.getAttribute("data-route"))});
$("#burger").addEventListener("click",()=>{if(window.matchMedia("(max-width:860px)").matches)document.body.classList.toggle("drawer");else document.body.classList.toggle("collapsed")});
$("#scrim").addEventListener("click",()=>document.body.classList.remove("drawer"));
function tick(){$("#when").textContent=fmtDay(today())+" · "+fmtT(Date.now())}
setInterval(tick,30000);

/* ---------- kunci PIN (tidak dipakai lagi untuk masuk, login memakai Supabase) ---------- */
let pinBuf="";
function showLock(){
  pinBuf="";$("#app").hidden=true;
  const l=$("#lock");l.hidden=false;
  l.innerHTML=`<div class="box"><img class="s-logo-img" src="Image/logo.png" alt="Logo" style="width:96px;height:96px"><h2>${esc(db.settings.store)}</h2><p>Masukkan PIN untuk membuka kasir. PIN awal: 1234</p>
   <div class="dots" id="dots"></div><div class="err" id="perr"></div>
   <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-k="${n}">${n}</button>`).join("")}<button type="button" class="z" data-k="0">0</button><button type="button" data-k="del" aria-label="Hapus">&larr;</button></div></div>`;
  drawDots();
}
function drawDots(){const n=db.settings.pin.length;$("#dots").innerHTML=Array.from({length:n},(_,i)=>`<i class="${i<pinBuf.length?"on":""}"></i>`).join("")}
function pinKey(k){
  if(k==="del")pinBuf=pinBuf.slice(0,-1);else if(pinBuf.length<db.settings.pin.length)pinBuf+=k;
  drawDots();$("#perr").textContent="";
  if(pinBuf.length===db.settings.pin.length){
    if(pinBuf===db.settings.pin){unlock()}
    else{$("#perr").textContent="PIN salah, coba lagi";const d=$("#dots");d.classList.remove("shake");void d.offsetWidth;d.classList.add("shake");pinBuf="";setTimeout(drawDots,350)}
  }
}
$("#lock").addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(b)pinKey(b.getAttribute("data-k"))});
document.addEventListener("keydown",e=>{
  if(!$("#lock").hidden&&$("#dots")){if(/^\d$/.test(e.key))pinKey(e.key);else if(e.key==="Backspace")pinKey("del")}
  else if(e.key==="Escape"&&!$("#overlay").hidden)closeModal();
});
function unlock(){
  $("#lock").hidden=true;$("#lock").innerHTML="";$("#app").hidden=false;
  autoBackup();tick();go(cur||"dashboard");
}
function autoBackup(){
  try{
    const list=JSON.parse(localStorage.getItem(AKEY)||"[]");const t=today();
    if(!list.length||list[0].date!==t){
      const copy=JSON.parse(JSON.stringify(db));copy.settings.qris=null;copy.settings.pin="";
      list.unshift({date:t,json:JSON.stringify(copy)});localStorage.setItem(AKEY,JSON.stringify(list.slice(0,4)));
    }
  }catch(e){}
}
function autoList(){try{return JSON.parse(localStorage.getItem(AKEY)||"[]")}catch(e){return []}}

/* ---------- cetak thermal (ESC/POS) ---------- */
const BT_SERVICES=["000018f0-0000-1000-8000-00805f9b34fb","0000ff00-0000-1000-8000-00805f9b34fb","0000ffe0-0000-1000-8000-00805f9b34fb","49535343-fe7d-4ae5-8fa9-9fafd205e455","e7810a71-73ae-499d-8c15-faa9aef0c3f2","0000fee7-0000-1000-8000-00805f9b34fb","0000ae30-0000-1000-8000-00805f9b34fb"];
let bt={dev:null,ch:null};
const prW=()=>db.settings.printer&&db.settings.printer.width===48?48:32;
function btStatus(){
  if(!navigator.bluetooth)return "Browser ini tidak mendukung Bluetooth langsung. Gunakan Chrome atau Edge di Android/komputer, atau pakai RawBT / cetak lewat browser.";
  return bt.dev&&bt.dev.gatt&&bt.dev.gatt.connected&&bt.ch?"Terhubung ke: "+esc(bt.dev.name||"printer"):"Belum terhubung. Nyalakan printer lalu tekan Hubungkan Bluetooth.";
}
function setBtStat(){const e=$("#btStat");if(e)e.innerHTML=btStatus()}
function ascii(x){return String(x).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\x20-\x7e\n]/g,"?")}
function escposBytes(s){
  const W=prW(),lines=ascii(receiptText(s,W)).split("\n"),out=[];
  const put=a=>{for(let i=0;i<a.length;i++)out.push(a[i])},txt=x=>{for(let i=0;i<x.length;i++)out.push(x.charCodeAt(i))};
  put([0x1b,0x40]);
  put([0x1b,0x45,1]);txt(lines[0]+"\n");put([0x1b,0x45,0]);
  txt(lines.slice(1).join("\n")+"\n");
  put([0x1b,0x64,4]);put([0x1d,0x56,66,0]);
  return Uint8Array.from(out);
}
async function btFindChar(server){
  const svs=await server.getPrimaryServices();
  for(const sv of svs){
    const cs=await sv.getCharacteristics();
    for(const c of cs){if(c.properties.write||c.properties.writeWithoutResponse)return c}
  }
  return null;
}
async function btConnect(pick){
  if(!navigator.bluetooth)throw new Error("Browser tidak mendukung Bluetooth. Pakai Chrome/Edge atau opsi RawBT.");
  if(bt.dev&&bt.ch&&bt.dev.gatt.connected)return bt.ch;
  let dev=bt.dev;
  if(!dev&&!pick&&navigator.bluetooth.getDevices){
    try{
      const known=await navigator.bluetooth.getDevices(),want=localStorage.getItem("kt.printer");
      dev=known.find(d=>d.name===want)||known[0]||null;
    }catch(e){dev=null}
  }
  if(!dev||pick)dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:BT_SERVICES});
  let server;
  try{server=await dev.gatt.connect()}
  catch(e){
    if(!pick&&bt.dev!==dev){dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:BT_SERVICES});server=await dev.gatt.connect()}
    else throw e;
  }
  try{localStorage.setItem("kt.printer",dev.name||"")}catch(e){}
  const ch=await btFindChar(server);
  if(!ch){try{dev.gatt.disconnect()}catch(e){}throw new Error("Printer tidak punya jalur tulis BLE. Coba RawBT atau cetak lewat browser.")}
  dev.addEventListener("gattserverdisconnected",()=>{bt.ch=null;setBtStat()});
  bt={dev:dev,ch:ch};setBtStat();return ch;
}
async function btSend(bytes){
  const ch=await btConnect(false);
  let size=100;
  for(let tries=0;tries<2;tries++){
    try{
      for(let i=0;i<bytes.length;i+=size){
        const part=bytes.slice(i,i+size);
        if(ch.properties.writeWithoutResponse)await ch.writeValueWithoutResponse(part);else await ch.writeValue(part);
        await new Promise(r=>setTimeout(r,25));
      }
      return;
    }catch(e){if(tries===1)throw e;size=20}
  }
}
async function btPrintSale(s){
  try{toast("Mengirim ke printer...");await btSend(escposBytes(s));toast("Struk dikirim ke printer")}
  catch(e){if(e&&e.name==="NotFoundError")return;toast("Gagal cetak: "+(e.message||e))}
}
function rawbtPrint(s){
  let bin="";escposBytes(s).forEach(b=>bin+=String.fromCharCode(b));
  location.href="intent:base64,"+btoa(bin)+"#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
}
function browserPrint(s){
  const w=prW()===48?"80mm":"58mm";
  const f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d=f.contentWindow.document;
  d.open();d.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:'+w+' auto;margin:2mm}body{margin:0}pre{font:11px/1.35 "Courier New",monospace;white-space:pre;margin:0}</style></head><body><pre>'+esc(ascii(receiptText(s,prW())))+'</pre></body></html>');
  d.close();
  setTimeout(()=>{f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),2000)},300);
}
function printMenu(s){
  openModal(`<h3>Cetak struk ${esc(s.no)}</h3><div class="stack" style="gap:10px">
   <button class="btn block" type="button" data-act="pr-bt" data-id="${s.id}">Bluetooth langsung (printer BLE)</button>
   <button class="btn ghost block" type="button" data-act="pr-raw" data-id="${s.id}">Lewat aplikasi RawBT (Android)</button>
   <button class="btn ghost block" type="button" data-act="pr-br" data-id="${s.id}">Cetak lewat browser</button>
   <div class="sub2">${btStatus()}</div>
   <div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="rc-back" data-id="${s.id}">Kembali ke struk</button></div></div>`);
}
const sampleSale=()=>({id:"tes",no:"TES-PRINTER",date:today(),ts:Date.now(),items:[{name:"Kopi Susu",price:18000,qty:2},{name:"Roti Bakar",price:15000,qty:1}],sub:51000,tax:0,total:51000,method:"Tunai",customer:"",payments:[{amount:51000,method:"Tunai",received:60000}],changeDue:0,changeGiven:[]});

/* ---------- struk ---------- */
const cen=(s,w)=>{s=String(s);return s.length>=w?s:" ".repeat(Math.floor((w-s.length)/2))+s};
const lr=(l,r,w)=>{l=String(l);r=String(r);return l+" ".repeat(Math.max(1,w-l.length-r.length))+r};
function receiptText(s,W){
  W=W||34;const L=[];
  L.push(cen(db.settings.store,W));if(chOf(s)!=="retail")L.push(cen("** "+CH[chOf(s)].toUpperCase()+" **",W));L.push("-".repeat(W));
  L.push(lr(fmtD(s.date),fmtT(s.ts),W),lr(s.no,s.method,W));
  if(s.customer)L.push("Pelanggan: "+s.customer);
  L.push("-".repeat(W));
  s.items.forEach(i=>{L.push(i.name.slice(0,W));L.push(lr("  "+i.qty+" x "+nf.format(i.price),nf.format(i.price*i.qty),W))});
  L.push("-".repeat(W),lr("Subtotal",nf.format(s.sub),W));
  if(s.disc)L.push(lr("Diskon reseller",'-'+nf.format(s.disc),W));
  if(s.tax)L.push(lr("Pajak "+(db.settings.tax||0)+"%",nf.format(s.tax),W));
  L.push("=".repeat(W),lr("TOTAL",nf.format(s.total),W),"-".repeat(W));
  (s.payments||[]).forEach(p=>L.push(lr("Bayar "+p.method,nf.format(p.amount),W)));
  {const lp=(s.payments||[]).slice(-1)[0];if(lp&&lp.received&&lp.received>lp.amount&&!s.changeDue)L.push(lr("Diterima",nf.format(lp.received),W),lr("Kembali",nf.format(lp.received-lp.amount),W))}
  if(s.changeDue){const g=(s.changeGiven||[]).reduce((a,x)=>a+x.amount,0);L.push(lr("Kembalian",nf.format(s.changeDue),W));if(oweOf(s))L.push(lr("  Belum diberikan",nf.format(oweOf(s)),W));else if(g)L.push("  (sudah diberikan)")}
  else{const p=(s.payments||[]).reduce((a,x)=>a+x.amount,0);if(p>s.total)L.push(lr("Kembali",nf.format(p-s.total),W))}
  if(remainOf(s))L.push(lr("BELUM DIBAYAR",nf.format(remainOf(s)),W),"Status: Open Bill");
  L.push("",cen("Terima kasih, sampai jumpa!",W));
  return L.filter((x,i,a)=>!(x===""&&a[i-1]==="")).join("\n");
}
function showReceipt(s){
  openModal(`<h3>Struk ${esc(s.no)}</h3><div class="paper"><div style="text-align:center;margin-bottom:8px"><img src="Image/logo.png" alt="Logo" style="width:84px;height:84px;object-fit:contain"></div><pre id="rcText" style="width:fit-content;margin:0 auto">${esc(receiptText(s))}</pre></div><div class="row-btns" style="justify-content:flex-end"><button class="btn" type="button" data-act="print-rc" data-id="${s.id}">Cetak</button><button class="btn ghost" type="button" data-act="copy-rc">Salin struk</button><button class="btn ghost" type="button" data-act="share-rc" data-id="${s.id}">Bagikan ke WhatsApp</button><button class="btn" type="button" data-act="close">Tutup</button></div>`);
}
/* nomor WhatsApp: 0812... atau 812... diubah ke format internasional 62812... */
function waNum(p){
  let n=String(p||"").replace(/\D/g,"");
  if(!n)return "";
  if(n.startsWith("00"))n=n.slice(2);
  else if(n.startsWith("0"))n="62"+n.slice(1);
  else if(n.startsWith("8"))n="62"+n;
  return n;
}
function shareReceipt(s){
  toast("Menyiapkan gambar struk...");
  const lines=receiptText(s).split("\n");
  const logo=new Image();
  const build=img=>{
    try{
      const W=460,lh=24,top=24,logoH=img?96:0,sc=2;
      const H=top*2+(img?logoH+14:0)+lines.length*lh;
      const c=document.createElement("canvas");c.width=W*sc;c.height=H*sc;
      const x=c.getContext("2d");x.scale(sc,sc);
      x.fillStyle="#ffffff";x.fillRect(0,0,W,H);
      let y=top;
      if(img){const w=logoH*(img.width/img.height);x.drawImage(img,(W-w)/2,y,w,logoH);y+=logoH+14}
      x.fillStyle="#2c1810";x.font="18px 'Courier New',monospace";x.textBaseline="top";
      const left=Math.max(12,(W-x.measureText("M").width*34)/2);
      lines.forEach(l=>{x.fillText(l,left,y);y+=lh});
      c.toBlob(blob=>{
        if(!blob){toast("Gagal membuat gambar struk");return}
        const name=s.no+".jpg",file=new File([blob],name,{type:"image/jpeg"});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:"Struk "+s.no,text:"Struk dari "+db.settings.store}).catch(()=>{});
        }else{
          const url=URL.createObjectURL(blob),a=document.createElement("a");
          a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),2000);
          const num=waNum(s.phone);
          window.open("https://wa.me/"+num+"?text="+encodeURIComponent("Struk "+s.no+" dari "+db.settings.store+" (lampirkan gambar yang baru diunduh)"),"_blank");
          toast("Gambar diunduh. Lampirkan ke chat WhatsApp.");
        }
      },"image/jpeg",0.92);
    }catch(e){toast("Gagal membuat gambar struk")}
  };
  logo.onload=()=>build(logo);logo.onerror=()=>build(null);logo.src="Image/logo.png";
}
function copyEl(el,okMsg){
  const txt=el.value!==undefined?el.value:el.textContent;
  const fb=()=>{if(el.select){el.select()}else{const r=document.createRange();r.selectNodeContents(el);const s=window.getSelection();s.removeAllRanges();s.addRange(r)}toast("Teks dipilih, tekan salin")};
  try{navigator.clipboard.writeText(txt).then(()=>toast(okMsg),fb)}catch(e){fb()}
}
function saveFile(filename,data){
  try{
    const type=filename.endsWith(".json")?"application/json":filename.endsWith(".csv")?"text/csv":filename.endsWith(".xlsx")?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"text/html";
    const url=URL.createObjectURL(new Blob([data],{type:type+";charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast("File diunduh");return true;
  }catch(e){toast("Tidak bisa mengunduh file");return false}
}

/* ---------- screens ---------- */
const SCREENS={};
const main=$("#main");

/* dashboard */
SCREENS.dashboard=function(){
  const t=today(),ts=db.sales.filter(s=>!s.open&&dOf(s)===t);
  const omzet=ts.reduce((a,s)=>a+s.total,0),laba=ts.reduce((a,s)=>a+profitOf(s),0),items=ts.reduce((a,s)=>a+qtyOf(s),0);
  const kas=kasTotals(t,t).net,piu=db.sales.filter(s=>s.open).reduce((a,s)=>a+remainOf(s),0),nOpen=db.sales.filter(s=>s.open).length;
  const days=Array.from({length:7},(_,i)=>addDays(t,i-6));
  const vals=days.map(d=>db.sales.filter(s=>!s.open&&dOf(s)===d).reduce((a,s)=>a+s.total,0));
  const mx=Math.max.apply(null,vals);
  let max=100000;if(mx>0){const p=Math.pow(10,Math.floor(Math.log10(mx))),f=mx/p;max=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
  const W=420,H=240,pl=46,pr=8,pt=14,pb=30,cw=W-pl-pr,ch=H-pt-pb,bw=cw/7;
  let svg=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Omzet 7 hari terakhir">`;
  [0,.25,.5,.75,1].forEach(f=>{const y=pt+ch-ch*f;svg+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text x="${pl-6}" y="${y+4}" text-anchor="end">${short(max*f)}</text>`});
  days.forEach((d,i)=>{
    const h=max?vals[i]/max*ch:0,x=pl+i*bw+bw*.2,w=bw*.6,y=pt+ch-h;
    svg+=`<rect class="${i===6?"b2":"b1"}" x="${x}" y="${y}" width="${w}" height="${Math.max(h,vals[i]?2:0)}" rx="4"><title>${fmtD(d)}: ${rp(vals[i])}</title></rect>`;
    svg+=`<text x="${x+w/2}" y="${H-10}" text-anchor="middle">${parseD(d).toLocaleDateString("id-ID",{weekday:"short"})} ${parseD(d).getDate()}</text>`;
  });
  svg+="</svg>";
  const agg={};db.sales.filter(s=>!s.open&&dOf(s)>=days[0]).forEach(s=>s.items.forEach(i=>agg[i.name]=(agg[i.name]||0)+i.qty));
  const top=Object.keys(agg).map(k=>[k,agg[k]]).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const low=db.menu.filter(m=>!m.archived&&m.stock!=null&&m.stock<=m.min);
  main.innerHTML=`<div class="stack">
   ${!db.menu.some(m=>!m.archived)?`<div class="panel"><h2>Mulai dari menu</h2><p style="margin:0 0 12px;color:var(--muted)">Belum ada menu. Tambahkan menu dan harga dulu, lalu kasir siap dipakai.</p><button class="btn" type="button" data-act="goto" data-r="menu">Tambah menu</button></div>`:""}
   <div class="cards">
     <div class="card"><span>Transaksi hari ini</span><b>${ts.length}</b></div>
     <div class="card"><span>Item terjual</span><b>${items}</b></div>
     <div class="card"><span>Omzet</span><b>${rp(omzet)}</b></div>
     <div class="card k-ok"><span>Laba kotor</span><b>${rp(laba)}</b></div>
     <div class="card"><span>Kas bersih</span><b>${rp(kas)}</b></div>
     <div class="card ${piu?"k-warn":""}"><span>Open bill aktif${nOpen?" ("+nOpen+")":""}</span><b>${rp(piu)}</b></div>
   </div>
   ${hasSample()?`<div class="note warn" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Aplikasi ini masih berisi menu, transaksi, dan kas contoh.</span><button class="btn sm ghost" type="button" data-act="rm-sample">Hapus data contoh</button></div>`:""}
   <div class="cols">
     <div class="panel"><h2>Penjualan 7 hari terakhir</h2>${svg}</div>
     <div class="stack">
       <div class="panel"><h2>Barang terlaris</h2>${top.length?`<div class="hb">${top.map(r=>`<div><div class="t"><span>${esc(r[0])}</span><b class="num" style="font-weight:500">${r[1]}</b></div><div class="tr"><i style="width:${r[1]/top[0][1]*100}%"></i></div></div>`).join("")}</div>`:'<div class="empty">Belum ada penjualan 7 hari terakhir.</div>'}</div>
       <div class="panel"><h2>Stok perlu perhatian</h2>${low.length?`<div class="hb">${low.map(m=>{const s=stockState(m);return `<div class="t"><span>${esc(m.name)}</span><span><b class="num" style="font-weight:500">${m.stock} ${esc(m.unit)}</b> <span class="pill ${s[1]}">${s[0]}</span></span></div>`}).join("")}</div>`:'<div class="empty">Semua stok yang dilacak masih aman.</div>'}</div>
     </div>
   </div></div>`;
};

/* penjualan */
let draft=null,DR={},saleMode="retail";
function newDraft(){draft={date:today(),items:[],method:"Tunai",paid:"",customer:"",phone:"",changeTo:"",owe:false,note:"",ch:saleMode,reseller:saleMode!=="retail"};DR[saleMode]=draft}
function draftCalc(){
  const sub=draft.items.reduce((a,i)=>a+i.price*i.qty,0),qty=draft.items.reduce((a,i)=>a+i.qty,0);
  const disc=draft.reseller?discFor(sub,qty):0,tax=Math.round((sub-disc)*(db.settings.tax||0)/100),total=sub-disc+tax;
  const open=draft.method==="Open Bill";
  const recv=open?0:digits(draft.paid);
  return {sub:sub,qty:qty,disc:disc,tax:tax,total:total,recv:recv,open:open,change:Math.max(0,recv-total),short:(!open&&recv>0&&recv<total)?total-recv:0};
}
function availFor(id){const m=menuById(id);if(!m||m.stock==null)return Infinity;const d=draft.items.find(i=>i.id===id);return m.stock-(d?d.qty:0)}
function addToDraft(id,price,qty){
  const m=menuById(id);if(!m)return;
  const av=availFor(id);
  if(av<=0){toast("Stok "+m.name+" habis");return}
  if(qty>av){qty=av;toast("Stok "+m.name+" tersisa "+m.stock)}
  const ex=draft.items.find(i=>i.id===id);
  if(ex)ex.qty+=qty;else draft.items.push({id:id,name:m.name,price:price,qty:qty,manual:draft.reseller&&![m.price,m.rb].includes(price)});
  drawLines();
}
SCREENS.penjualan=function(){saleMode="retail";renderSale()};
SCREENS.reseller=function(){saleMode="reseller";renderSale()};
SCREENS.distributor=function(){saleMode="distributor";renderSale()};
function resRule(){
  const r=chSet(saleMode);
  return "Minimal ambil umum <b>"+r.min+"</b> item (hanya untuk menu yang kolom minimal belinya kosong). Harga dan stok diatur di Menu & Stok "+CH[saleMode]+". Harga grosir berlaku jika total lebih dari <b>"+r.thresh+"</b> item (untuk menu yang punya harga grosir).";
}
function renderSale(){
  const rs=saleMode!=="retail";
  draft=DR[saleMode];
  if(!draft)newDraft();
  main.innerHTML=`<div class="stack">
   <div class="sale">
    <div class="panel"><h2>${rs?"Transaksi "+CH[saleMode].toLowerCase():"Transaksi baru"}</h2>${rs?`<div class="note" style="margin-bottom:12px">${resRule()}</div>`:""}
      <div class="f" style="max-width:220px;margin-bottom:12px"><label for="sDate">Tanggal</label><input class="in" type="date" id="sDate" value="${draft.date}"></div>
      <div class="addrow">
        <div class="f"><label for="sMenu">Menu</label><select class="in" id="sMenu"></select></div>
        <div class="f"><label for="sPrice">Harga</label><input class="in num" id="sPrice" inputmode="numeric"></div>
        <div class="f"><label for="sQty">Jumlah</label><input class="in num" id="sQty" inputmode="numeric" value="1"></div>
        <button class="btn" type="button" data-act="add-item">Tambah</button>
      </div>
      <div class="lbl" style="margin-top:14px">Pilih cepat</div>
      <div class="quick" id="quick"></div>
      <div class="lines" id="lines"></div>
    </div>
    <div class="panel"><h2>Pembayaran</h2>
      <div class="stack" style="gap:12px">
        <div><div class="lbl" style="margin-bottom:6px">Metode</div><div class="seg" id="methods">${["Tunai","Transfer","QRIS","Debit","Open Bill"].map(m=>`<button type="button" data-act="method" data-m="${m}" aria-pressed="${draft.method===m}">${m}</button>`).join("")}</div></div>
        <div id="qrisBox"></div>
        <div class="f" id="paidBox"><label for="sPaid" id="sPaidL">Uang diterima</label><input class="in num" id="sPaid" inputmode="numeric" placeholder="Ketik jumlah uang diterima" autocomplete="off" value="${draft.paid===""?"":nf.format(digits(draft.paid))}"></div>
        <div class="fgrid">
          <div class="f"><label for="sCust" id="sCustL">Nama pelanggan</label><input class="in" id="sCust" maxlength="40" value="${esc(draft.customer)}"></div>
                    <div class="f"><label for="sPhone">Nomor WhatsApp (tidak wajib)</label><input class="in num" id="sPhone" type="tel" inputmode="tel" maxlength="20" placeholder="Contoh: 081234567890" autocomplete="off" value="${esc(draft.phone||"")}"></div>
        </div>
        <div id="changeBox"></div>
        <div class="f"><label for="sNote">Catatan</label><textarea class="in" id="sNote" maxlength="200">${esc(draft.note)}</textarea></div>
        <div class="tot" id="tot"></div>
        <button class="btn block" type="button" data-act="save-sale" id="saveSale">Simpan Transaksi</button>
      </div>
    </div>
   </div>
   <div class="panel" id="owePanel"></div>
   <div class="panel"><h2>${rs?"Riwayat "+CH[saleMode].toLowerCase():"Riwayat transaksi"}</h2><div id="hist"></div></div>
  </div>`;
  const sel=$("#sMenu");
  sel.innerHTML=menusOf(saleMode).filter(m=>!m.archived).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  const first=menusOf(saleMode).find(m=>!m.archived);if(first)$("#sPrice").value=nf.format(first.price);
  drawQuick();drawLines();drawOwe();drawHist();
}
function drawQuick(){
  $("#quick").innerHTML=menusOf(saleMode).filter(m=>!m.archived).map(m=>{const out=m.stock!=null&&m.stock<=0;
    return `<button type="button" class="qk" data-act="quick" data-id="${m.id}" ${out?"disabled":""}><b>${esc(m.name)}</b><span>${out?"Habis":rp(m.price)}</span></button>`}).join("")||'<div class="empty" style="grid-column:1/-1">Belum ada menu aktif. Tambahkan di Menu & Stok.</div>';
}
function drawLines(){
  const box=$("#lines");if(!box)return;
  applyResPrices();
  box.innerHTML=draft.items.length?draft.items.map((i,n)=>`<div class="ln"><div class="nm">${esc(i.name)}</div>
    <input class="in num pr" data-line-price="${n}" inputmode="numeric" value="${nf.format(i.price)}" aria-label="Harga ${esc(i.name)}">
    <div class="stp"><button type="button" data-act="dec" data-i="${n}" aria-label="Kurangi">&minus;</button><span>${i.qty}</span><button type="button" data-act="inc" data-i="${n}" aria-label="Tambah">+</button></div>
    <div class="lt">${rp(i.price*i.qty)}</div></div>`).join(""):'<div class="empty" style="margin-top:12px">Belum ada item. Pilih menu lalu tekan Tambah, atau ketuk menu di Pilih cepat.</div>';
  drawPay();
}
function drawPay(){
  const c=draftCalc(),m=draft.method;
  $("#paidBox").hidden=c.open;
  $("#qrisBox").innerHTML=m==="Transfer"?bankBox():m==="QRIS"?`<div class="qr">${db.settings.qris?`<img src="${db.settings.qris}" alt="Kode QRIS" data-act="qris-zoom">`:""}<p>${db.settings.qris?"Ketuk gambar untuk memperbesar. ":"Belum ada gambar QRIS. Unggah di Pengaturan. "}QRIS statis tidak mengirim konfirmasi otomatis, jadi isi jumlah yang benar-benar masuk.</p></div>`:"";
  $("#sCustL").textContent=c.open?"Nama pelanggan / meja (wajib untuk open bill)":"Nama pelanggan";
  $("#changeBox").innerHTML=c.change>0?`<div class="note"><b>Kembalian ${rp(c.change)}</b><label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="sOwe" ${draft.owe?"checked":""}> Kembalian belum diberikan</label>${draft.owe?`<div class="f" style="margin-top:8px"><label for="sChangeTo">Penerima kembalian</label><input class="in" id="sChangeTo" maxlength="40" value="${esc(draft.changeTo||draft.customer)}"></div>`:""}</div>`:"";
  const rr=chSet(draft.ch);
  const hasRb=draft.items.some(i=>{const m=menuById(i.id);return m&&m.rb});
  const resMsg=draft.reseller&&draft.items.length?(minProblem(draft.items,draft.ch)?`<div class="note warn">${esc(minProblem(draft.items,draft.ch).msg)}</div>`:(hasRb?(c.qty<=rr.thresh?`<div class="note">Tambah ${rr.thresh+1-c.qty} item lagi untuk harga grosir.</div>`:`<div class="note">Harga grosir berlaku (${c.qty} item).</div>`):"")):"";
  $("#tot").innerHTML=`${resMsg}<div class="rw"><span>Subtotal</span><b>${rp(c.sub)}</b></div>${c.disc?`<div class="rw"><span>Diskon reseller</span><b>-${rp(c.disc)}</b></div>`:""}${c.tax?`<div class="rw"><span>Pajak ${db.settings.tax}%</span><b>${rp(c.tax)}</b></div>`:""}
   <div class="gt"><span>Total</span><b>${rp(c.total)}</b></div>
   ${c.short>0&&draft.items.length?`<div class="note warn">Uang diterima kurang ${rp(c.short)} dari total.</div>`:""}
   ${c.open&&draft.items.length?`<div class="note">Pesanan disimpan dulu dan dibayar nanti dari menu Open Bill.</div>`:""}`;
  $("#saveSale").textContent=c.open?"Simpan Open Bill":"Simpan Transaksi";
  $("#saveSale").disabled=!draft.items.length;
}
function bankBox(){
  const bs=db.settings.banks||[];
  if(!bs.length)return `<div class="qr"><p>Belum ada rekening tujuan transfer. Isi sekali di Pengaturan > Rekening Transfer, nanti otomatis tampil di sini.</p></div>`;
  return `<div class="stack" style="gap:8px">`+bs.map(b=>`<div class="note" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>${esc(b.bank)}</b><div style="font-family:var(--font-receipt);font-size:15px;letter-spacing:.5px">${esc(b.no)}</div><div class="sub2">a.n. ${esc(b.name)}</div></div><button class="btn sm ghost" type="button" data-act="bank-copy" data-no="${esc(b.no)}">Salin</button></div>`).join("")+`<div class="sub2">Transfer tidak terkonfirmasi otomatis. Isi jumlah yang benar-benar masuk.</div></div>`;
}
function drawOwe(){
  const box=$("#owePanel");if(!box)return;
  const list=db.sales.filter(s=>oweOf(s)>0);
  const sum=list.reduce((a,s)=>a+oweOf(s),0),partial=list.filter(s=>(s.changeGiven||[]).length).length;
  box.innerHTML=`<h2>Kembalian belum diberikan</h2>`+(list.length?`<div class="cards" style="margin-bottom:12px"><div class="card k-warn"><span>Total kembalian tertahan</span><b>${rp(sum)}</b></div><div class="card"><span>Transaksi</span><b>${list.length}</b></div><div class="card"><span>Sudah sebagian diberikan</span><b>${partial}</b></div></div>
   <div class="tw"><table><thead><tr><th>Bill</th><th>Penerima</th><th class="r">Sisa kembalian</th><th></th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.no)}<div class="sub2">${fmtD(s.date)}</div></td><td>${esc(s.changeTo||s.customer||"-")}</td><td class="r">${rp(oweOf(s))}</td><td><button class="btn sm" type="button" data-act="give-change" data-id="${s.id}">Beri kembalian</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Tidak ada kembalian yang tertahan.</div>');
}
function drawHist(){
  const box=$("#hist");if(!box)return;
  const sales=db.sales.filter(s=>chOf(s)===saleMode).sort((a,b)=>b.ts-a.ts).slice(0,80);
  if(!sales.length){box.innerHTML='<div class="empty">Belum ada transaksi.</div>';return}
  const groups={};sales.forEach(s=>(groups[s.date]=groups[s.date]||[]).push(s));
  box.innerHTML=Object.keys(groups).sort().reverse().map(d=>{
    const g=groups[d],tot=g.reduce((a,s)=>a+s.total,0);
    return `<div class="dgrp"><span style="font-family:inherit;font-size:inherit;color:inherit">${fmtDay(d)}</span><span>${g.length} transaksi · ${rp(tot)}</span></div><div class="tw"><table><thead><tr><th>Bill</th><th>Item</th><th>Metode</th><th>Status</th><th class="r">Total</th><th></th></tr></thead><tbody>`+
    g.map(s=>{const st=statusOf(s),cls=st==="Lunas"?"p-ok":"p-warn";
      return `<tr><td>${esc(s.no)}<div class="sub2">${fmtT(s.ts)}${s.customer?" · "+esc(s.customer):""}</div></td><td style="max-width:260px">${esc(s.items.map(i=>i.qty+"× "+i.name).join(", "))}</td><td>${esc(s.method)}</td><td><span class="pill ${cls}">${st}</span>${chOf(s)!=="retail"?' <span class="pill p-mute">'+CH[chOf(s)]+'</span>':""}${s.sample?' <span class="pill p-mute">Contoh</span>':""}</td><td class="r">${rp(s.total)}</td>
      <td><div class="acts"><button class="btn sm ghost" type="button" data-act="receipt" data-id="${s.id}">Struk</button><button class="btn sm ghost" type="button" data-act="del-sale" data-id="${s.id}">Hapus</button></div></td></tr>`}).join("")+`</tbody></table></div>`}).join("");
}
function validateSale(){
  const c=draftCalc();
  if(!draft.items.length){toast("Belum ada item");return null}
  if(draft.reseller){const pr=minProblem(draft.items,draft.ch);if(pr){toast(pr.msg);return null}}
  if(c.open){
    if(!draft.customer.trim()){toast("Isi nama pelanggan atau nomor meja untuk open bill");const e=$("#sCust");if(e)e.focus();return null}
  }else{
    if(!c.recv){toast("Isi jumlah uang diterima");const e=$("#sPaid");if(e)e.focus();return null}
    if(c.recv<c.total){toast("Uang diterima kurang dari total");const e=$("#sPaid");if(e)e.focus();return null}
  }
  return c;
}
function showConfirmSale(){
  const c=validateSale();if(!c)return;
  const rows=draft.items.map(i=>`<div class="r"><span>${i.qty}\u00d7 ${esc(i.name)}</span><b>${rp(i.price*i.qty)}</b></div>`).join("");
  const cust=draft.customer.trim(),note=draft.note.trim();
  openModal(`<h3>${c.open?"Simpan sebagai open bill?":"Konfirmasi transaksi"}</h3><div class="sub2">Periksa pesanan dan pembayaran sebelum disimpan.</div>
   <div class="cf">${rows}<div class="r s"><span>Subtotal</span><b>${rp(c.sub)}</b></div>${c.disc?`<div class="r s"><span>Diskon reseller</span><b>-${rp(c.disc)}</b></div>`:""}${c.tax?`<div class="r s"><span>Pajak ${db.settings.tax}%</span><b>${rp(c.tax)}</b></div>`:""}<div class="r t"><span>Total</span><b>${rp(c.total)}</b></div></div>
   <div class="cf"><div class="r"><span>Metode</span><b>${esc(draft.method)}</b></div>${c.open?"":`<div class="r"><span>Uang diterima</span><b>${rp(c.recv)}</b></div><div class="r"><span>Kembalian</span><b>${rp(c.change)}${c.change>0&&draft.owe?" (belum diberikan)":""}</b></div>`}${cust?`<div class="r"><span>Pelanggan</span><b>${esc(cust)}</b></div>`:""}${note?`<div class="r"><span>Catatan</span><b>${esc(note)}</b></div>`:""}</div>
   <div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Periksa lagi</button><button class="btn" type="button" data-act="sale-confirm">${c.open?"Ya, simpan open bill":"Ya, simpan transaksi"}</button></div>`);
}
function saveSale(){
  const c=validateSale();if(!c)return;
  const s=createSale({date:draft.date||today(),items:draft.items,method:draft.method,received:c.recv,customer:draft.customer.trim(),phone:(draft.phone||"").trim(),
    changeTo:(draft.changeTo||draft.customer).trim(),owe:draft.owe&&c.change>0,open:c.open,note:draft.note.trim(),reseller:draft.reseller,ch:draft.ch});
  save();newDraft();renderSale();
  if(c.open){toast("Open bill "+s.no+" disimpan")}else{toast("Transaksi "+s.no+" disimpan");showReceipt(s)}
}

/* menu & stok */
let menuEdit=null,menuQ="",menuShowArch=false;
let menuCh="retail";
SCREENS.menu=function(){menuCh="retail";menuEdit=null;renderMenu()};
SCREENS.menures=function(){menuCh="reseller";menuEdit=null;renderMenu()};
SCREENS.menudist=function(){menuCh="distributor";menuEdit=null;renderMenu()};
function renderMenu(){
  const m=menuEdit?menuById(menuEdit):null;
  const cats=Array.from(new Set(menusOf(menuCh).map(x=>x.cat))).filter(Boolean);
  const rl=menuCh==="retail"?"":(()=>{const x=menuCh==="reseller"?"r":"d",st=chSet(menuCh);return `<div class="panel"><h2>Aturan minimal pembelian ${CH[menuCh].toLowerCase()}</h2><form id="${menuCh}Form" class="stack" style="gap:12px"><div class="fgrid">
      <div class="f"><label for="${x}Min">Minimal ambil umum (item)</label><input class="in num" id="${x}Min" inputmode="numeric" value="${st.min}"></div>
      <div class="f"><label for="${x}Thr">Harga grosir berlaku jika lebih dari (item)</label><input class="in num" id="${x}Thr" inputmode="numeric" value="${st.thresh}"></div></div>
      <div class="row-btns"><button class="btn" type="submit">Simpan aturan</button></div>
      <div class="sub2">Minimal umum berlaku untuk menu yang kolom "Minimal beli (menu ini)" di bawah dikosongkan. Menu yang kolom itu diisi memakai angka sendiri.</div></form></div>`})();
  main.innerHTML=`<div class="stack">${rl}
   <div class="panel"><h2>${m?"Ubah menu":"Tambah menu"}${menuCh==="retail"?"":" "+CH[menuCh].toLowerCase()}</h2>
    <form id="menuForm" class="stack" style="gap:12px">
     <div class="fgrid">
      <div class="f"><label for="mName">Nama menu</label><input class="in" id="mName" required maxlength="40" value="${m?esc(m.name):""}"></div>
      <div class="f"><label for="mCat">Kategori</label><input class="in" id="mCat" list="catList" required maxlength="24" value="${m?esc(m.cat):""}"><datalist id="catList">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
      <div class="f"><label for="mUnit">Satuan</label><input class="in" id="mUnit" maxlength="12" value="${m?esc(m.unit):"porsi"}"></div>
      <div class="f"><label for="mCost">Harga modal</label><input class="in num" id="mCost" inputmode="numeric" value="${m?nf.format(m.cost):""}" placeholder="0"></div>
      <div class="f"><label for="mPrice">Harga jual</label><input class="in num" id="mPrice" inputmode="numeric" required value="${m?nf.format(m.price):""}" placeholder="0"></div>
      ${menuCh==="retail"?"":`<div class="f"><label for="mRB">Harga grosir ${CH[menuCh].toLowerCase()}</label><input class="in num" id="mRB" inputmode="numeric" value="${m&&m.rb?nf.format(m.rb):""}" placeholder="Kosong = tidak ada harga grosir"></div>
      <div class="f"><label for="mRMin">Minimal beli (menu ini)</label><input class="in num" id="mRMin" inputmode="numeric" value="${m&&m.rmin?m.rmin:""}" placeholder="Kosong = ikut minimal umum di Pengaturan"></div>`}
      <div class="f"><label for="mStock">${m?"Stok saat ini":"Stok awal"}</label><input class="in num" id="mStock" inputmode="numeric" value="${m&&m.stock!=null?m.stock:""}" placeholder="Kosong = tidak dilacak"></div>
      <div class="f"><label for="mMin">Stok minimum</label><input class="in num" id="mMin" inputmode="numeric" value="${m?m.min:""}" placeholder="0"></div>
      <div class="f"><label for="mNote">Catatan</label><input class="in" id="mNote" maxlength="80" value="${m?esc(m.note):""}"></div>
     </div>
     <div class="row-btns"><button class="btn" type="submit">${m?"Simpan perubahan":"+ Tambah Menu"}</button>${m?'<button class="btn ghost" type="button" data-act="menu-cancel">Batal</button>':""}</div>
    </form></div>
   <div class="panel"><div class="ph"><h2 style="margin:0">Daftar menu</h2><span class="sp"></span>
     <input class="in" id="menuQ" placeholder="Cari menu" style="max-width:200px" value="${esc(menuQ)}" aria-label="Cari menu">
     <label style="display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted)"><input type="checkbox" id="menuArch" ${menuShowArch?"checked":""}> Tampilkan arsip</label></div>
     <div id="menuList"></div></div></div>`;
  drawMenuList();
}
function drawMenuList(){
  const q=menuQ.trim().toLowerCase();
  const list=menusOf(menuCh).filter(m=>(menuShowArch||!m.archived)&&(!q||m.name.toLowerCase().includes(q)||m.cat.toLowerCase().includes(q)));
  $("#menuList").innerHTML=list.length?`<div class="tw"><table><thead><tr><th>Menu</th><th>Kategori</th><th class="r">Modal</th><th class="r">Harga</th><th class="r">Stok</th><th>Status</th><th></th></tr></thead><tbody>`+
   list.map(m=>{const s=stockState(m);return `<tr><td><b style="font-weight:600">${esc(m.name)}</b>${m.note?`<div class="sub2">${esc(m.note)}</div>`:""}</td><td>${esc(m.cat)}</td><td class="r">${rp(m.cost)}</td><td class="r">${rp(m.price)}</td>
    <td class="r">${m.stock==null?"-":m.stock+" "+esc(m.unit)}</td><td><span class="pill ${s[1]}">${s[0]}</span></td>
    <td><div class="acts"><button class="btn sm ghost" type="button" data-act="menu-edit" data-id="${m.id}">Ubah</button>${m.stock!=null&&!m.archived?`<button class="btn sm ghost" type="button" data-act="menu-stock" data-id="${m.id}">Stok</button>`:""}<button class="btn sm ghost" type="button" data-act="menu-arch" data-id="${m.id}">${m.archived?"Aktifkan":"Arsipkan"}</button><button class="btn sm ghost" type="button" data-act="menu-del" data-id="${m.id}">Hapus</button></div></td></tr>`}).join("")+`</tbody></table></div>`:'<div class="empty">Tidak ada menu yang cocok.</div>';
}
function submitMenu(){
  const name=$("#mName").value.trim(),cat=$("#mCat").value.trim(),price=digits($("#mPrice").value);
  if(!name||!cat||!price){toast("Nama, kategori, dan harga jual wajib diisi");return}
  const sv=$("#mStock").value.trim();
  const rec={name:name,cat:cat,unit:$("#mUnit").value.trim()||"porsi",cost:digits($("#mCost").value),price:price,stock:sv===""?null:digits(sv),min:digits($("#mMin").value),rb:$("#mRB")?digits($("#mRB").value)||0:0,rmin:$("#mRMin")?digits($("#mRMin").value)||0:0,note:$("#mNote").value.trim()};
  if(menuEdit){Object.assign(menuById(menuEdit),rec);toast("Menu diperbarui")}
  else{rec.id="m"+uid();rec.archived=false;rec.ch=menuCh;db.menu.push(rec);toast(name+" ditambahkan")}
  menuEdit=null;save();renderMenu();
}

/* kas */
let kasFrom=null,kasTo=null;
SCREENS.kas=function(){
  if(!kasFrom){kasFrom=today().slice(0,8)+"01";kasTo=today()}
  main.innerHTML=`<div class="stack">
   <div class="panel"><h2>Catat kas</h2>
    <form id="kasForm" class="stack" style="gap:12px"><div class="fgrid">
      <div class="f"><label for="kDate">Tanggal</label><input class="in" type="date" id="kDate" value="${today()}" required></div>
      <div class="f"><label for="kType">Jenis</label><select class="in" id="kType"><option value="in">Kas masuk</option><option value="out">Kas keluar</option></select></div>
      <div class="f"><label for="kCat">Kategori</label><input class="in" id="kCat" list="kcat" required maxlength="30" placeholder="Contoh: Belanja bahan"><datalist id="kcat"><option value="Belanja bahan"><option value="Gaji"><option value="Listrik & air"><option value="Sewa"><option value="Modal tambahan"><option value="Lain-lain"></datalist></div>
      <div class="f"><label for="kAmt">Jumlah</label><input class="in num" id="kAmt" inputmode="numeric" required placeholder="0"></div>
      <div class="f"><label for="kWho">Sumber / penerima</label><input class="in" id="kWho" maxlength="40"></div>
      <div class="f"><label for="kRef">Referensi</label><input class="in" id="kRef" maxlength="30" placeholder="No. nota"></div>
      <div class="f"><label for="kNote">Catatan</label><input class="in" id="kNote" maxlength="80"></div>
     </div><div class="row-btns"><button class="btn" type="submit">Simpan Kas</button></div></form></div>
   <div class="panel"><div class="ph"><h2 style="margin:0">Riwayat kas</h2><span class="sp"></span>
     <div class="f" style="flex-direction:row;align-items:center;gap:6px"><label for="kFrom">Dari</label><input class="in" type="date" id="kFrom" value="${kasFrom}" style="width:auto"></div>
     <div class="f" style="flex-direction:row;align-items:center;gap:6px"><label for="kTo">Sampai</label><input class="in" type="date" id="kTo" value="${kasTo}" style="width:auto"></div></div>
     <div id="kasSum" class="cards" style="margin-bottom:12px"></div><div id="kasList"></div></div></div>`;
  drawKas();
};
function drawKas(){
  const t=kasTotals(kasFrom,kasTo),list=kasEntries(kasFrom,kasTo);
  $("#kasSum").innerHTML=`<div class="card k-ok"><span>Kas masuk</span><b>${rp(t.in)}</b></div><div class="card k-bad"><span>Kas keluar</span><b>${rp(t.out)}</b></div><div class="card"><span>Kas bersih</span><b>${rp(t.net)}</b></div>`;
  $("#kasList").innerHTML=list.length?`<div class="tw"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Sumber / penerima</th><th>Referensi</th><th class="r">Jumlah</th><th></th></tr></thead><tbody>`+
   list.map(e=>`<tr><td>${fmtD(e.date)}</td><td><span class="pill ${e.type==="in"?"p-ok":"p-bad"}">${e.type==="in"?"Masuk":"Keluar"}</span></td><td>${esc(e.cat)}${e.note?`<div class="sub2">${esc(e.note)}</div>`:""}</td><td>${esc(e.who||"-")}</td><td>${esc(e.ref||"-")}</td><td class="r">${e.type==="out"?"−":""}${rp(e.amount)}</td>
    <td>${e.auto?'<span class="pill p-mute">Otomatis</span>':`<button class="btn sm ghost" type="button" data-act="kas-del" data-id="${e.id}">Hapus</button>`}</td></tr>`).join("")+`</tbody></table></div>`:'<div class="empty">Belum ada catatan kas pada periode ini.</div>';
}

/* open bill */
const getSale=id=>db.sales.find(x=>x.id===id);
function updObChg(){
  const f=$("#obPayForm"),box=$("#obChg");if(!f||!box)return;
  const s=getSale(f.dataset.id);if(!s)return;
  const rem=remainOf(s),recv=digits($("#obRecv").value),diff=recv-rem;
  box.innerHTML=!recv?'<div class="r s"><span>Ketik uang yang diterima</span><b></b></div>':diff>=0?`<div class="r"><span>Kembalian</span><b>${rp(diff)}</b></div>`:`<div class="r" style="color:var(--bad)"><span>Kurang</span><b>${rp(-diff)}</b></div>`;
}
SCREENS.openbill=function(){
  const list=db.sales.filter(s=>s.open).sort((a,b)=>a.ts-b.ts);
  const total=list.reduce((a,s)=>a+remainOf(s),0);
  const card=s=>`<div class="obc"><div class="oh"><div><b>${esc(s.customer||"-")}</b><div class="sub2">${esc(s.no)} \u00b7 ${fmtD(s.date)} ${fmtT(s.ts)}</div></div><span class="pill p-warn">Open Bill</span></div>
    <div class="oi">${s.items.map(i=>`<div class="it"><span>${i.qty}\u00d7 ${esc(i.name)}</span><span class="num">${rp(i.price*i.qty)}</span></div>`).join("")}</div>
    ${s.note?`<div class="sub2">${esc(s.note)}</div>`:""}
    <div class="it tt"><span>Belum dibayar</span><b>${rp(remainOf(s))}</b></div>
    <div class="row-btns"><button class="btn sm" type="button" data-act="ob-pay" data-id="${s.id}">Bayar</button><button class="btn sm ghost" type="button" data-act="ob-add" data-id="${s.id}">Tambah item</button><button class="btn sm ghost" type="button" data-act="ob-del" data-id="${s.id}">Batalkan</button></div></div>`;
  main.innerHTML=`<div class="stack"><div class="cards"><div class="card k-warn"><span>Total belum dibayar</span><b>${rp(total)}</b></div><div class="card"><span>Jumlah open bill</span><b>${list.length}</b></div></div>
   <div class="panel"><h2>Open bill aktif</h2>${list.length?`<div class="ob">${list.map(card).join("")}</div>`:'<div class="empty">Tidak ada open bill. Pilih "Open Bill" di halaman Penjualan untuk menyimpan pesanan yang dibayar belakangan.</div>'}</div></div>`;
};

/* laporan */
let lapFrom=null,lapTo=null;
function lapData(){
  const all=db.sales.filter(s=>dOf(s)>=lapFrom&&dOf(s)<=lapTo).sort((a,b)=>a.ts-b.ts);
  const closed=all.filter(s=>!s.open);
  const k=kasTotals(lapFrom,lapTo);
  return {sales:all,closed:closed,omzet:closed.reduce((a,s)=>a+s.total,0),laba:closed.reduce((a,s)=>a+profitOf(s),0),items:closed.reduce((a,s)=>a+qtyOf(s),0),
    kin:k.in,kout:k.out,knet:k.net,open:all.filter(s=>s.open).reduce((a,s)=>a+remainOf(s),0)};
}
SCREENS.laporan=function(){
  if(!lapFrom){lapFrom=today().slice(0,8)+"01";lapTo=today()}
  main.innerHTML=`<div class="stack"><div class="panel"><div class="ph">
    <div class="f"><label for="lFrom">Dari</label><input class="in" type="date" id="lFrom" value="${lapFrom}"></div>
    <div class="f"><label for="lTo">Sampai</label><input class="in" type="date" id="lTo" value="${lapTo}"></div>
    <button class="btn" type="button" data-act="lap-show" style="align-self:flex-end">Tampilkan</button><span class="sp"></span>
    <button class="btn" type="button" data-act="lap-xlsx" style="align-self:flex-end">Unduh Excel</button>
    <button class="btn ghost" type="button" data-act="lap-csv" style="align-self:flex-end">Export CSV</button>
    <button class="btn ghost" type="button" data-act="lap-html" style="align-self:flex-end">Unduh laporan</button></div>
    <div class="sub2">Unduh Excel berisi semua laporan dalam satu file: Ringkasan, Penjualan, Rincian Item, Kas, Open Bill, dan Stok. Laporan HTML bisa dicetak atau disimpan sebagai PDF dari browser.</div></div>
   <div id="lapBody" class="stack"></div></div>`;
  drawLap();
};
function drawLap(){
  const d=lapData();
  $("#lapBody").innerHTML=`<div class="cards">
    <div class="card"><span>Transaksi selesai</span><b>${d.closed.length}</b></div><div class="card"><span>Item terjual</span><b>${d.items}</b></div><div class="card"><span>Omzet</span><b>${rp(d.omzet)}</b></div>
    <div class="card k-ok"><span>Laba kotor</span><b>${rp(d.laba)}</b></div><div class="card"><span>Kas masuk</span><b>${rp(d.kin)}</b></div><div class="card"><span>Kas keluar</span><b>${rp(d.kout)}</b></div>
    <div class="card"><span>Kas bersih</span><b>${rp(d.knet)}</b></div><div class="card k-warn"><span>Open bill belum dibayar</span><b>${rp(d.open)}</b></div></div>
   <div class="panel"><h2>Rincian per bill</h2>${d.sales.length?`<div class="tw"><table><thead><tr><th>Bill</th><th>Tanggal</th><th>Status</th><th>Item</th><th class="r">Qty</th><th class="r">Total</th><th class="r">Laba</th><th class="r">Dibayar</th><th class="r">Belum dibayar</th><th>Pelanggan</th><th>Catatan</th></tr></thead><tbody>`+
   d.sales.map(s=>`<tr><td>${esc(s.no)}</td><td>${fmtD(dOf(s))}</td><td><span class="pill ${s.open?"p-warn":"p-ok"}">${statusOf(s)}</span></td><td style="min-width:200px">${esc(s.items.map(i=>i.qty+"\u00d7 "+i.name+" @"+nf.format(i.price)).join(", "))}</td><td class="r">${qtyOf(s)}</td><td class="r">${rp(s.total)}</td><td class="r">${rp(profitOf(s))}</td><td class="r">${rp(paidOf(s))}</td><td class="r">${rp(remainOf(s))}</td><td>${esc(s.customer||"-")}</td><td>${esc(s.note||"-")}</td></tr>`).join("")+`</tbody></table></div>`:'<div class="empty">Tidak ada transaksi pada periode ini.</div>'}</div>`;
}
const csvCell=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
function lapCSV(){
  const d=lapData();
  const rows=[["Bill","Tanggal","Waktu","Status","Item","Qty","Total","Laba","Dibayar","Belum dibayar","Metode","Pelanggan","Catatan"]];
  d.sales.forEach(s=>rows.push([s.no,dOf(s),fmtT(s.ts),statusOf(s),s.items.map(i=>i.qty+"x "+i.name).join("; "),qtyOf(s),s.total,profitOf(s),paidOf(s),remainOf(s),s.method,s.customer,s.note]));
  return "\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
}
function lapHTML(){
  const d=lapData(),e=esc;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan ${e(db.settings.store)}</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#2c1810}h1{margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #d9d2c7;padding:6px 8px;text-align:left;font-size:12.5px}th{background:#f6f3ee}td.r,th.r{text-align:right}.s{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}.s div{border:1px solid #d9d2c7;padding:8px 10px;border-radius:6px}.s b{display:block;font-size:17px}</style></head><body><h1>${e(db.settings.store)}</h1><div>Laporan penjualan ${fmtD(lapFrom)} sampai ${fmtD(lapTo)}</div>
  <div class="s"><div>Transaksi selesai<b>${d.closed.length}</b></div><div>Omzet<b>${rp(d.omzet)}</b></div><div>Laba kotor<b>${rp(d.laba)}</b></div><div>Open bill belum dibayar<b>${rp(d.open)}</b></div><div>Kas masuk<b>${rp(d.kin)}</b></div><div>Kas keluar<b>${rp(d.kout)}</b></div><div>Kas bersih<b>${rp(d.knet)}</b></div><div>Item terjual<b>${d.items}</b></div></div>
  <table><thead><tr><th>Bill</th><th>Tanggal</th><th>Status</th><th>Item</th><th class="r">Total</th><th class="r">Laba</th><th class="r">Dibayar</th><th class="r">Belum dibayar</th><th>Pelanggan</th></tr></thead><tbody>${d.sales.map(s=>`<tr><td>${e(s.no)}</td><td>${fmtD(dOf(s))}</td><td>${statusOf(s)}</td><td>${e(s.items.map(i=>i.qty+"x "+i.name).join(", "))}</td><td class="r">${rp(s.total)}</td><td class="r">${rp(profitOf(s))}</td><td class="r">${rp(paidOf(s))}</td><td class="r">${rp(remainOf(s))}</td><td>${e(s.customer||"-")}</td></tr>`).join("")}</tbody></table></body></html>`;
}

/* ---------- excel (semua laporan dalam satu file) ---------- */
function buildXlsx(){
  const X=window.XLSX;if(!X)return null;
  const d=lapData(),wb=X.utils.book_new(),fmt="#,##0";
  const add=(name,aoa,widths,numCols)=>{
    const ws=X.utils.aoa_to_sheet(aoa);
    ws["!cols"]=widths.map(w=>({wch:w}));
    (numCols||[]).forEach(c=>{for(let r=1;r<aoa.length;r++){const ref=X.utils.encode_cell({r:r,c:c});if(ws[ref]&&typeof ws[ref].v==="number")ws[ref].z=fmt}});
    X.utils.book_append_sheet(wb,ws,name);
  };
  add("Ringkasan",[[db.settings.store+" - Laporan "+fmtD(lapFrom)+" sampai "+fmtD(lapTo),""],["Transaksi selesai",d.closed.length],["Item terjual",d.items],["Omzet",d.omzet],["Laba kotor",d.laba],["Kas masuk",d.kin],["Kas keluar",d.kout],["Kas bersih",d.knet],["Open bill belum dibayar",d.open]],[46,18],[1]);
  const pj=[["Bill","Tanggal","Waktu","Status","Metode","Pelanggan","Item","Qty","Subtotal","Pajak","Total","Laba","Dibayar","Belum dibayar","Catatan","Kanal","Diskon"]];
  d.sales.forEach(s=>pj.push([s.no,dOf(s),fmtT(s.ts),statusOf(s),s.method,s.customer||"",s.items.map(i=>i.qty+"x "+i.name).join("; "),qtyOf(s),s.sub,s.tax,s.total,profitOf(s),paidOf(s),remainOf(s),s.note||"",CH[chOf(s)],s.disc||0]));
  add("Penjualan",pj,[20,12,8,11,12,18,40,6,12,10,12,12,12,14,24,10,12],[7,8,9,10,11,12,13,16]);
  const ri=[["Bill","Tanggal","Menu","Qty","Harga","Modal","Total","Laba"]];
  d.sales.forEach(s=>s.items.forEach(i=>ri.push([s.no,dOf(s),i.name,i.qty,i.price,i.cost,i.price*i.qty,(i.price-i.cost)*i.qty])));
  add("Rincian Item",ri,[20,12,28,6,12,12,12,12],[3,4,5,6,7]);
  const ks=[["Tanggal","Jenis","Kategori","Sumber/Penerima","Referensi","Catatan","Masuk","Keluar"]];
  kasEntries(lapFrom,lapTo).forEach(e=>ks.push([e.date,e.type==="in"?"Masuk":"Keluar",e.cat,e.who||"",e.ref||"",e.note||"",e.type==="in"?e.amount:"",e.type==="out"?e.amount:""]));
  add("Kas",ks,[12,9,22,22,20,24,12,12],[6,7]);
  const ob=[["Bill","Tanggal","Pelanggan","Item","Total","Dibayar","Belum dibayar"]];
  db.sales.filter(s=>s.open).forEach(s=>ob.push([s.no,s.date,s.customer||"",s.items.map(i=>i.qty+"x "+i.name).join("; "),s.total,paidOf(s),remainOf(s)]));
  add("Open Bill",ob,[20,12,20,40,12,12,14],[4,5,6]);
  const sk=[["Kanal","Menu","Kategori","Satuan","Modal","Harga","Stok","Minimum","Status"]];
  db.menu.forEach(m=>sk.push([CH[chOf(m)],m.name,m.cat,m.unit,m.cost,m.price,m.stock==null?"":m.stock,m.min,stockState(m)[0]]));
  add("Stok",sk,[12,28,14,10,12,12,10,10,14],[4,5,6,7]);
  return X.write(wb,{bookType:"xlsx",type:"array"});
}

/* backup */
function backupObj(parts){
  const o={app:"kasir-kafe",version:1,exportedAt:new Date().toISOString(),store:db.settings.store};
  (parts||["menu","sales","kas"]).forEach(p=>o[p]=db[p]);return o;
}
SCREENS.backup=function(){
  const al=autoList();
  main.innerHTML=`<div class="stack"><div class="cols">
   <div class="stack">
    <div class="panel"><h2>Unduh cadangan</h2><p class="sub2" style="margin:0 0 12px">Cadangan berisi menu, transaksi, dan kas dalam satu file JSON. Simpan di tempat aman dan unduh secara berkala.</p>
      <div class="row-btns"><button class="btn" type="button" data-act="bk-full">Download Backup</button><button class="btn ghost" type="button" data-act="bk-copy">Salin JSON</button></div>
      <div class="lbl" style="margin:14px 0 6px">Atau pilih bagian tertentu</div>
      <div class="row-btns" style="margin-bottom:10px">${[["menu","Menu & Stok"],["sales","Penjualan"],["kas","Kas manual"]].map(p=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-part="${p[0]}" checked> ${p[1]}</label>`).join("")}</div>
      <button class="btn ghost" type="button" data-act="bk-part">Unduh Cadangan Terpilih</button></div>
    <div class="panel"><h2>Restore</h2><p class="sub2" style="margin:0 0 12px">Restore menggabungkan data berdasarkan ID. Transaksi yang sudah ada tidak dihapus atau ditimpa.</p>
      <div class="row-btns" style="margin-bottom:12px"><button class="btn" type="button" data-act="bk-file">Pilih file cadangan</button></div>
      <div class="f"><label for="bkPaste">Atau tempel isi JSON</label><textarea class="in num" id="bkPaste" style="min-height:90px" placeholder='{"app":"kasir-kafe", ...}'></textarea></div>
      <div class="row-btns" style="margin-top:10px"><button class="btn ghost" type="button" data-act="bk-paste">Gabungkan dari teks</button></div></div>
   </div>
   <div class="panel"><h2>Backup otomatis</h2><p class="sub2" style="margin:0 0 12px">Salinan harian disimpan di browser ini saat kasir dibuka. PIN dan gambar QRIS tidak ikut tersimpan.</p>
     ${al.length?al.map((a,i)=>{let n="";try{const d=JSON.parse(a.json);n=d.sales.length+" transaksi · "+d.menu.length+" menu"}catch(e){}return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)"><div><b style="font-weight:600">${fmtD(a.date)}</b><div class="sub2">${n}</div></div><button class="btn sm ghost" type="button" data-act="bk-auto" data-i="${i}">Gabungkan</button></div>`}).join(""):'<div class="empty">Belum ada salinan otomatis.</div>'}
   </div></div></div>`;
};
function mergeInto(obj){
  let added={menu:0,sales:0,kas:0};
  if(!obj||obj.app!=="kasir-kafe")throw new Error("Bukan file cadangan Kasir Kafe");
  ["menu","sales","kas"].forEach(k=>{if(!Array.isArray(obj[k]))return;const ids=new Set(db[k].map(x=>x.id));obj[k].forEach(x=>{if(x&&x.id&&!ids.has(x.id)){db[k].push(x);added[k]++}})});
  db.sampled=true;migrate();save();return added;
}
function doRestore(text){
  try{const a=mergeInto(JSON.parse(text));toast("Digabungkan: "+a.menu+" menu, "+a.sales+" transaksi, "+a.kas+" kas");SCREENS.backup()}
  catch(e){toast(e.message&&e.message.indexOf("Bukan")===0?e.message:"File tidak valid, tidak ada data yang berubah")}
}
$("#fileRestore").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>doRestore(String(r.result));r.readAsText(f);e.target.value="";
});

/* pengaturan */
SCREENS.pengaturan=function(){
  const hasSamp=hasSample();
  main.innerHTML=`<div class="stack"><div class="cols">
   <div class="stack">
    <div class="panel"><h2>Usaha</h2><form id="storeForm" class="stack" style="gap:12px"><div class="fgrid">
      <div class="f"><label for="stName">Nama usaha (tampil di struk)</label><input class="in" id="stName" maxlength="32" value="${esc(db.settings.store)}" required></div>
      <div class="f"><label for="stTax">Pajak penjualan (%)</label><input class="in num" id="stTax" inputmode="decimal" value="${db.settings.tax}"></div></div>
      <div class="row-btns"><button class="btn" type="submit">Simpan</button></div></form></div>
    ${["reseller","distributor"].map(c=>{const x=c==="reseller"?"r":"d",st=chSet(c);return `<div class="panel"><h2>Aturan ${CH[c]}</h2><form id="${c}Form" class="stack" style="gap:12px"><div class="fgrid">
      <div class="f"><label for="${x}Min">Minimal ambil (item)</label><input class="in num" id="${x}Min" inputmode="numeric" value="${st.min}"></div>
      <div class="f"><label for="${x}Thr">Harga grosir berlaku jika lebih dari (item)</label><input class="in num" id="${x}Thr" inputmode="numeric" value="${st.thresh}"></div></div>
      <div class="row-btns"><button class="btn" type="submit">Simpan aturan</button></div>
      <div class="sub2">Harga dan harga grosir per menu diisi di Menu & Stok ${CH[c]}. Jumlah dihitung dari total semua item dalam satu transaksi.</div></form></div>`}).join("")}
    <div class="panel"><h2>Printer Thermal</h2><div class="stack" style="gap:12px">
      <div class="f"><label for="ptWidth">Lebar kertas</label><select class="in" id="ptWidth"><option value="32" ${db.settings.printer.width!==48?"selected":""}>58 mm (32 karakter)</option><option value="48" ${db.settings.printer.width===48?"selected":""}>80 mm (48 karakter)</option></select></div>
      <div class="note" id="btStat">${btStatus()}</div>
      <div class="row-btns"><button class="btn" type="button" data-act="bt-connect">Hubungkan Bluetooth</button><button class="btn ghost" type="button" data-act="bt-test">Cetak tes</button></div>
      <div class="sub2">Bluetooth langsung hanya jalan di Chrome/Edge (Android atau komputer) dan butuh printer jenis BLE. Jika printer tidak muncul, pakai opsi RawBT atau cetak lewat browser di tombol Cetak pada struk.</div></div></div>
    <div class="panel"><h2>Ganti PIN</h2><form id="pinForm" class="stack" style="gap:12px"><div class="fgrid">
      <div class="f"><label for="pOld">PIN lama</label><input class="in num" id="pOld" type="password" inputmode="numeric" maxlength="6" required autocomplete="off"></div>
      <div class="f"><label for="pNew">PIN baru (4 sampai 6 angka)</label><input class="in num" id="pNew" type="password" inputmode="numeric" maxlength="6" required autocomplete="off"></div>
      <div class="f"><label for="pNew2">Ulangi PIN baru</label><input class="in num" id="pNew2" type="password" inputmode="numeric" maxlength="6" required autocomplete="off"></div></div>
      <div class="row-btns"><button class="btn" type="submit">Ganti PIN</button></div>
      <div class="sub2">PIN hanya mengunci tampilan kasir di browser ini dan disimpan di perangkat. Ini bukan pengamanan data yang kuat.</div></form></div>
   </div>
   <div class="stack">
    <div class="panel"><h2>Rekening Transfer</h2><p class="sub2" style="margin:0 0 12px">Isi sekali, rekening tampil otomatis saat kasir memilih pembayaran Transfer.</p>
      ${(db.settings.banks||[]).map(b=>`<div class="note" style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px"><div><b>${esc(b.bank)}</b> ${esc(b.no)}<div class="sub2">a.n. ${esc(b.name)}</div></div><button class="btn sm ghost" type="button" data-act="bank-del" data-id="${b.id}">Hapus</button></div>`).join("")}
      <form id="bankForm" class="stack" style="gap:12px"><div class="fgrid">
        <div class="f"><label for="bkBank">Bank / e-wallet</label><input class="in" id="bkBank" maxlength="24" placeholder="Contoh: BCA, BRI, DANA" required></div>
        <div class="f"><label for="bkNo">Nomor rekening</label><input class="in num" id="bkNo" inputmode="numeric" maxlength="30" required></div>
        <div class="f"><label for="bkName">Atas nama</label><input class="in" id="bkName" maxlength="40" required></div></div>
      <div class="row-btns"><button class="btn" type="submit">+ Tambah rekening</button></div></form></div>
    <div class="panel"><h2>Gambar QRIS</h2><p class="sub2" style="margin:0 0 12px">Unggah gambar QRIS toko. Gambar tampil saat kasir memilih pembayaran QRIS.</p>
      ${db.settings.qris?`<img src="${db.settings.qris}" alt="QRIS tersimpan" style="width:150px;height:150px;object-fit:contain;background:#fff;border-radius:10px;border:1px solid var(--line);margin-bottom:12px;display:block">`:""}
      <div class="row-btns"><button class="btn" type="button" data-act="qris-up">${db.settings.qris?"Ganti gambar":"Unggah gambar"}</button>${db.settings.qris?'<button class="btn ghost" type="button" data-act="qris-clear">Hapus</button>':""}</div></div>
    <div class="panel"><h2>Data</h2><div class="stack" style="gap:12px">
      ${hasSamp?`<div><div class="note warn" style="margin-bottom:8px">Aplikasi ini berisi menu, transaksi, dan kas contoh.</div><button class="btn ghost" type="button" data-act="rm-sample">Hapus data contoh</button></div>`:""}
      <div><div class="sub2" style="margin-bottom:8px">Menghapus semua transaksi dan kas, lalu mengarsipkan semua menu. Unduh backup lebih dulu.</div><button class="btn bad" type="button" data-act="wipe">Hapus Transaksi & Arsipkan Menu</button></div></div></div>
   </div></div></div>`;
};
function pickQris(file){
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    const sc=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement("canvas");
    c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    db.settings.qris=c.toDataURL("image/png");URL.revokeObjectURL(url);save();SCREENS.pengaturan();toast("Gambar QRIS disimpan");
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast("Gambar tidak bisa dibaca")};
  img.src=url;
}
$("#fileQris").addEventListener("change",e=>{const f=e.target.files[0];if(f)pickQris(f);e.target.value=""});

/* ---------- aksi (delegasi) ---------- */
function rmSample(){
  askConfirm("Hapus data contoh?","Menu, transaksi, dan kas contoh akan dihapus. Data yang kamu catat sendiri tetap ada.","Hapus",()=>{
    db.sales=db.sales.filter(x=>!x.sample);db.kas=db.kas.filter(k=>!k.sample);
    const used=new Set();db.sales.forEach(x=>x.items.forEach(i=>used.add(i.id)));
    db.menu=db.menu.filter(m=>!isSeedMenu(m)||used.has(m.id));
    draft=null;DR={};save();closeModal();go(cur);toast("Data contoh dihapus");
  });
}
const ACT={
  close:()=>closeModal(),
  goto:t=>go(t.dataset.r),
  "confirm-ok":()=>{const f=confirmFn;confirmFn=null;if(f)f()},
  logout:()=>{closeModal();sb.auth.signOut().then(()=>location.reload())},
  "rm-sample":rmSample,
  "print-rc":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s)printMenu(s)},
  "pr-bt":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s){closeModal();btPrintSale(s)}},
  "pr-raw":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s)rawbtPrint(s)},
  "pr-br":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s){closeModal();browserPrint(s)}},
  "rc-back":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s)showReceipt(s)},
  "bt-connect":async()=>{try{await btConnect(true);toast("Printer terhubung")}catch(e){if(!(e&&e.name==="NotFoundError"))toast("Gagal: "+(e.message||e))}},
  "bt-test":()=>btPrintSale(sampleSale()),
  "copy-rc":()=>copyEl($("#rcText"),"Struk disalin"),
  "share-rc":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s)shareReceipt(s)},
  "add-item":()=>{
    const id=$("#sMenu").value,price=digits($("#sPrice").value),qty=Math.max(1,digits($("#sQty").value));
    if(!id){toast("Pilih menu dulu");return}
    if(!price){toast("Isi harga");return}
    addToDraft(id,price,qty);$("#sQty").value="1";
  },
  quick:t=>{const m=menuById(t.dataset.id);if(m)addToDraft(m.id,m.price,1)},
  inc:t=>{const i=draft.items[+t.dataset.i];if(!i)return;if(availFor(i.id)<=0){toast("Stok "+i.name+" sudah mentok");return}i.qty++;drawLines()},
  dec:t=>{const n=+t.dataset.i,i=draft.items[n];if(!i)return;i.qty--;if(i.qty<=0)draft.items.splice(n,1);drawLines()},
  method:t=>{draft.method=t.dataset.m;$$("#methods button").forEach(b=>b.setAttribute("aria-pressed",b===t));draft.paid="";$("#sPaid").value="";drawPay()},
  "qris-zoom":()=>openModal(`<img class="zoom" src="${db.settings.qris}" alt="Kode QRIS"><div class="row-btns" style="justify-content:flex-end"><button class="btn" type="button" data-act="close">Tutup</button></div>`,true),
  "save-sale":showConfirmSale,
  "sale-confirm":()=>{closeModal();saveSale()},
  receipt:t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(s)showReceipt(s)},
  "del-sale":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(!s)return;
    askConfirm("Hapus transaksi?",s.no+" senilai "+rp(s.total)+" akan dihapus dan stok menu dikembalikan.","Hapus",()=>{
      s.items.forEach(i=>{const m=menuById(i.id);if(m&&m.stock!=null)m.stock+=i.qty});
      db.sales=db.sales.filter(x=>x.id!==s.id);save();closeModal();SCREENS.penjualan();toast("Transaksi dihapus");},true)},
  "give-change":t=>{const s=db.sales.find(x=>x.id===t.dataset.id);if(!s)return;
    openModal(`<h3>Beri kembalian</h3><div class="sub2">${esc(s.no)} · ${esc(s.changeTo||s.customer||"-")} · sisa ${rp(oweOf(s))}</div><form id="giveForm" data-id="${s.id}" class="stack" style="gap:12px"><div class="f"><label for="gAmt">Jumlah diberikan</label><input class="in num" id="gAmt" inputmode="numeric" value="${nf.format(oweOf(s))}"></div><div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn" type="submit">Catat</button></div></form>`)},
  "ob-pay":t=>{const s=getSale(t.dataset.id);if(!s)return;
    openModal(`<h3>Bayar open bill</h3><div class="sub2">${esc(s.no)} \u00b7 ${esc(s.customer||"-")}</div>
     <div class="cf">${s.items.map(i=>`<div class="r"><span>${i.qty}\u00d7 ${esc(i.name)}</span><b>${rp(i.price*i.qty)}</b></div>`).join("")}<div class="r t"><span>Total ditagih</span><b>${rp(remainOf(s))}</b></div></div>
     <form id="obPayForm" data-id="${s.id}" class="stack" style="gap:12px">
      <div class="f"><label for="obMeth">Metode</label><select class="in" id="obMeth"><option>Tunai</option><option>Transfer</option><option>QRIS</option><option>Debit</option></select></div>
      <div class="f"><label for="obRecv">Uang diterima</label><input class="in num" id="obRecv" inputmode="numeric" placeholder="Ketik jumlah uang diterima" autocomplete="off"></div>
      <div class="cf" id="obChg"></div>
      <div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn" type="submit">Konfirmasi Pembayaran</button></div></form>`);
    updObChg()},
  "ob-add":t=>{const s=getSale(t.dataset.id);if(!s)return;
    const opts=menusOf(chOf(s)).filter(m=>!m.archived&&(m.stock==null||m.stock>0));
    if(!opts.length){toast("Tidak ada menu yang tersedia");return}
    openModal(`<h3>Tambah item</h3><div class="sub2">${esc(s.no)} \u00b7 ${esc(s.customer||"-")}</div><form id="obAddForm" data-id="${s.id}" class="stack" style="gap:12px"><div class="f"><label for="obMenu">Menu</label><select class="in" id="obMenu">${opts.map(m=>`<option value="${m.id}">${esc(m.name)} \u00b7 ${rp(m.price)}</option>`).join("")}</select></div><div class="f"><label for="obQty">Jumlah</label><input class="in num" id="obQty" inputmode="numeric" value="1"></div><div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn" type="submit">Tambahkan</button></div></form>`)},
  "ob-del":t=>{const s=getSale(t.dataset.id);if(!s)return;
    askConfirm("Batalkan open bill?",s.no+" ("+(s.customer||"-")+") senilai "+rp(remainOf(s))+" akan dihapus dan stok menu dikembalikan.","Batalkan open bill",()=>{
      s.items.forEach(i=>{const m=menuById(i.id);if(m&&m.stock!=null)m.stock+=i.qty});
      db.sales=db.sales.filter(x=>x.id!==s.id);save();closeModal();SCREENS.openbill();toast("Open bill dibatalkan");},true)},
  "menu-edit":t=>{menuEdit=t.dataset.id;renderMenu();window.scrollTo(0,0)},
  "menu-cancel":()=>{menuEdit=null;renderMenu()},
  "menu-del":t=>{const m=menuById(t.dataset.id);if(!m)return;
    const used=db.sales.some(x=>x.items.some(i=>i.id===m.id));
    askConfirm("Hapus menu permanen?",m.name+" akan dihapus dari daftar dan tidak bisa dikembalikan."+(used?" Riwayat transaksi lama tetap menyimpan nama dan harganya.":""),"Hapus permanen",()=>{
      db.menu=db.menu.filter(x=>x.id!==m.id);if(menuEdit===m.id)menuEdit=null;
      Object.keys(DR).forEach(k=>{if(DR[k])DR[k].items=DR[k].items.filter(i=>i.id!==m.id)});
      save();closeModal();drawMenuList();toast("Menu dihapus")},true)},
  "menu-stock":t=>{const m=menuById(t.dataset.id);if(!m)return;
    openModal(`<h3>Atur stok</h3><div class="sub2">${esc(m.name)} · stok sekarang ${m.stock} ${esc(m.unit)}</div><form id="stockForm" data-id="${m.id}" class="stack" style="gap:12px"><div class="f"><label for="stAdd">Tambah stok masuk</label><input class="in num" id="stAdd" inputmode="numeric" placeholder="0"></div><div class="f"><label for="stSet">Atau set stok menjadi</label><input class="in num" id="stSet" inputmode="numeric" placeholder="Kosongkan jika tidak dipakai"></div><div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn" type="submit">Simpan</button></div></form>`)},
  "menu-arch":t=>{const m=menuById(t.dataset.id);if(!m)return;m.archived=!m.archived;save();drawMenuList();toast(m.archived?"Menu diarsipkan":"Menu diaktifkan")},
  "kas-del":t=>{db.kas=db.kas.filter(k=>k.id!==t.dataset.id);save();drawKas();toast("Catatan kas dihapus")},
  "lap-show":()=>{lapFrom=$("#lFrom").value||lapFrom;lapTo=$("#lTo").value||lapTo;if(lapFrom>lapTo){const x=lapFrom;lapFrom=lapTo;lapTo=x;$("#lFrom").value=lapFrom;$("#lTo").value=lapTo}drawLap()},
  "lap-csv":()=>{ACT["lap-show"]();saveFile("laporan-"+lapFrom+"_"+lapTo+".csv",lapCSV())},
  "lap-html":()=>{ACT["lap-show"]();saveFile("laporan-"+lapFrom+"_"+lapTo+".html",lapHTML())},
  "lap-xlsx":()=>{ACT["lap-show"]();const buf=buildXlsx();if(!buf){toast("Pustaka Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.");return}
    const slug=(db.settings.store||"kasir").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"kasir";
    saveFile("laporan-"+slug+"-"+lapFrom+"_"+lapTo+".xlsx",buf)},
  "bk-full":()=>saveFile("backup-kasir-"+today()+".json",JSON.stringify(backupObj(),null,1)),
  "bk-copy":()=>{const ta=document.createElement("textarea");ta.value=JSON.stringify(backupObj());ta.style.cssText="position:fixed;opacity:0;top:0";document.body.appendChild(ta);copyEl(ta,"JSON cadangan disalin");setTimeout(()=>ta.remove(),1500)},
  "bk-part":()=>{const parts=$$("[data-part]:checked").map(c=>c.dataset.part);if(!parts.length){toast("Pilih minimal satu bagian");return}saveFile("backup-sebagian-"+today()+".json",JSON.stringify(backupObj(parts),null,1))},
  "bk-file":()=>$("#fileRestore").click(),
  "bk-paste":()=>{const v=$("#bkPaste").value.trim();if(!v){toast("Tempel isi JSON dulu");return}doRestore(v)},
  "bk-auto":t=>{const a=autoList()[+t.dataset.i];if(a)doRestore(a.json)},
  "qris-up":()=>$("#fileQris").click(),
  "bank-copy":t=>{const x=t.dataset.no;try{navigator.clipboard.writeText(x).then(()=>toast("Nomor rekening disalin"),()=>toast(x))}catch(e){toast(x)}},
  "bank-del":t=>{askConfirm("Hapus rekening?","Rekening ini tidak akan tampil lagi di pembayaran Transfer.","Hapus",()=>{db.settings.banks=(db.settings.banks||[]).filter(b=>b.id!==t.dataset.id);save();closeModal();SCREENS.pengaturan();toast("Rekening dihapus")},true)},
  "qris-clear":()=>{db.settings.qris=null;save();SCREENS.pengaturan();toast("Gambar QRIS dihapus")},
  wipe:()=>openModal(`<h3>Hapus transaksi dan arsipkan menu?</h3><p style="margin:0;color:var(--muted)">Semua transaksi dan kas dihapus, semua menu diarsipkan. Tindakan ini tidak bisa dibatalkan. Ketik HAPUS untuk melanjutkan.</p><div class="f"><label for="wipeIn">Konfirmasi</label><input class="in" id="wipeIn" autocomplete="off"></div><div class="row-btns" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="close">Batal</button><button class="btn bad" type="button" data-act="wipe-ok">Hapus</button></div>`),
  "wipe-ok":()=>{if($("#wipeIn").value.trim()!=="HAPUS"){toast("Ketik HAPUS dengan huruf besar");return}
    db.sales=[];db.kas=[];db.menu.forEach(m=>m.archived=true);db.sampled=true;save();closeModal();go(cur);toast("Data dihapus")}
};
document.addEventListener("click",e=>{
  if(e.target===$("#overlay")){closeModal();return}
  const t=e.target.closest("[data-act]");if(!t)return;const f=ACT[t.dataset.act];if(f)f(t,e);
});
document.addEventListener("submit",e=>{
  e.preventDefault();const id=e.target.id;
  if(id==="menuForm")submitMenu();
  else if(id==="kasForm"){
    const amt=digits($("#kAmt").value),cat=$("#kCat").value.trim();
    if(!amt||!cat){toast("Kategori dan jumlah wajib diisi");return}
    db.kas.push({id:uid(),date:$("#kDate").value||today(),type:$("#kType").value,cat:cat,who:$("#kWho").value.trim(),amount:amt,ref:$("#kRef").value.trim(),note:$("#kNote").value.trim()});
    save();SCREENS.kas();toast("Kas dicatat");
  }else if(id==="bankForm"){
    const bank=$("#bkBank").value.trim(),no=$("#bkNo").value.trim(),nm=$("#bkName").value.trim();
    if(!bank||!no||!nm){toast("Bank, nomor, dan nama wajib diisi");return}
    (db.settings.banks=db.settings.banks||[]).push({id:uid(),bank:bank,no:no,name:nm});save();SCREENS.pengaturan();toast("Rekening ditambahkan");
  }else if(id==="storeForm"){
    db.settings.store=$("#stName").value.trim()||"Kopi Tutug";
    const tx=parseFloat(String($("#stTax").value).replace(",","."));db.settings.tax=isFinite(tx)&&tx>=0&&tx<=100?tx:0;
    save();renderSide();toast("Pengaturan disimpan");
  }else if(id==="resellerForm"||id==="distributorForm"){
    const c=id.replace("Form",""),x=c==="reseller"?"r":"d";
    const mn=Math.max(1,digits($("#"+x+"Min").value)||1),th=Math.max(mn,digits($("#"+x+"Thr").value));
    db.settings[c]={min:mn,thresh:th};save();go(cur);toast("Aturan "+CH[c].toLowerCase()+" disimpan");
  }else if(id==="pinForm"){
    const o=$("#pOld").value,n=$("#pNew").value,n2=$("#pNew2").value;
    if(o!==db.settings.pin){toast("PIN lama salah");return}
    if(!/^\d{4,6}$/.test(n)){toast("PIN baru harus 4 sampai 6 angka");return}
    if(n!==n2){toast("Ulangi PIN baru dengan benar");return}
    db.settings.pin=n;save();SCREENS.pengaturan();toast("PIN diganti");
  }else if(id==="giveForm"){
    const s=db.sales.find(x=>x.id===e.target.dataset.id),amt=Math.min(digits($("#gAmt").value),s?oweOf(s):0);
    if(!s||!amt){toast("Isi jumlah yang diberikan");return}
    s.changeGiven.push({date:today(),amount:amt});save();closeModal();drawOwe();toast("Kembalian dicatat");
  }else if(id==="obPayForm"){
    const s=getSale(e.target.dataset.id);if(!s)return;
    const recv=digits($("#obRecv").value),rem=remainOf(s);
    if(!recv){toast("Isi jumlah uang diterima");return}
    if(recv<rem){toast("Uang diterima kurang dari total");return}
    const method=$("#obMeth").value;
    s.payments.push({date:today(),amount:rem,applied:rem,method:method,received:recv});
    s.open=false;s.method=method;s.closedDate=today();
    save();closeModal();SCREENS.openbill();toast("Open bill dibayar");showReceipt(s);
  }else if(id==="obAddForm"){
    const s=getSale(e.target.dataset.id),m=menuById($("#obMenu").value),q=Math.max(1,digits($("#obQty").value));
    if(!s||!m)return;
    if(m.stock!=null&&q>m.stock){toast("Stok "+m.name+" tersisa "+m.stock);return}
    const pr=chOf(s)!=="retail"?resPrice(m,qtyOf(s)+q):m.price;
    const ex=s.items.find(i=>i.id===m.id&&i.price===pr);
    if(ex)ex.qty+=q;else s.items.push({id:m.id,name:m.name,cost:m.cost,price:pr,qty:q});
    if(m.stock!=null)m.stock-=q;
    s.sub=s.items.reduce((a,i)=>a+i.price*i.qty,0);s.disc=s.reseller?discFor(s.sub,qtyOf(s)):0;s.tax=Math.round((s.sub-s.disc)*(db.settings.tax||0)/100);s.total=s.sub-s.disc+s.tax;
    save();closeModal();SCREENS.openbill();toast("Item ditambahkan");
  }else if(id==="stockForm"){
    const m=menuById(e.target.dataset.id),a=$("#stAdd").value.trim(),sv=$("#stSet").value.trim();if(!m)return;
    if(sv!=="")m.stock=digits(sv);else if(a!=="")m.stock=(m.stock||0)+digits(a);else{toast("Isi salah satu kolom");return}
    save();closeModal();drawMenuList();toast("Stok diperbarui");
  }
});
document.addEventListener("input",e=>{
  const t=e.target,id=t.id;
  if(["mRB","mRMin","rMin","rThr","dMin","dThr","sPrice","sPaid","mCost","mPrice","kAmt","gAmt","obRecv","obQty","stAdd","stSet","mStock","mMin"].indexOf(id)>=0&&t.tagName==="INPUT"){const c=digits(t.value);t.value=t.value.trim()===""?"":nf.format(c)}
  if(id==="sPaid"){draft.paid=t.value===""?"":String(digits(t.value));drawPay()}
  else if(id==="sCust")draft.customer=t.value;
  else if(id==="sPhone")draft.phone=t.value;
  else if(id==="sChangeTo")draft.changeTo=t.value;
  else if(id==="sNote")draft.note=t.value;
  else if(id==="obRecv")updObChg();
  else if(id==="menuQ"){menuQ=t.value;drawMenuList()}
  else if(t.dataset&&t.dataset.linePrice!==undefined){/* diterapkan saat change */}
});
document.addEventListener("change",e=>{
  const t=e.target,id=t.id;
  if(id==="sDate")draft.date=t.value||today();
  else if(id==="sMenu"){const m=menuById(t.value);if(m)$("#sPrice").value=nf.format(m.price)}
  else if(id==="ptWidth"){db.settings.printer={width:+t.value===48?48:32};save();toast("Lebar kertas disimpan")}
  else if(id==="sOwe"){draft.owe=t.checked;draft.changeTo=draft.changeTo||draft.customer;drawPay()}
  else if(id==="menuArch"){menuShowArch=t.checked;drawMenuList()}
  else if(id==="kFrom"||id==="kTo"){kasFrom=$("#kFrom").value||kasFrom;kasTo=$("#kTo").value||kasTo;drawKas()}
  else if(t.dataset&&t.dataset.linePrice!==undefined){const i=draft.items[+t.dataset.linePrice],p=digits(t.value);if(i&&p>0){i.price=p;i.manual=true}drawLines()}
});

startApp();
})();