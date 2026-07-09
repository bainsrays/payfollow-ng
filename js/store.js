/**
 * Store module — central state management with localStorage persistence.
 *
 * Responsibilities:
 *  - Load/save balances, payment history, profiles, account, staff
 *  - CRUD operations on balance records
 *  - Payment history tracking (timestamps + amounts)
 *  - Business profile management (multi-profile support)
 *  - Account (demo auth) state
 *  - Staff management
 */

const STORAGE_KEY = "payfollow:balances";
const HISTORY_KEY = "payfollow:history";
const PROFILE_KEY = "payfollow:profile";
const PROFILES_KEY = "payfollow:profiles";
const ACCOUNT_KEY = "payfollow:account";
const STAFF_KEY = "payfollow:staff";

// --- Default data ---------------------------------------------------

const defaultProfile = {
  id: "sample-fashion",
  businessName: "Ada's Fashion House",
  ownerName: "Ada Okafor",
  businessType: "Fashion / tailoring",
  businessPhone: "08030000000",
  businessCity: "Lagos",
  currency: "NGN",
  created: false,
};

const defaultAccount = {
  email: "owner@payfollow.ng",
  password: "demo1234",
  loggedIn: false,
};

const defaultStaff = [
  {
    id: "staff-owner",
    name: "Ada Okafor",
    contact: "owner@payfollow.ng",
    role: "Owner",
    permission: "Full access",
  },
];

function seedDemoBalances() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: "bal-1",
      name: "Tolu Martins",
      phone: "08031234567",
      amount: 45000,
      originalAmount: 45000,
      item: "Two custom dresses",
      dueDate: iso(today),
      status: "unpaid",
      tag: "First follow-up",
      note: "Customer promised to complete payment after salary hits.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bal-2",
      name: "Mrs. Danjuma",
      phone: "08098765432",
      amount: 120000,
      originalAmount: 120000,
      item: "Aso-ebi group balance",
      dueDate: iso(new Date(today.getTime() - 2 * dayMs)),
      status: "overdue",
      tag: "Delays often",
      note: "Said the group treasurer will send balance.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bal-3",
      name: "Chika N.",
      phone: "08145550120",
      amount: 30000,
      originalAmount: 65000,
      item: "Ready-to-wear order",
      dueDate: iso(new Date(today.getTime() + dayMs)),
      status: "part",
      tag: "Part-payment customer",
      note: "Paid NGN 35,000, balance remains.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bal-4",
      name: "Bola Ade",
      phone: "07022224444",
      amount: 90000,
      originalAmount: 90000,
      item: "Bridal fitting balance",
      dueDate: iso(new Date(today.getTime() - dayMs)),
      status: "overdue",
      tag: "Delays often",
      note: "Needs firm but respectful reminder.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bal-5",
      name: "Sarah Okon",
      phone: "08055556666",
      amount: 0,
      originalAmount: 78000,
      item: "Ankara two-piece",
      dueDate: iso(new Date(today.getTime() - 3 * dayMs)),
      status: "paid",
      tag: "Pays on time",
      note: "Completed payment by transfer.",
      createdAt: new Date().toISOString(),
    },
  ];
}

function seedDemoHistory() {
  const today = new Date();
  return [
    {
      id: "pay-1",
      balanceId: "bal-3",
      customerName: "Chika N.",
      amount: 35000,
      date: new Date(today.getTime() - 2 * 86400000).toISOString(),
      note: "Part payment",
    },
    {
      id: "pay-2",
      balanceId: "bal-5",
      customerName: "Sarah Okon",
      amount: 78000,
      date: new Date(today.getTime() - 3 * 86400000).toISOString(),
      note: "Full payment by transfer",
    },
  ];
}

// --- State -----------------------------------------------------------

let balances = [];
let history = [];
let profile = { ...defaultProfile };
let profiles = [];
let account = { ...defaultAccount };
let staff = [];
let selectedId = null;

// --- Init ------------------------------------------------------------

function init() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    balances = saved ? JSON.parse(saved) : seedDemoBalances();
  } catch {
    balances = seedDemoBalances();
  }

  try {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    history = savedHistory ? JSON.parse(savedHistory) : seedDemoHistory();
  } catch {
    history = seedDemoHistory();
  }

  try {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    profile = savedProfile ? { ...defaultProfile, ...JSON.parse(savedProfile) } : { ...defaultProfile };
  } catch {
    profile = { ...defaultProfile };
  }

  try {
    const savedProfiles = localStorage.getItem(PROFILES_KEY);
    const parsed = savedProfiles ? JSON.parse(savedProfiles) : [];
    profiles = parsed.length ? parsed : [{ ...defaultProfile, created: true }];
  } catch {
    profiles = [{ ...defaultProfile, created: true }];
  }

  try {
    const savedAccount = localStorage.getItem(ACCOUNT_KEY);
    account = savedAccount ? { ...defaultAccount, ...JSON.parse(savedAccount) } : { ...defaultAccount };
  } catch {
    account = { ...defaultAccount };
  }

  try {
    const savedStaff = localStorage.getItem(STAFF_KEY);
    staff = savedStaff ? JSON.parse(savedStaff) : [...defaultStaff];
  } catch {
    staff = [...defaultStaff];
  }

  selectedId = balances[0]?.id ?? null;
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

function saveBalances() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- Balance CRUD ----------------------------------------------------

function getBalances() {
  return balances;
}

function getBalanceById(id) {
  return balances.find((b) => b.id === id) ?? null;
}

function getSelected() {
  return getBalanceById(selectedId);
}

function setSelected(id) {
  selectedId = id;
}

function addBalance(data) {
  const balance = {
    id: `bal-${Date.now()}`,
    name: data.name,
    phone: data.phone,
    amount: data.amount,
    originalAmount: data.amount,
    item: data.item,
    dueDate: data.dueDate,
    status: data.status,
    tag: data.tag,
    note: data.note,
    createdAt: new Date().toISOString(),
  };
  balances.unshift(balance);
  selectedId = balance.id;

  if (balance.status === "paid") {
    addPaymentHistory(balance.id, balance.name, balance.amount, "Full payment on entry");
    balance.amount = 0;
  }

  saveBalances();
  return balance;
}

function updateBalance(id, data) {
  const balance = getBalanceById(id);
  if (!balance) return null;

  Object.assign(balance, data);
  saveBalances();
  return balance;
}

function deleteBalance(id) {
  balances = balances.filter((b) => b.id !== id);
  history = history.filter((h) => h.balanceId !== id);
  if (selectedId === id) selectedId = balances[0]?.id ?? null;
  saveBalances();
}

function markPaid(id) {
  const balance = getBalanceById(id);
  if (!balance) return null;

  const paidAmount = balance.amount;
  addPaymentHistory(id, balance.name, paidAmount, "Full payment");
  balance.status = "paid";
  balance.amount = 0;
  saveBalances();
  return balance;
}

function markPartPaid(id, partialAmount) {
  const balance = getBalanceById(id);
  if (!balance) return null;

  const actualAmount = Math.min(partialAmount, balance.amount);
  addPaymentHistory(id, balance.name, actualAmount, "Part payment");
  balance.amount -= actualAmount;
  balance.status = "part";
  balance.tag = "Part-payment customer";

  if (balance.amount <= 0) {
    balance.status = "paid";
    balance.amount = 0;
  }

  saveBalances();
  return balance;
}

// --- Payment history -------------------------------------------------

function addPaymentHistory(balanceId, customerName, amount, note) {
  const record = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    balanceId,
    customerName,
    amount,
    date: new Date().toISOString(),
    note: note || "",
  };
  history.unshift(record);
  return record;
}

function getHistory() {
  return history;
}

function getPaidThisWeek() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return history
    .filter((h) => new Date(h.date) >= weekAgo)
    .reduce((sum, h) => sum + h.amount, 0);
}

// --- Profile management ----------------------------------------------

function getProfile() {
  return profile;
}

function getProfiles() {
  return profiles;
}

function setProfile(p) {
  profile = p;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function upsertProfile(nextProfile) {
  const idx = profiles.findIndex((item) => item.id === nextProfile.id);
  if (idx >= 0) {
    profiles[idx] = nextProfile;
  } else {
    profiles.push(nextProfile);
  }
  profile = nextProfile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function switchProfile(id) {
  const next = profiles.find((item) => item.id === id);
  if (!next) return null;
  profile = { ...defaultProfile, ...next };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

// --- Account ---------------------------------------------------------

function getAccount() {
  return account;
}

function setAccount(next) {
  account = next;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

// --- Staff -----------------------------------------------------------

function getStaff() {
  return staff;
}

function addStaff(member) {
  staff.push(member);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

// --- Reset -----------------------------------------------------------

function resetToDemo() {
  balances = seedDemoBalances();
  history = seedDemoHistory();
  profile = { ...defaultProfile };
  profiles = [{ ...defaultProfile, created: true }];
  account = { ...defaultAccount };
  staff = [...defaultStaff];
  selectedId = balances[0]?.id ?? null;
  saveAll();
}

export default {
  init,
  saveAll,
  saveBalances,
  getBalances,
  getBalanceById,
  getSelected,
  setSelected,
  addBalance,
  updateBalance,
  deleteBalance,
  markPaid,
  markPartPaid,
  getHistory,
  getPaidThisWeek,
  getProfile,
  getProfiles,
  setProfile,
  upsertProfile,
  switchProfile,
  getAccount,
  setAccount,
  getStaff,
  addStaff,
  resetToDemo,
};
