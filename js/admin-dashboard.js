import { logout, onAuthChange } from './auth.js';
import { createShop, listShops, updateShop, deleteShop, createOffer, listOffers, updateOffer, deleteOffer } from './db.js';
import { logAction } from './logger.js';

document.addEventListener("DOMContentLoaded", () => {

  // -------------------- ELEMENTS --------------------
  const btnLogout = document.getElementById("btnLogout");
  const shopsListDiv = document.getElementById("shopsList");
  const shopSelect = document.getElementById("shopSelect");
  const offersListDiv = document.getElementById("offersList");
  const logsListDiv = document.getElementById("logsList");
  const createShopForm = document.getElementById("createShopForm");
  const createOfferForm = document.getElementById("createOfferForm");
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".content-section");

  let currentUser = null;

  // -------------------- AUTH CHECK --------------------
  onAuthChange(async (user) => {
    if (!user) {
      alert("You are Logging Out, Please login as admin to continue!");
      window.location.href = "admin-login.html?role=admin";
      return;
    }
    currentUser = user;
    await refreshShops();
    await refreshShopSelect();
    await refreshOffers();
    await refreshLogs();
  });

  // -------------------- LOGOUT --------------------
  btnLogout?.addEventListener('click', async () => {
    await logout();
    window.location.href = "admin-login.html";
  });

  // -------------------- CREATE SHOP --------------------
  createShopForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("shopName").value;
    const category = document.getElementById("shopCategory").value;
    const floor = document.getElementById("shopFloor").value;
    const description = document.getElementById("shopDesc").value;

    await createShop({ name, category, floor, description, ownerUid: currentUser.uid });
    await logAction(currentUser.uid, "createShop", { name });
    createShopForm.reset();
    await refreshShops();
    await refreshShopSelect();
  });

  // -------------------- REFRESH SHOPS --------------------
  async function refreshShops() {
    const shops = await listShops();
    shopsListDiv.innerHTML = "";

    shops.forEach(s => {
      const div = document.createElement("div");
      div.innerHTML = `
        <span class="shop-info">
          <strong>${s.name}</strong> — ${s.category} — ${s.floor}
        </span>
        <button class="editShopBtn">Edit</button>
        <button class="deleteShopBtn">Delete</button>
      `;
      shopsListDiv.appendChild(div);

      const infoSpan = div.querySelector(".shop-info");
      const editBtn = div.querySelector(".editShopBtn");
      const deleteBtn = div.querySelector(".deleteShopBtn");

      // ----- EDIT SHOP -----
      editBtn?.addEventListener("click", () => {
        infoSpan.innerHTML = `
          <input class="editName" value="${s.name}">
          <input class="editCategory" value="${s.category}">
          <input class="editFloor" value="${s.floor}">
          <input class="editDesc" value="${s.description || ''}" placeholder="Description">
          <button class="saveShopBtn">Save</button>
          <button class="cancelShopBtn">Cancel</button>
        `;

        div.querySelector(".saveShopBtn")?.addEventListener("click", async () => {
          const newName = infoSpan.querySelector(".editName").value;
          const newCategory = infoSpan.querySelector(".editCategory").value;
          const newFloor = infoSpan.querySelector(".editFloor").value;
          const newDesc = infoSpan.querySelector(".editDesc").value;

          await updateShop(s.id, { name: newName, category: newCategory, floor: newFloor, description: newDesc });
          await logAction(currentUser.uid, "updateShop", { shopId: s.id });
          await refreshShops();
          await refreshShopSelect();
        });

        div.querySelector(".cancelShopBtn")?.addEventListener("click", () => {
          refreshShops();
        });
      });

      // ----- DELETE SHOP -----
      deleteBtn?.addEventListener("click", async () => {
        if (confirm(`Delete shop ${s.name}?`)) {
          await deleteShop(s.id);
          await refreshShops();
          await refreshShopSelect();
        }
      });
    });
  }

  // -------------------- REFRESH SHOP SELECT --------------------
  async function refreshShopSelect() {
    const shops = await listShops();
    if (!shopSelect) return;
    shopSelect.innerHTML = "";
    shops.forEach(s => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      shopSelect.appendChild(option);
    });
  }

  // -------------------- CREATE OFFER --------------------
  createOfferForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const shopId = shopSelect?.value;
    const title = document.getElementById("offerTitle").value;
    const productName = document.getElementById("productName").value;
    const productPrice = parseFloat(document.getElementById("productPrice").value);
    const productFeatures = document.getElementById("productFeatures").value;

    await createOffer({
      shopId,
      title,
      product: { name: productName, price: productPrice, features: productFeatures },
      createdByUid: currentUser.uid
    });

    await logAction(currentUser.uid, "createOffer", { shopId, title });
    createOfferForm.reset();
    await refreshOffers();
  });

  // -------------------- REFRESH OFFERS --------------------
  async function refreshOffers() {
    const offers = await listOffers();
    offersListDiv.innerHTML = "";

    offers.forEach(o => {
      const div = document.createElement("div");
      div.innerHTML = `
        <span class="offer-info">
          ShopID: ${o.shopId} — <strong>${o.title}</strong> — ${o.product.name} @ ${o.product.price}
        </span>
        <button class="editOfferBtn">Edit</button>
        <button class="deleteOfferBtn">Delete</button>
      `;
      offersListDiv.appendChild(div);

      const infoSpan = div.querySelector(".offer-info");
      const editBtn = div.querySelector(".editOfferBtn");
      const deleteBtn = div.querySelector(".deleteOfferBtn");

      // ----- EDIT OFFER -----
      editBtn?.addEventListener("click", () => {
        infoSpan.innerHTML = `
          <select class="editShopId"></select>
          <input class="editTitle" value="${o.title}" placeholder="Offer Title">
          <input class="editProductName" value="${o.product.name}" placeholder="Product Name">
          <input class="editProductPrice" value="${o.product.price}" placeholder="Price">
          <input class="editProductFeatures" value="${o.product.features || ''}" placeholder="Features">
          <button class="saveOfferBtn">Save</button>
          <button class="cancelOfferBtn">Cancel</button>
        `;
        const select = infoSpan.querySelector(".editShopId");
        listShops().then(shops => {
          shops.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            if (s.id === o.shopId) opt.selected = true;
            select.appendChild(opt);
          });
        });

        div.querySelector(".saveOfferBtn")?.addEventListener("click", async () => {
          const newShopId = infoSpan.querySelector(".editShopId").value;
          const newTitle = infoSpan.querySelector(".editTitle").value;
          const newName = infoSpan.querySelector(".editProductName").value;
          const newPrice = parseFloat(infoSpan.querySelector(".editProductPrice").value);
          const newFeatures = infoSpan.querySelector(".editProductFeatures").value;

          await updateOffer(o.id, {
            shopId: newShopId,
            title: newTitle,
            product: { name: newName, price: newPrice, features: newFeatures }
          });
          await logAction(currentUser.uid, "updateOffer", { offerId: o.id });
          await refreshOffers();
        });

        div.querySelector(".cancelOfferBtn")?.addEventListener("click", () => {
          refreshOffers();
        });
      });

      // ----- DELETE OFFER -----
      deleteBtn?.addEventListener("click", async () => {
        if (confirm(`Delete offer ${o.title}?`)) {
          await deleteOffer(o.id);
          await refreshOffers();
        }
      });
    });
  }

  // -------------------- REFRESH LOGS --------------------
  async function refreshLogs() {
    const { db } = await import("./../firebase-config.js");
    const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const q = query(collection(db, "logs"), orderBy("ts", "desc"), limit(20));
    const snap = await getDocs(q);
    logsListDiv.innerHTML = "";
    snap.docs.forEach(d => {
      const log = d.data();
      const div = document.createElement("div");
      div.classList.add("log-entry"); 
      const ts = log.ts?.toDate ? log.ts.toDate().toLocaleString() : "";
      div.textContent = `${ts} — ${log.action} — ${JSON.stringify(log.meta || {})}`;
      logsListDiv.appendChild(div);
    });
  }

  // -------------------- NAVIGATION --------------------
  function showSection(targetId) {
    sections.forEach(sec => sec.classList.toggle("active", sec.id === targetId));
  }
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => showSection(btn.dataset.target));
  });
  showSection("createShopSection"); // default section
});
