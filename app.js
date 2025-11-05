const baseURL = "http://localhost:5000";

function switchBox(id) {
  document.querySelectorAll(".box").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// USER AUTH
async function registerUser() {
  const name = regName.value, mobile = regMobile.value, room = regRoom.value, password = regPass.value;
  const res = await fetch(`${baseURL}/register`, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, mobile, room, password })
  });
  alert((await res.json()).message);
}

async function loginUser() {
  const mobile = loginMobile.value, password = loginPass.value;
  const res = await fetch(`${baseURL}/login`, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ mobile, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data.user));
    location.href = "home.html";
  } else alert(data.message);
}

function logout() {
  localStorage.removeItem("user");
  location.href = "index.html";
}

// ADMIN LOGIN
async function adminLogin() {
  const id = adminId.value, password = adminPass.value;
  const res = await fetch(`${baseURL}/admin`, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ id, password })
  });
  if (res.ok) {
    switchBox("adminPanel");
    loadProducts();
    loadOrders();
  } else alert((await res.json()).message);
}

// PRODUCTS
async function loadProducts() {
  const res = await fetch(`${baseURL}/products`);
  const products = await res.json();
  const list = document.getElementById("productList") || document.getElementById("products");
  if (!list) return;
  list.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product";
    card.innerHTML = `
      <img src="${p.image}" alt="">
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      ${location.pathname.includes("admin") ?
        `<button onclick="editProduct(${p.id})">Edit</button>` :
        `<button onclick="order(${p.id})">Order</button>`}
    `;
    list.appendChild(card);
  });
}

async function addProduct() {
  const name = prodName.value, price = prodPrice.value, image = prodImg.value;
  await fetch(`${baseURL}/products`, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, price, image })
  });
  alert("Product added!");
  loadProducts();
}

async function order(id) {
  const user = JSON.parse(localStorage.getItem("user"));
  await fetch(`${baseURL}/order`, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ user, productId: id })
  });
  alert("Order placed!");
  loadOrders();
}

// ORDERS
async function loadOrders() {
  const res = await fetch(`${baseURL}/orders`);
  const orders = await res.json();
  const box = document.getElementById("orders") || document.getElementById("adminOrders");
  if (!box) return;
  box.innerHTML = "";
  orders.forEach(o => {
    const div = document.createElement("div");
    div.innerHTML = `
      <b>${o.product.name}</b> - ₹${o.product.price} <br>
      User: ${o.user.name} (Room ${o.user.room}) <br>
      Status: ${o.status} | ${o.time}
      ${location.pathname.includes("admin") ? 
        `<button onclick="updateOrder(${o.id})">Mark Delivered</button>` : ""}
      <hr>`;
    box.appendChild(div);
  });
}

async function updateOrder(id) {
  await fetch(`${baseURL}/orders/${id}`, {
    method: "PUT", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ status: "Delivered" })
  });
  loadOrders();
}

// INIT
if (location.pathname.includes("home")) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) location.href = "index.html";
  userName.textContent = user.name;
  loadProducts();
  loadOrders();
}


