import { logout, onAuthChange } from './auth.js';
import { listShops, listOffers } from './db.js';
import { logAction } from './logger.js';

document.addEventListener("DOMContentLoaded", () => {

  // ----- DOM Elements -----
  const btnLogout = document.getElementById("btnLogout");
  const shopsListDiv = document.getElementById("shopsList");
  const offersListDiv = document.getElementById("offersList");
  const categoryFilter = document.getElementById("categoryFilter");
  const floorFilter = document.getElementById("floorFilter");
  const applyFilterBtn = document.getElementById("applyFilter");

  const compareCategory = document.getElementById("compareCategory");
  const compareFloor = document.getElementById("compareFloor");
  const compareBtn = document.getElementById("compareBtn");
  const compareTableBody = document.querySelector("#compareTable tbody");

  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".content-section");

  let currentUser = null;
  let allShops = [];
  let allOffers = [];

  // ----- AUTH CHECK -----
  onAuthChange(async (user) => {
    if(!user) {
      alert("You are Logging out, login to continue again!");
      window.location.href = "user-login.html";
      return;
    }
    currentUser = user;
    await loadData();
  });

  // ----- LOGOUT -----
  btnLogout?.addEventListener('click', async () => {
    await logout();
    window.location.href = "user-login.html";
  });

  // ----- LOAD DATA -----
  async function loadData() {
    allShops = await listShops();
    allOffers = await listOffers();

    populateFilters();
    populateCompareFilters();
    displayShops(allShops);
    displayOffers(allOffers);
  }

  // ----- DISPLAY SHOPS -----
  function displayShops(shops) {
    shopsListDiv.innerHTML = "";
    shops.forEach(s => {
      const div = document.createElement("div");
      div.className = "shop-card";
      div.innerHTML = `<strong>${s.name}</strong> — ${s.category} — ${s.floor}<p>${s.description || ""}</p>`;
      shopsListDiv.appendChild(div);
    });
  }

  // ----- DISPLAY OFFERS -----
  function displayOffers(offers) {
    offersListDiv.innerHTML = "";
    offers.forEach(o => {
      const shop = allShops.find(s => s.id === o.shopId);
      const div = document.createElement("div");
      div.className = "offer-card";
      div.innerHTML = `<strong>${o.title}</strong> — Shop: ${shop?.name || "N/A"}<br>
        Product: ${o.product.name} — ${o.product.price}<br>
        Features: ${o.product.features || "N/A"}`;
      offersListDiv.appendChild(div);
    });
  }

  // ----- POPULATE FILTERS -----
  function populateFilters() {
    categoryFilter.innerHTML = `<option value="">All</option>`;
    floorFilter.innerHTML = `<option value="">All</option>`;
    const categories = [...new Set(allShops.map(s => s.category))];
    const floors = [...new Set(allShops.map(s => s.floor))];

    categories.forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      categoryFilter.appendChild(option);
    });

    floors.forEach(f => {
      const option = document.createElement("option");
      option.value = f;
      option.textContent = f;
      floorFilter.appendChild(option);
    });
  }

  // ----- APPLY FILTER -----
  applyFilterBtn?.addEventListener("click", () => {
    const cat = categoryFilter.value;
    const flr = floorFilter.value;

    let filtered = allShops;
    if(cat) filtered = filtered.filter(s => s.category === cat);
    if(flr) filtered = filtered.filter(s => s.floor === flr);

    displayShops(filtered);

    const shopIds = filtered.map(s => s.id);
    displayOffers(allOffers.filter(o => shopIds.includes(o.shopId)));

    // Show shops section
    sections.forEach(sec => sec.id === "shopsSection"
      ? sec.classList.add("active")
      : sec.classList.remove("active"));
  });

  // ----- COMPARE FILTERS -----
  function populateCompareFilters() {
    compareCategory.innerHTML = `<option value="">All</option>`;
    compareFloor.innerHTML = `<option value="">All</option>`;

    const categories = [...new Set(allShops.map(s => s.category))];
    const floors = [...new Set(allShops.map(s => s.floor))];

    categories.forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      compareCategory.appendChild(option);
    });

    floors.forEach(f => {
      const option = document.createElement("option");
      option.value = f;
      option.textContent = f;
      compareFloor.appendChild(option);
    });
  }

  compareBtn?.addEventListener("click", () => {
    const cat = compareCategory.value;
    const flr = compareFloor.value;

    let filteredShops = allShops;
    if(cat) filteredShops = filteredShops.filter(s => s.category === cat);
    if(flr) filteredShops = filteredShops.filter(s => s.floor === flr);

    const shopIds = filteredShops.map(s => s.id);
    const filteredOffers = allOffers.filter(o => shopIds.includes(o.shopId));

    renderCompareTable(filteredOffers);
  });

  function renderCompareTable(offers) {
    compareTableBody.innerHTML = "";

    if(offers.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4">No products to compare</td>`;
      compareTableBody.appendChild(row);
      return;
    }

    const productsMap = {};
    offers.forEach(o => {
      if(!productsMap[o.product.name]) productsMap[o.product.name] = [];
      productsMap[o.product.name].push(o);
    });

    Object.values(productsMap).forEach(productOffers => {
      const minPrice = Math.min(...productOffers.map(o => o.product.price));

      productOffers.forEach(o => {
        const shop = allShops.find(s => s.id === o.shopId);
        const row = document.createElement("tr");
        const highlight = o.product.price === minPrice ? 'style="background-color: #d4edda;"' : '';
        row.innerHTML = `
          <td ${highlight}>${shop?.name || "N/A"}</td>
          <td ${highlight}>${o.product.name}</td>
          <td ${highlight}>${o.product.price}</td>
          <td ${highlight}>${o.product.features || "N/A"}</td>
        `;
        compareTableBody.appendChild(row);
      });
    });
  }

  // ----- NAVIGATION -----
  function showSection(targetId) {
    sections.forEach(sec => sec.id === targetId
      ? sec.classList.add("active")
      : sec.classList.remove("active"));
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      showSection(btn.dataset.target);
    });
  });

  // Show default section
  showSection("filterSection");

});
