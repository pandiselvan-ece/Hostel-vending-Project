/* app.js - static no-backend version
   - Uses localStorage for persistence
   - Images saved as Base64 strings
   - Admin login is client-side (change credentials below)
   - OTP is simulated (no SMS). See comments where to plug SMS provider.
*/

/* ---------- CONFIG ---------- */
// Change admin credentials before deploy:
const ADMIN_ID = "PANDI";        // change this
const ADMIN_PASS = "password123"; // change this

// localStorage keys
const LS_ITEMS = "vendingItems_v1";
const LS_ORDERS = "vendingOrders_v1";

/* ---------- Utility & slots ---------- */
const rows = ["A","B","C","D","E","F","G"];
const cols = [1,2,3,4,5,6];
const slots = [];
rows.forEach(r => cols.forEach(c => slots.push(`${r}${c}`)));

function defaultItems() {
  const defaults = {};
  slots.forEach(s => {
    defaults[s] = {
      slot: s,
      name: "Empty Slot",
      price: "",
      img: "data:image/svg+xml;base64," + btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='#ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='#999'>Empty</text></svg>`)
    };
  });
  // Add small sample for A1..A3
  defaults["A1"].name = "Lays (Small)";
  defaults["A1"].price = "20";
  defaults["A2"].name = "Coke (300ml)";
  defaults["A2"].price = "35";
  defaults["A3"].name = "Biscuits";
  defaults["A3"].price = "15";
  return defaults;
}

function loadItems() {
  const raw = localStorage.getItem(LS_ITEMS);
  if (!raw) {
    const d = defaultItems();
    localStorage.setItem(LS_ITEMS, JSON.stringify(d));
    return d;
  }
  try { return JSON.parse(raw); }
  catch(e){ const d = defaultItems(); localStorage.setItem(LS_ITEMS, JSON.stringify(d)); return d; }
}
function saveItems(items) { localStorage.setItem(LS_ITEMS, JSON.stringify(items)); }

function loadOrders() {
  const raw = localStorage.getItem(LS_ORDERS);
  if (!raw) { localStorage.setItem(LS_ORDERS, JSON.stringify([])); return []; }
  try { return JSON.parse(raw); } catch(e){ localStorage.setItem(LS_ORDERS, JSON.stringify([])); return []; }
}
function saveOrders(orders) { localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

/* ---------- CUSTOMER VIEW ---------- */
function initCustomerView(){
  renderCustomerGrid();
  setupOrderModalHandlers();
}

function renderCustomerGrid(){
  const grid = document.getElementById('vending-grid');
  if(!grid) return;
  const items = loadItems();
  grid.innerHTML = '';
  slots.forEach(slot => {
    const data = items[slot];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${slot}</h4>
      <img src="${data.img}" alt="${escapeHtml(data.name)}">
      <p style="font-weight:700">${escapeHtml(data.name)}</p>
      <p class="price">${data.price ? '₹'+escapeHtml(data.price) : '-'}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="btn" data-slot="${slot}">Buy</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('button[data-slot]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const slot = btn.getAttribute('data-slot');
      openOrderModal(slot);
    });
  });
}

/* Order modal */
let currentSlot = null;
function setupOrderModalHandlers(){
  document.getElementById('closeOrder').addEventListener('click', hideOrderModal);
  document.getElementById('cancel-order').addEventListener('click', hideOrderModal);
  document.getElementById('send-otp').addEventListener('click', sendOtpHandler);
  document.getElementById('confirm-order').addEventListener('click', confirmOrderHandler);
}
function openOrderModal(slot){
  currentSlot = slot;
  const items = loadItems();
  const data = items[slot];
  document.getElementById('order-img').src = data.img;
  document.getElementById('order-name').textContent = data.name;
  document.getElementById('order-slot').textContent = slot;
  document.getElementById('order-price').textContent = data.price ? '₹'+data.price : '-';
  document.getElementById('customer-name').value = '';
  document.getElementById('room-number').value = '';
  document.getElementById('contact').value = '';
  document.getElementById('otp-input').value = '';
  document.getElementById('order-msg').textContent = '';
  document.getElementById('order-modal').classList.remove('hidden');
}
function hideOrderModal(){ document.getElementById('order-modal').classList.add('hidden'); currentSlot=null; }

/* OTP (client-side simulated) */
function generateOtp(){ return Math.floor(1000 + Math.random() * 9000).toString(); }

function sendOtpHandler(){
  const phone = document.getElementById('contact').value.trim();
  if(!/^\d{10}$/.test(phone)) {
    document.getElementById('order-msg').textContent = 'Enter a valid 10-digit phone number';
    return;
  }
  const otp = generateOtp();
  // Store OTP temporarily in sessionStorage for this demo (or include with pending order)
  sessionStorage.setItem('latestSentOtp', otp);
  sessionStorage.setItem('latestOtpPhone', phone);
  // NOTE: In a real app you'd call Twilio or any SMS API from a server.
  // For this static demo we display the OTP to the user (so they can verify).
  document.getElementById('order-msg').textContent = 'OTP sent (demo): ' + otp + ' — for real SMS integrate an SMS service.';
  // Optional: Also show a small alert (so delivery person/testers can see)
  alert('Demo OTP: ' + otp + '\n(Integrate an SMS API for real SMS deliveries.)');
}

/* Confirm order (verifies OTP) */
function confirmOrderHandler(){
  const name = document.getElementById('customer-name').value.trim();
  const room = document.getElementById('room-number').value.trim();
  const phone = document.getElementById('contact').value.trim();
  const otpInput = document.getElementById('otp-input').value.trim();
  if(!name || !room || !phone) {
    document.getElementById('order-msg').textContent = 'Please fill name, room and phone';
    return;
  }
  const expectedOtp = sessionStorage.getItem('latestSentOtp');
  const expectedPhone = sessionStorage.getItem('latestOtpPhone');
  if(!expectedOtp || phone !== expectedPhone) {
    document.getElementById('order-msg').textContent = 'OTP not sent for this number. Click Send OTP first.';
    return;
  }
  if(otpInput !== expectedOtp) {
    document.getElementById('order-msg').textContent = 'Incorrect OTP';
    return;
  }

  // create order
  const items = loadItems();
  const slotData = items[currentSlot];
  const orders = loadOrders();
  const order = {
    id: 'ord_' + Date.now(),
    slot: currentSlot,
    itemName: slotData.name,
    price: slotData.price || '',
    customerName: name,
    room: room,
    phone: phone,
    status: 'pending', // pending -> picked -> delivered -> cancelled
    createdAt: new Date().toISOString(),
    otp: expectedOtp // included for demo (so admin/delivery can view). Remove in real system.
  };
  orders.unshift(order);
  saveOrders(orders);

  // clear otp
  sessionStorage.removeItem('latestSentOtp');
  sessionStorage.removeItem('latestOtpPhone');

  document.getElementById('order-msg').textContent = 'Order placed! Your OTP verified.';
  setTimeout(()=>{ hideOrderModal(); }, 900);
  // optionally notify user to wait or show their order details
}

/* ---------- ADMIN VIEW ---------- */
function initAdminView(){
  // UI: login & logout
  const loginBtn = document.getElementById('admin-login');
  const logoutBtn = document.getElementById('admin-logout');
  const loginForm = document.getElementById('login-form');
  const adminActions = document.getElementById('admin-actions');

  // check session
  const isAdmin = sessionStorage.getItem('isAdmin') === '1';
  if(isAdmin){ loginForm.classList.add('hidden'); adminActions.classList.remove('hidden'); }
  else { loginForm.classList.remove('hidden'); adminActions.classList.add('hidden'); }

  loginBtn.addEventListener('click', ()=>{
    const id = document.getElementById('admin-id').value.trim();
    const pass = document.getElementById('admin-pass').value;
    if(id === ADMIN_ID && pass === ADMIN_PASS){
      sessionStorage.setItem('isAdmin', '1');
      loginForm.classList.add('hidden');
      adminActions.classList.remove('hidden');
      renderAdminGrid();
      renderOrdersList();
    } else {
      alert('Invalid admin credentials');
    }
  });

  logoutBtn.addEventListener('click', ()=>{
    sessionStorage.removeItem('isAdmin');
    loginForm.classList.remove('hidden');
    adminActions.classList.add('hidden');
  });

  // Export / Import / Reset
  document.getElementById('export-data').addEventListener('click', () => {
    const items = loadItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vending-items.json'; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('import-file').addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try {
        const imported = JSON.parse(ev.target.result);
        // simple validation
        const hasAll = slots.every(s => imported[s]);
        if(!hasAll) { alert('Invalid file: missing slots'); return; }
        saveItems(imported);
        alert('Imported items');
        renderAdminGrid();
      } catch(err){ alert('Import failed: ' + err.message); }
    };
    reader.readAsText(f);
  });
  document.getElementById('reset-defaults').addEventListener('click', ()=>{
    if(!confirm('Reset all slots to defaults?')) return;
    const def = defaultItems();
    saveItems(def);
    renderAdminGrid();
    alert('Reset done');
  });

  // initial render if admin
  if(sessionStorage.getItem('isAdmin') === '1') {
    renderAdminGrid();
    renderOrdersList();
  } else {
    document.getElementById('admin-grid').innerHTML = '<div class="muted">Sign in to manage slots</div>';
    document.getElementById('orders-list').innerHTML = '<div class="muted">Sign in to view orders</div>';
  }
}

/* Admin grid for editing slots */
function renderAdminGrid(){
  const container = document.getElementById('admin-grid');
  if(!container) return;
  const items = loadItems();
  container.innerHTML = '';
  slots.forEach(slot => {
    const d = items[slot];
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      <h4>${slot}</h4>
      <input class="name" data-slot="${slot}" value="${escapeHtml(d.name)}" placeholder="Item name" />
      <input class="price" data-slot="${slot}" value="${escapeHtml(d.price)}" placeholder="Price" />
      <div>
        <img src="${d.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-top:8px" />
        <div class="small-file">
          <input type="file" accept="image/*" data-slot="${slot}" class="imgfile" />
          <button data-slot="${slot}" class="btn upload-btn">Upload & Save</button>
          <button data-slot="${slot}" class="btn delete-btn" style="margin-left:8px;background:var(--danger);color:white">Clear</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // attach events for each upload & save
  container.querySelectorAll('.upload-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slot = btn.getAttribute('data-slot');
      const fileInput = container.querySelector(`input.imgfile[data-slot="${slot}"]`);
      const nameInput = container.querySelector(`input.name[data-slot="${slot}"]`);
      const priceInput = container.querySelector(`input.price[data-slot="${slot}"]`);
      const file = fileInput.files[0];

      // get items
      const items = loadItems();

      if(file) {
        // read file as base64
        const dataUrl = await readFileAsDataURL(file);
        items[slot].img = dataUrl;
      }
      items[slot].name = nameInput.value.trim() || 'Empty Slot';
      items[slot].price = priceInput.value.trim();

      saveItems(items);
      alert('Updated ' + slot);
      renderAdminGrid();
    });
  });

  // delete/clear button
  container.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slot = btn.getAttribute('data-slot');
      if(!confirm('Clear content from ' + slot + ' ?')) return;
      const items = loadItems();
      items[slot] = {
        slot: slot,
        name: 'Empty Slot',
        price: '',
        img: defaultItems()[slot].img
      };
      saveItems(items);
      renderAdminGrid();
    });
  });
}

/* read file to dataURL */
function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('File read error'));
    fr.readAsDataURL(file);
  });
}

/* Orders admin list */
function renderOrdersList(){
  const list = document.getElementById('orders-list');
  if(!list) return;
  const orders = loadOrders();
  if(orders.length === 0){ list.innerHTML = '<div class="muted">No orders yet</div>'; return; }
  list.innerHTML = '';
  orders.forEach(o => {
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="width:64px;height:64px;flex-shrink:0">
          <img src="${(loadItems()[o.slot]||{}).img || ''}" style="width:64px;height:64px;object-fit:cover;border-radius:8px" />
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(o.itemName)} <span class="muted">(${o.slot})</span></strong>
            <span class="muted">${o.price ? '₹'+escapeHtml(o.price) : ''}</span>
          </div>
          <div class="meta">${escapeHtml(o.customerName)} • Room ${escapeHtml(o.room)} • ${escapeHtml(o.phone)}</div>
          <div class="meta small">Status: <strong>${escapeHtml(o.status)}</strong> • ${escapeHtml(new Date(o.createdAt).toLocaleString())}</div>
          <div class="order-actions" style="margin-top:8px">
            ${o.status === 'pending' ? `<button class="btn" data-act="pick" data-id="${o.id}">Mark Picked</button>` : ''}
            ${o.status !== 'delivered' ? `<button class="btn" data-act="deliver" data-id="${o.id}">Mark Delivered</button>` : ''}
            <button class="btn" data-act="cancel" data-id="${o.id}">Cancel</button>
            <button class="btn" data-act="showotp" data-id="${o.id}">Show OTP</button>
          </div>
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  // attach handlers
  list.querySelectorAll('button[data-act]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const act = b.getAttribute('data-act');
      const id = b.getAttribute('data-id');
      handleOrderAction(act, id);
    });
  });
}

function handleOrderAction(act, id){
  const orders = loadOrders();
  const idx = orders.findIndex(x=>x.id===id);
  if(idx === -1) return alert('Order not found');
  if(act === 'pick'){ orders[idx].status = 'picked'; saveOrders(orders); renderOrdersList(); }
  else if(act === 'deliver'){ orders[idx].status = 'delivered'; saveOrders(orders); renderOrdersList(); }
  else if(act === 'cancel'){ orders[idx].status = 'cancelled'; saveOrders(orders); renderOrdersList(); }
  else if(act === 'showotp'){ alert('Demo OTP for order: ' + orders[idx].otp + '\n(OTP is stored client-side only for demo)'); }
}

/* ---------- Helpers ---------- */
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
