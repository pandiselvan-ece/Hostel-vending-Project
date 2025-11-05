// ---------- USER AUTH ----------
function registerUser() {
  const name = regName.value.trim();
  const pass = regPass.value.trim();
  if (!name || !pass) return alert("Fill all fields");

  const users = JSON.parse(localStorage.getItem("users") || "[]");
  if (users.find(u => u.name === name)) return alert("Username exists!");
  users.push({ name, pass, orders: [] });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Registered! Now login.");
  regName.value = regPass.value = "";
}

function loginUser() {
  const name = loginName.value.trim();
  const pass = loginPass.value.trim();
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const user = users.find(u => u.name === name && u.pass === pass);
  if (!user) return alert("Invalid login");
  localStorage.setItem("activeUser", name);
  window.location.href = "home.html";
}

function logoutUser() {
  localStorage.removeItem("activeUser");
  window.location.href = "index.html";
}

// ---------- PAGE LOAD ----------
window.onload = () => {
  const path = location.pathname.split("/").pop();
  if (path === "home.html") loadUserHome();
  if (path === "admin.html") loadAdminProducts();
};

function loadUserHome() {
  const user = localStorage.getItem("activeUser");
  if (!user) return (location.href = "index.html");
  document.getElementById("userName").textContent = user;
  displayProducts();
  displayOrders();
}

// ---------- PRODUCTS ----------
function displayProducts() {
  const container = document.getElementById("productContainer");
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  container.innerHTML = "";
  products.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      <button onclick="openOrder(${i})">Order</button>
    `;
    container.appendChild(card);
  });
}

let selectedIndex = null;
function openOrder(i) {
  selectedIndex = i;
  const p = JSON.parse(localStorage.getItem("products"))[i];
  document.getElementById("popupProduct").textContent = `${p.name} - ₹${p.price}`;
  document.getElementById("orderPopup").style.display = "flex";
}

function closePopup() {
  document.getElementById("orderPopup").style.display = "none";
}

function confirmOrder() {
  const room = roomNumber.value.trim();
  const phone = phoneNumber.value.trim();
  if (!room || !phone) return alert("Enter room & phone");

  const user = localStorage.getItem("activeUser");
  const products = JSON.parse(localStorage.getItem("products"));
  const p = products[selectedIndex];
  const users = JSON.parse(localStorage.getItem("users"));

  const index = users.findIndex(u => u.name === user);
  users[index].orders.push({ product: p.name, price: p.price, room, phone, status: "Pending" });
  localStorage.setItem("users", JSON.stringify(users));
  closePopup();
  displayOrders();
  alert("Order placed! The delivery person will call to confirm.");
}

function displayOrders() {
  const user = localStorage.getItem("activeUser");
  const users = JSON.parse(localStorage.getItem("users"));
  const u = users.find(x => x.name === user);
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = u.orders.map(o => `
    <div class="product-card">
      <h4>${o.product}</h4>
      <p>Room: ${o.room} | Phone: ${o.phone}</p>
      <p>Status: <b>${o.status}</b></p>
    </div>`).join("");
}

// ---------- ADMIN ----------
function adminLogin() {
  const id = adminId.value.trim();
  const pass = adminPass.value.trim();
  if (id === "admin" && pass === "1234") {
    document.getElementById("adminLoginBox").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadAdminProducts();
  } else {
    adminMsg.textContent = "Invalid credentials!";
  }
}

function addProduct() {
  const name = pName.value.trim();
  const price = pPrice.value.trim();
  const imgFile = pImage.files[0];
  if (!name || !price || !imgFile) return alert("Fill all fields!");

  const reader = new FileReader();
  reader.onload = e => {
    const products = JSON.parse(localStorage.getItem("products") || "[]");
    products.push({ name, price, img: e.target.result });
    localStorage.setItem("products", JSON.stringify(products));
    pName.value = pPrice.value = "";
    pImage.value = "";
    loadAdminProducts();
  };
  reader.readAsDataURL(imgFile);
}

function loadAdminProducts() {
  const cont = document.getElementById("adminProducts");
  if (!cont) return;
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  cont.innerHTML = "";
  products.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>₹${p.price}</p>
      <button onclick="deleteProduct(${i})">Delete</button>
    `;
    cont.appendChild(div);
  });
}

function deleteProduct(i) {
  const products = JSON.parse(localStorage.getItem("products"));
  products.splice(i, 1);
  localStorage.setItem("products", JSON.stringify(products));
  loadAdminProducts();
}
