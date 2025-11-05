/* app.js - static client-side MVP
   - Users can register & login (stored in localStorage)
   - Admin can login with ADMIN_ID/ADMIN_PASS (change before deploy)
   - Items and orders stored in localStorage
   - Images stored as Base64 dataURLs in the items object
   - No OTP/SMS: order asks for phone number for delivery call verification
*/

/* ------------- CONFIG ------------- */
/* CHANGE these admin credentials before deploying */
const ADMIN_ID = "PANDI";
const ADMIN_PASS = "1234"; // change

/* localStorage keys */
const LS_USERS = "hv_users_v1";      // object: { username: { username, password, room, phone } }
const LS_ITEMS = "hv_items_v1";      // object: { slot: { slot,name,price,img } }
const LS_ORDERS = "hv_orders_v1";    // array: [ order, ... ]

/* ------------- SLOTS ------------- */
const rows = ["A","B","C","D","E","F","G"];
const cols = [1,2,3,4,5,6];
const slots = []; rows.forEach(r=> cols.forEach(c=> slots.push(`${r}${c}`)));

/* ---------- Defaults ---------- */
function defaultItems(){
  const d = {};
  slots.forEach(s => {
    d[s] = {
      slot: s,
      name: "Empty Slot",
      price: "",
      img: defaultImageData(s)
    };
  });
  // sample few items
  d["A1"].name = "Lays (Small)"; d["A1"].price = "20";
  d["A2"].name = "Coke (300ml)"; d["A2"].price = "35";
  d["A3"].name = "Biscuits"; d["A3"].price = "15";
  return d;
}
function defaultImageData(text){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#9ca3af'>${text}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/* ---------- Storage helpers ---------- */
function loadJSON(key, fallback){
  const raw = localStorage.getItem(key);
  if(!raw) { localStorage.setItem(key, JSON.stringify(fallback)); return fallback; }
  try { return JSON.parse(raw); } catch(e){ localStorage.setItem(key, JSON.stringify(fallback)); return fallback; }
}
function saveJSON(key, data){ localStorage.setItem(key, JSON.stringify(data)); }

function loadUsers(){ return loadJSON(LS_USERS, {}); }
function saveUsers(u){ saveJSON(LS_USERS, u); }
function loadItems(){ return loadJSON(LS_ITEMS, defaultItems()); }
function saveItems(it){ saveJSON(LS_ITEMS, it); }
function loadOrders(){ return loadJSON(LS_ORDERS, []); }
function saveOrders(o){ saveJSON(LS_ORDERS, o); }

/* ---------- AUTH FLOW (User) ---------- */
function initAuthUI(){
  // tabs
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  tabLogin.addEventListener('click', ()=>{ tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginForm.classList.remove('hidden'); regForm.classList.add('hidden'); });
  tabRegister.addEventListener('click', ()=>{ tabRegister.classList.add('active'); tabLogin.classList.remove('active'); regForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });

  // login
  document.getElementById('login-btn').addEventListener('click', ()=>{
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const msg = document.getElementById('login-msg');
    msg.textContent = '';
    if(!user || !pass){ msg.textContent = 'Enter username and password'; return; }
    const users = loadUsers();
    if(!users[user] || users[user].password !== pass){ msg.textContent = 'Invalid username or password'; return; }
    // success
    sessionStorage.setItem('hv_user', user);
    showUserDashboard();
  });

  // register
  document.getElementById('register-btn').addEventListener('click', ()=>{
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    const room = document.getElementById('reg-room').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const msg = document.getElementById('reg-msg');
    msg.textContent = '';
    if(!user || !pass || !room || !/^\d{10}$/.test(phone)){ msg.textContent = 'Fill all fields. Phone should be 10 digits.'; return; }
    if(pass.length < 4){ msg.textContent = 'Password must be at least 4 characters.'; return; }
    const users = loadUsers();
    if(users[user]){ msg.textContent = 'Username already exists'; return; }
    users[user] = { username: user, password: pass, room, phone };
    saveUsers(users);
    sessionStorage.setItem('hv_user', user);
    showUserDashboard();
  });

  // check session
  const current = sessionStorage.getItem('hv_user');
  if(current){ showUserDashboard(); } else { showAuthPage(); }
}

/* show auth page */
function showAuthPage(){
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('user-dashboard').classList.add('hidden');
  document.getElementById('user-area').classList.add('hidden');
}

/* show user dashboard after login */
function showUserDashboard(){
  const username = sessionStorage.getItem('hv_user');
  if(!username) return showAuthPage();
  const users = loadUsers();
  const user = users[username];
  if(!user) return showAuthPage();
  // set header user area
  document.getElementById('welcome-user').textContent = `Hi, ${username}`;
  document.getElementById('user-area').classList.remove('hidden');
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('user-dashboard').classList.remove('hidden');
  document.getElementById('user-display-name').textContent = username;
  // attach logout
  document.getElementById('logout-user').addEventListener('click', ()=>{
    sessionStorage.removeItem('hv_user');
    showAuthPage();
  });
  // render grid & user orders
  renderCustomerGrid();
  renderUserOrders();
}

/* ---------- CUSTOMER / ORDER UI ---------- */
function renderCustomerGrid(){
  const grid = document.getElementById('vending-grid');
  if(!grid) return;
  const items = loadItems();
  grid.innerHTML = '';
  slots.forEach(slot => {
    const it = items[slot];
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `
      <h4>${slot}</h4>
      <img src="${it.img}" alt="${escape(it.name)}" />
      <h4 style="font-size:15px">${escape(it.name)}</h4>
      <p class="price">${it.price ? '₹'+escape(it.price) : '-'}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="btn" data-slot="${slot}">Buy</button>
      </div>
    `;
    grid.appendChild(el);
  });
  grid.querySelectorAll('button[data-slot]').forEach(b=>{
    b.addEventListener('click', ()=> openOrderModal(b.getAttribute('data-slot')));
  });
}

/* order modal handlers */
function openOrderModal(slot){
  const items = loadItems();
  const it = items[slot];
  document.getElementById('order-img').src = it.img;
  document.getElementById('order-name').textContent = it.name;
  document.getElementById('order-slot').textContent = slot;
  document.getElementById('order-price').textContent = it.price ? '₹'+it.price : '-';
  const username = sessionStorage.getItem('hv_user');
  const users = loadUsers();
  const user = users[username];
  document.getElementById('order-room').value = user ? user.room : '';
  document.getElementById('order-phone').value = user ? user.phone : '';
  document.getElementById('order-msg').textContent = '';
  document.getElementById('order-modal').classList.remove('hidden');
  // handlers
  document.getElementById('closeOrder').onclick = hideOrderModal;
  document.getElementById('cancel-order-btn').onclick = hideOrderModal;
  document.getElementById('place-order-btn').onclick = ()=> placeOrder(slot);
}
function hideOrderModal(){ document.getElementById('order-modal').classList.add('hidden'); }

/* place order (no OTP) */
function placeOrder(slot){
  const room = document.getElementById('order-room').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const username = sessionStorage.getItem('hv_user');
  if(!username){ document.getElementById('order-msg').textContent = 'You must be logged in'; return; }
  if(!room || !/^\d{1,4}[A-Za-z]?$/.test(room) ){ document.getElementById('order-msg').textContent = 'Enter a valid room (e.g. 402A)'; return; }
  if(!/^\d{10}$/.test(phone)){ document.getElementById('order-msg').textContent = 'Enter a 10 digit phone number'; return; }
  const items = loadItems();
  const it = items[slot];
  const orders = loadOrders();
  const order = {
    id: 'ord_' + Date.now(),
    username,
    slot,
    itemName: it.name,
    price: it.price || '',
    room,
    phone,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  saveOrders(orders);
  document.getElementById('order-msg').textContent = 'Order placed. Delivery person will call to verify before delivery.';
  setTimeout(()=> hideOrderModal(), 900);
  renderUserOrders(); // update
}

/* render user orders */
function renderUserOrders(){
  const list = document.getElementById('my-orders');
  if(!list) return;
  const username = sessionStorage.getItem('hv_user');
  const orders = loadOrders().filter(o => o.username === username);
  if(orders.length === 0){ list.innerHTML = '<div class="muted">You have no orders yet</div>'; return; }
  list.innerHTML = '';
  orders.forEach(o=>{
    const d = document.createElement('div'); d.className = 'order-item';
    d.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="width:64px;height:64px;flex-shrink:0">
          <img src="${(loadItems()[o.slot]||{}).img || defaultImageData(o.slot)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px" />
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escape(o.itemName)} <span class="muted">(${o.slot})</span></strong>
            <span class="muted">${o.price ? '₹'+escape(o.price) : ''}</span>
          </div>
          <div class="muted small">${escape(o.room)} • ${escape(o.phone)}</div>
          <div class="muted small">Status: <strong>${escape(o.status)}</strong></div>
          <div class="muted small">${new Date(o.createdAt).toLocaleString()}</div>
        </div>
      </div>
    `;
    list.appendChild(d);
  });
}

/* ---------- ADMIN UI ---------- */
function initAdminUI(){
  const loginCard = document.getElementById('admin-login-card');
  const panel = document.getElementById('admin-panel');
  const adminLoginBtn = document.getElementById('admin-login');
  const adminLogoutBtn = document.getElementById('admin-logout');
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');
  const resetBtn = document.getElementById('reset-btn');

  // check session
  if(sessionStorage.getItem('hv_admin') === '1'){ loginCard.classList.add('hidden'); panel.classList.remove('hidden'); renderAdminGrid(); renderOrdersAdmin(); } else { loginCard.classList.remove('hidden'); panel.classList.add('hidden'); }

  adminLoginBtn.addEventListener('click', ()=>{
    const id = document.getElementById('admin-id').value.trim();
    const pass = document.getElementById('admin-pass').value;
    const msg = document.getElementById('admin-msg');
    msg.textContent = '';
    if(id === ADMIN_ID && pass === ADMIN_PASS){
      sessionStorage.setItem('hv_admin','1');
      loginCard.classList.add('hidden'); panel.classList.remove('hidden');
      renderAdminGrid(); renderOrdersAdmin();
    } else { msg.textContent = 'Invalid admin credentials'; }
  });

  adminLogoutBtn.addEventListener('click', ()=>{
    sessionStorage.removeItem('hv_admin'); loginCard.classList.remove('hidden'); panel.classList.add('hidden');
  });

  exportBtn.addEventListener('click', ()=>{
    const items = loadItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'items.json'; a.click(); URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const fr = new FileReader();
    fr.onload = ()=> {
      try {
        const imported = JSON.parse(fr.result);
        // validate
        const ok = slots.every(s => imported[s] && imported[s].name !== undefined);
        if(!ok) return alert('Invalid items file');
        saveItems(imported); alert('Items imported'); renderAdminGrid();
      } catch(err){ alert('Import failed: '+err.message); }
    };
    fr.readAsText(f);
  });

  resetBtn.addEventListener('click', ()=>{
    if(!confirm('Reset all slots to defaults?')) return;
    saveItems(defaultItems()); renderAdminGrid();
  });
}

/* admin grid render */
function renderAdminGrid(){
  const container = document.getElementById('admin-grid');
  if(!container) return;
  const items = loadItems();
  container.innerHTML = '';
  slots.forEach(slot => {
    const it = items[slot];
    const card = document.createElement('div'); card.className = 'admin-card';
    card.innerHTML = `
      <h4>${slot}</h4>
      <input class="name" data-slot="${slot}" placeholder="Item name" value="${escape(it.name)}" />
      <input class="price" data-slot="${slot}" placeholder="Price" value="${escape(it.price)}" />
      <img src="${it.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-top:8px" />
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <input type="file" accept="image/*" data-slot="${slot}" class="imgfile" />
        <button class="btn save-btn" data-slot="${slot}">Save</button>
        <button class="btn" data-slot="${slot}" style="background:var(--danger);color:white" id="clear-${slot}">Clear</button>
      </div>
    `;
    container.appendChild(card);
  });

  // attach handlers
  container.querySelectorAll('.save-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const slot = btn.getAttribute('data-slot');
      const nameInput = container.querySelector(`input.name[data-slot="${slot}"]`);
      const priceInput = container.querySelector(`input.price[data-slot="${slot}"]`);
      const fileInput = container.querySelector(`input.imgfile[data-slot="${slot}"]`);
      const items = loadItems();
      // update fields
      items[slot].name = nameInput.value.trim() || 'Empty Slot';
      items[slot].price = priceInput.value.trim();
      if(fileInput && fileInput.files && fileInput.files[0]){
        try {
          const dataUrl = await readFileAsDataURL(fileInput.files[0]);
          items[slot].img = dataUrl;
        } catch(err){ alert('Image read error'); return; }
      }
      saveItems(items);
      alert('Saved ' + slot);
      renderAdminGrid();
    });
  });

  container.querySelectorAll('[id^="clear-"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slot = btn.id.replace('clear-','');
      if(!confirm('Clear slot ' + slot + ' ?')) return;
      const items = loadItems();
      items[slot] = { slot, name: 'Empty Slot', price: '', img: defaultImageData(slot) };
      saveItems(items); renderAdminGrid();
    });
  });
}

/* orders admin */
function renderOrdersAdmin(){
  const list = document.getElementById('orders-list');
  if(!list) return;
  const orders = loadOrders();
  if(orders.length === 0){ list.innerHTML = '<div class="muted">No orders yet</div>'; return; }
  list.innerHTML = '';
  orders.forEach(o=>{
    const el = document.createElement('div'); el.className = 'order-item';
    el.innerHTML = `
      <img src="${(loadItems()[o.slot]||{}).img || defaultImageData(o.slot)}" />
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between">
          <strong>${escape(o.itemName)} <span class="muted">(${o.slot})</span></strong>
          <span class="muted">${o.price ? '₹'+escape(o.price) : ''}</span>
        </div>
        <div class="muted small">${escape(o.username)} • ${escape(o.room)} • ${escape(o.phone)}</div>
        <div class="muted small">Status: <strong>${escape(o.status)}</strong> • ${new Date(o.createdAt).toLocaleString()}</div>
        <div style="margin-top:8px;display:flex;gap:8px">
          ${o.status === 'pending' ? `<button class="btn" data-act="pick" data-id="${o.id}">Mark Picked</button>` : ''}
          ${o.status !== 'delivered' ? `<button class="btn" data-act="deliver" data-id="${o.id}">Mark Delivered</button>` : ''}
          <button class="btn" data-act="cancel" data-id="${o.id}" style="background:var(--danger);color:white">Cancel</button>
          <button class="btn" data-act="call" data-id="${o.id}">Call</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });

  // attach actions
  list.querySelectorAll('button[data-act]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const act = b.getAttribute('data-act'); const id = b.getAttribute('data-id');
      handleOrderAdminAction(act, id);
    });
  });
}

function handleOrderAdminAction(act, id){
  const orders = loadOrders();
  const idx = orders.findIndex(x=>x.id===id);
  if(idx === -1) return alert('Order not found');
  if(act === 'pick'){ orders[idx].status = 'picked'; saveOrders(orders); renderOrdersAdmin(); }
  else if(act === 'deliver'){ orders[idx].status = 'delivered'; saveOrders(orders); renderOrdersAdmin(); }
  else if(act === 'cancel'){ orders[idx].status = 'cancelled'; saveOrders(orders); renderOrdersAdmin(); }
  else if(act === 'call'){
    // simulate call: open tel: link with phone number
    const phone = orders[idx].phone;
    if(!/^\d{10}$/.test(phone)) return alert('Invalid phone number stored');
    window.open('tel:' + phone);
  }
}

/* ---------- Utilities ---------- */
function escape(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload = ()=> res(fr.result); fr.onerror = ()=> rej(new Error('File read error')); fr.readAsDataURL(file); }); }

/* ---------- Initialize if needed ---------- */
// ensure default data exists
(function ensureDefaults(){
  const it = localStorage.getItem(LS_ITEMS);
  if(!it) saveItems(defaultItems());
  const u = localStorage.getItem(LS_USERS);
  if(!u) saveUsers({}); // empty users map
  const o = localStorage.getItem(LS_ORDERS);
  if(!o) saveOrders([]);
})();

/* Expose functions used by HTML */
window.initAuthUI = initAuthUI;
window.initAdminUI = initAdminUI;
