/**
 * App module — main entry point.
 *
 * Wires UI events to store actions and renders the DOM.
 * All user input is escaped before insertion into innerHTML.
 */

import store from "./store.js";
import {
  esc, createFormatter, formatMoney, formatDate, formatDateTime,
  validatePhone, validateAmount, validateDate, whatsappUrl, copyText,
  buildCsv, downloadFile, slugify,
} from "./utils.js";
import { generateReminder, generateReport } from "./templates.js";

// --- DOM helpers -----------------------------------------------------

const $ = (id) => document.getElementById(id);

let formatter = createFormatter("NGN");
const money = (v) => formatMoney(formatter, v);

function showToast(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

function showModal(id) {
  $(id).classList.add("show");
}

function hideModal(id) {
  $(id).classList.remove("show");
}

function statusLabel(status) {
  return { unpaid: "Unpaid", part: "Part paid", overdue: "Overdue", paid: "Paid" }[status] || "Unpaid";
}

// --- Rendering --------------------------------------------------------

function render() {
  renderProfile();
  renderMetrics();
  renderCustomerList();
  renderMessage();
  renderReport();
  renderHistory();
  renderStaff();
}

function renderProfile() {
  const profile = store.getProfile();
  const account = store.getAccount();
  formatter = createFormatter(profile.currency);

  $("workspaceTitle").textContent = profile.businessName;
  $("workspaceSubtitle").textContent =
    `${profile.ownerName} • ${profile.businessType} • ${profile.businessCity} • ${profile.businessPhone}`;

  const accountStatus = $("accountStatus");
  accountStatus.textContent = account.loggedIn ? "Logged in" : profile.created ? "Account set up" : "Demo account";
  accountStatus.className = `status ${account.loggedIn ? "" : "part"}`;

  renderProfileSelector();
}

function renderProfileSelector() {
  const selector = $("profileSelector");
  const profiles = store.getProfiles();
  const current = store.getProfile();
  selector.innerHTML = "";
  profiles.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.businessName} - ${item.businessType}`;
    selector.appendChild(option);
  });
  selector.value = current.id;
}

function renderMetrics() {
  const balances = store.getBalances();
  const unpaid = balances
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const overdue = balances
    .filter((b) => b.status === "overdue")
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = balances.filter((b) => {
    if (b.status === "paid") return false;
    if (!b.dueDate) return false;
    return b.dueDate <= today;
  }).length;

  const paidWeek = store.getPaidThisWeek();

  $("totalUnpaid").textContent = money(unpaid);
  $("totalOverdue").textContent = money(overdue);
  $("dueToday").textContent = String(dueToday);
  $("paidWeek").textContent = money(paidWeek);
}

function renderCustomerList() {
  const filter = $("filter").value;
  const balances = store.getBalances();
  const visible = balances.filter((b) => filter === "all" || b.status === filter);
  const list = $("customerList");

  list.innerHTML = "";

  visible.forEach((balance) => {
    const row = document.createElement("article");
    row.className = `customer-row ${balance.id === store.getSelected()?.id ? "active" : ""}`;

    row.innerHTML = `
      <div>
        <h4>${esc(balance.name)}</h4>
        <p>${esc(balance.item)}</p>
        <p>${esc(balance.tag)} • Due ${formatDate(balance.dueDate)}</p>
        <div class="row-actions">
          <button class="btn edit-btn" data-id="${esc(balance.id)}">Edit</button>
          <button class="btn danger delete-btn" data-id="${esc(balance.id)}">Delete</button>
        </div>
      </div>
      <div class="amount">
        <span>${money(balance.amount)}</span>
        <span class="status ${balance.status}">${statusLabel(balance.status)}</span>
      </div>
    `;

    row.addEventListener("click", (e) => {
      if (e.target.closest(".edit-btn") || e.target.closest(".delete-btn")) return;
      store.setSelected(balance.id);
      render();
    });

    list.appendChild(row);
  });

  list.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startEdit(btn.dataset.id);
    });
  });

  list.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const balance = store.getBalanceById(btn.dataset.id);
      if (balance) {
        $("deleteCustomerName").textContent = `${balance.name} — ${money(balance.amount)}`;
        showModal("deleteModal");
        $("confirmDelete").onclick = () => {
          store.deleteBalance(btn.dataset.id);
          hideModal("deleteModal");
          render();
          showToast("Balance deleted");
        };
      }
    });
  });

  if (!visible.length) {
    list.innerHTML = `<div class="message-text">No customer balances match this filter.</div>`;
  }
}

function renderMessage() {
  const balance = store.getSelected();
  const tone = $("tone").value;
  const message = generateReminder(balance, tone, money);
  $("messageText").textContent = message;
}

function renderReport() {
  const balances = store.getBalances();
  const businessName = store.getProfile().businessName;
  const report = generateReport(balances, businessName, money);
  $("report").textContent = report;
}

function renderHistory() {
  const history = store.getHistory();
  const list = $("historyList");

  if (!history.length) {
    list.innerHTML = `<div class="history-empty">No payments recorded yet.</div>`;
    return;
  }

  list.innerHTML = history
    .slice(0, 20)
    .map(
      (h) => `
      <div class="history-item">
        <div>
          <span class="history-customer">${esc(h.customerName)}</span>
          <span class="history-date"> • ${formatDateTime(h.date)}</span>
          ${h.note ? `<br><span style="color:var(--muted);font-size:11px">${esc(h.note)}</span>` : ""}
        </div>
        <span class="history-amount">${money(h.amount)}</span>
      </div>
    `
    )
    .join("");
}

function renderStaff() {
  const staff = store.getStaff();
  const list = $("staffList");
  list.innerHTML = "";

  staff.forEach((member) => {
    const row = document.createElement("div");
    row.className = "mini-row";
    row.innerHTML = `
      <div>
        <strong>${esc(member.name)}</strong>
        ${esc(member.role)} • ${esc(member.permission)}<br />
        ${esc(member.contact)}
      </div>
      <span class="status">${esc(member.role)}</span>
    `;
    list.appendChild(row);
  });
}

// --- Form: Add/Edit balance ------------------------------------------

let editingId = null;

function startEdit(id) {
  const balance = store.getBalanceById(id);
  if (!balance) return;

  editingId = id;
  $("formTitle").textContent = "Edit customer balance";
  $("submitBtn").textContent = "Update balance";
  $("cancelEdit").style.display = "";

  $("customerName").value = balance.name;
  $("phone").value = balance.phone;
  $("amount").value = balance.amount;
  $("dueDate").value = balance.dueDate;
  $("item").value = balance.item;
  $("status").value = balance.status;
  $("tag").value = balance.tag;
  $("note").value = balance.note || "";

  $("balanceForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEdit() {
  editingId = null;
  $("formTitle").textContent = "Add customer balance";
  $("submitBtn").textContent = "Add balance";
  $("cancelEdit").style.display = "none";
  $("balanceForm").reset();
  $("dueDate").value = new Date().toISOString().slice(0, 10);
  $("formError").textContent = "";
}

function handleFormSubmit(e) {
  e.preventDefault();

  const name = $("customerName").value.trim();
  const phone = $("phone").value.trim();
  const amount = validateAmount($("amount").value);
  const dueDate = $("dueDate").value;
  const item = $("item").value.trim();
  const status = $("status").value;
  const tag = $("tag").value;
  const note = $("note").value.trim();
  const errorEl = $("formError");

  errorEl.textContent = "";

  if (!name) {
    errorEl.textContent = "Customer name is required.";
    $("customerName").focus();
    return;
  }
  if (!validatePhone(phone)) {
    errorEl.textContent = "Please enter a valid Nigerian phone number (e.g. 08031234567).";
    $("phone").focus();
    return;
  }
  if ((amount === null || amount <= 0) && status !== "paid") {
    errorEl.textContent = "Amount must be a positive number.";
    $("amount").focus();
    return;
  }
  if (!validateDate(dueDate)) {
    errorEl.textContent = "Please enter a valid due date.";
    $("dueDate").focus();
    return;
  }
  if (!item) {
    errorEl.textContent = "Item or service is required.";
    $("item").focus();
    return;
  }

  const data = { name, phone, amount: amount || 0, dueDate, status, tag, note };

  if (editingId) {
    store.updateBalance(editingId, data);
    showToast("Balance updated");
    cancelEdit();
  } else {
    store.addBalance(data);
    showToast("Balance added");
    $("balanceForm").reset();
    $("dueDate").value = new Date().toISOString().slice(0, 10);
  }

  render();
}

// --- Part-payment modal -----------------------------------------------

function openPartPayModal() {
  const balance = store.getSelected();
  if (!balance) return;

  $("partPayCustomerName").textContent = `${balance.name} — Remaining: ${money(balance.amount)}`;
  $("partPayAmount").value = "";
  $("partPayError").textContent = "";
  showModal("partPayModal");
  $("partPayAmount").focus();
}

function handleConfirmPartPay() {
  const balance = store.getSelected();
  if (!balance) return;

  const amount = validateAmount($("partPayAmount").value);
  if (amount === null || amount <= 0) {
    $("partPayError").textContent = "Enter a valid positive amount.";
    return;
  }
  if (amount > balance.amount) {
    $("partPayError").textContent = `Amount exceeds remaining balance of ${money(balance.amount)}.`;
    return;
  }

  store.markPartPaid(balance.id, amount);
  hideModal("partPayModal");
  render();
  showToast("Part payment recorded");
}

// --- Business name modal ---------------------------------------------

function openBusinessModal() {
  $("businessNameInput").value = store.getProfile().businessName;
  showModal("businessModal");
  $("businessNameInput").focus();
}

function handleSaveBusinessName() {
  const name = $("businessNameInput").value.trim();
  if (name) {
    const profile = store.getProfile();
    store.upsertProfile({ ...profile, businessName: name, created: true });
    render();
    showToast("Business name updated");
  }
  hideModal("businessModal");
}

// --- Profile / account / staff ---------------------------------------

function syncProfileForm() {
  const profile = store.getProfile();
  const account = store.getAccount();
  $("accountEmail").value = account.email;
  $("accountPassword").value = account.password;
  $("businessName").value = profile.businessName;
  $("ownerName").value = profile.ownerName;
  $("businessType").value = profile.businessType;
  $("businessPhone").value = profile.businessPhone;
  $("businessCity").value = profile.businessCity;
  $("currency").value = profile.currency;
}

function makeProfileFromForm() {
  const businessName = $("businessName").value.trim() || defaultProfile.businessName;
  const idBase = slugify(businessName) || "business";
  const current = store.getProfile();
  return {
    id: current.id && current.businessName === businessName ? current.id : `${idBase}-${Date.now()}`,
    businessName,
    ownerName: $("ownerName").value.trim() || "Business owner",
    businessType: $("businessType").value,
    businessPhone: $("businessPhone").value.trim() || "08000000000",
    businessCity: $("businessCity").value.trim() || "Nigeria",
    currency: $("currency").value,
    created: true,
  };
}

// --- Event wiring -----------------------------------------------------

function wireEvents() {
  // Balance form
  $("balanceForm").addEventListener("submit", handleFormSubmit);
  $("cancelEdit").addEventListener("click", cancelEdit);
  $("saveData").addEventListener("click", () => {
    store.saveBalances();
    showToast("Data saved");
  });

  // Filters and tone
  $("filter").addEventListener("change", render);
  $("tone").addEventListener("change", renderMessage);

  // Reminder actions
  $("copyMessage").addEventListener("click", async () => {
    const ok = await copyText($("messageText").textContent);
    showToast(ok ? "Message copied" : "Copy failed");
  });

  $("openWhatsApp").addEventListener("click", () => {
    const balance = store.getSelected();
    if (!balance) return;
    const text = $("messageText").textContent;
    const url = whatsappUrl(balance.phone, text);
    window.open(url, "_blank", "noopener,noreferrer");
  });

  $("markPaid").addEventListener("click", () => {
    const balance = store.getSelected();
    if (!balance) return;
    if (balance.status === "paid") {
      showToast("Already marked paid");
      return;
    }
    store.markPaid(balance.id);
    render();
    showToast("Marked paid");
  });

  $("markPart").addEventListener("click", () => {
    const balance = store.getSelected();
    if (!balance) return;
    if (balance.status === "paid") {
      showToast("Already fully paid");
      return;
    }
    if (balance.amount <= 0) {
      showToast("No remaining balance");
      return;
    }
    openPartPayModal();
  });

  // Part-payment modal
  $("confirmPartPay").addEventListener("click", handleConfirmPartPay);
  $("cancelPartPay").addEventListener("click", () => hideModal("partPayModal"));
  $("partPayAmount").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleConfirmPartPay();
  });

  // Business name modal
  $("editBusiness").addEventListener("click", openBusinessModal);
  $("saveBusinessName").addEventListener("click", handleSaveBusinessName);
  $("cancelBusinessName").addEventListener("click", () => hideModal("businessModal"));
  $("businessNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSaveBusinessName();
  });

  // Delete modal
  $("cancelDelete").addEventListener("click", () => hideModal("deleteModal"));

  // Report actions
  $("exportReport").addEventListener("click", async () => {
    const ok = await copyText($("report").textContent);
    showToast(ok ? "Report copied" : "Copy failed");
  });

  $("downloadReport").addEventListener("click", () => {
    const name = slugify(store.getProfile().businessName);
    downloadFile(`${name}-cashflow-report.txt`, $("report").textContent);
    showToast("Report downloaded");
  });

  $("downloadCsv").addEventListener("click", () => {
    const name = slugify(store.getProfile().businessName);
    downloadFile(`${name}-balances.csv`, buildCsv(store.getBalances(), statusLabel), "text/csv");
    showToast("CSV exported");
  });

  $("resetDemo").addEventListener("click", () => {
    if (confirm("Reset all data to demo? This will erase your changes.")) {
      store.resetToDemo();
      cancelEdit();
      syncProfileForm();
      render();
      showToast("Demo reset");
    }
  });

  // Auth form
  $("authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    store.setAccount({
      email: $("accountEmail").value.trim() || "owner@payfollow.ng",
      password: $("accountPassword").value || "demo1234",
      loggedIn: true,
    });
    render();
    showToast("Demo account created");
  });

  $("loginAccount").addEventListener("click", () => {
    store.setAccount({
      email: $("accountEmail").value.trim() || store.getAccount().email,
      password: $("accountPassword").value || store.getAccount().password,
      loggedIn: true,
    });
    render();
    showToast("Logged in");
  });

  // Account form
  $("accountForm").addEventListener("submit", (e) => {
    e.preventDefault();
    store.upsertProfile(makeProfileFromForm());
    syncProfileForm();
    render();
    showToast("Demo account created");
  });

  $("saveBusinessProfile").addEventListener("click", () => {
    store.upsertProfile(makeProfileFromForm());
    syncProfileForm();
    render();
    showToast("Business profile saved");
  });

  $("profileSelector").addEventListener("change", (e) => {
    const next = store.switchProfile(e.target.value);
    if (!next) return;
    syncProfileForm();
    render();
    showToast("Business profile loaded");
  });

  $("loadSampleAccount").addEventListener("click", () => {
    const { ...defaults } = { id: "sample-fashion", businessName: "Ada's Fashion House", ownerName: "Ada Okafor", businessType: "Fashion / tailoring", businessPhone: "08030000000", businessCity: "Lagos", currency: "NGN", created: true };
    store.upsertProfile(defaults);
    syncProfileForm();
    render();
    showToast("Sample account loaded");
  });

  // WhatsApp API link
  $("copyWhatsappApiLink").addEventListener("click", async () => {
    await copyText("https://developers.facebook.com/docs/whatsapp/cloud-api/get-started");
    showToast("WhatsApp API link copied");
  });

  // Staff form
  $("staffForm").addEventListener("submit", (e) => {
    e.preventDefault();
    store.addStaff({
      id: `staff-${Date.now()}`,
      name: $("staffName").value.trim() || "New staff",
      contact: $("staffContact").value.trim() || "No contact added",
      role: $("staffRole").value,
      permission: $("staffPermission").value,
    });
    renderStaff();
    showToast("Staff access added");
  });

  $("copyStaffInvite").addEventListener("click", async () => {
    const name = $("staffName").value.trim() || "there";
    const role = $("staffRole").value;
    const permission = $("staffPermission").value;
    await copyText(
      `Hello ${name}, you have been invited to help manage ${store.getProfile().businessName} on PayFollow NG as ${role}. Permission: ${permission}.`
    );
    showToast("Staff invite copied");
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("show");
      }
    });
  });

  // Escape closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.show").forEach((m) => m.classList.remove("show"));
    }
  });
}

// --- Boot -------------------------------------------------------------

function boot() {
  store.init();
  $("dueDate").value = new Date().toISOString().slice(0, 10);
  syncProfileForm();
  wireEvents();
  render();
}

document.addEventListener("DOMContentLoaded", boot);
