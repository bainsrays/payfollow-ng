(function () {
  const config = window.PayFollowConfig || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const client = hasSupabase ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const state = {
    businessId: null,
    user: null,
    liveBalances: [],
    liveStaff: []
  };

  function text(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function input(id) {
    return document.getElementById(id);
  }

  function money(value, currency = "NGN") {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(Number(value || 0)).replace("NGN", "NGN ");
  }

  function showStatus(message) {
    const status = input("accountStatus");
    if (status) {
      status.textContent = message;
      status.className = "status";
    }
  }

  function formProfile() {
    return {
      business_name: input("businessName")?.value?.trim() || "My Business",
      owner_name: input("ownerName")?.value?.trim() || "",
      business_type: input("businessType")?.value || "Small business",
      business_phone: input("businessPhone")?.value?.trim() || "",
      business_city: input("businessCity")?.value?.trim() || "Nigeria",
      currency: input("currency")?.value || "NGN"
    };
  }

  function fillProfile(profile) {
    if (!profile) return;
    if (input("businessName")) input("businessName").value = profile.business_name || profile.businessName || "";
    if (input("ownerName")) input("ownerName").value = profile.owner_name || profile.ownerName || "";
    if (input("businessType")) input("businessType").value = profile.business_type || profile.businessType || "Other small business";
    if (input("businessPhone")) input("businessPhone").value = profile.business_phone || profile.businessPhone || "";
    if (input("businessCity")) input("businessCity").value = profile.business_city || profile.businessCity || "";
    if (input("currency")) input("currency").value = profile.currency || "NGN";
    text("workspaceTitle", `${profile.business_name || profile.businessName} Payment Desk`);
    text("workspaceSubtitle", `${profile.owner_name || profile.ownerName || "Owner"} - ${profile.business_type || profile.businessType || "Business"} - ${profile.business_city || profile.businessCity || "Nigeria"} - ${profile.business_phone || profile.businessPhone || ""}`);
  }

  function mapBalance(row) {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.customer_name,
      phone: row.customer_phone || "",
      amount: Number(row.amount || 0),
      originalAmount: Number(row.original_amount || row.amount || 0),
      item: row.item,
      dueDate: row.due_date,
      status: row.status,
      tag: row.tag || "First follow-up",
      note: row.note || "",
      paidThisWeek: 0
    };
  }

  function publishLiveData(profile = null) {
    window.dispatchEvent(new CustomEvent("payfollow:liveData", {
      detail: {
        businessId: state.businessId,
        profile,
        balances: state.liveBalances,
        staff: state.liveStaff
      }
    }));
  }

  function renderLiveBalances() {
    const list = input("customerList");
    if (!list) return;
    const filter = input("filter")?.value || "all";
    const visible = state.liveBalances.filter(balance => filter === "all" || balance.status === filter);
    list.innerHTML = "";
    visible.forEach(balance => {
      const row = document.createElement("article");
      row.className = "customer-row";
      row.innerHTML = `
        <div>
          <h4>${balance.name}</h4>
          <p>${balance.item}</p>
          <p>${balance.tag} - Due ${balance.dueDate}</p>
        </div>
        <div class="amount">
          <span>${money(balance.amount, input("currency")?.value || "NGN")}</span>
          <span class="status ${balance.status}">${balance.status}</span>
        </div>
      `;
      list.appendChild(row);
    });
    if (!visible.length) list.innerHTML = `<div class="message-text">No customer balances yet. Add the first one.</div>`;

    const open = state.liveBalances.filter(balance => balance.status !== "paid");
    const overdue = state.liveBalances.filter(balance => balance.status === "overdue");
    const today = new Date().toISOString().slice(0, 10);
    const dueToday = open.filter(balance => balance.dueDate <= today);
    const total = open.reduce((sum, balance) => sum + balance.amount, 0);
    const overdueTotal = overdue.reduce((sum, balance) => sum + balance.amount, 0);
    text("totalUnpaid", money(total, input("currency")?.value || "NGN"));
    text("totalOverdue", money(overdueTotal, input("currency")?.value || "NGN"));
    text("dueToday", String(dueToday.length));
    text("report", `${input("businessName")?.value || "This business"} has ${money(total, input("currency")?.value || "NGN")} still unpaid across ${open.length} customers. ${overdue.length} balances are overdue and ${dueToday.length} need follow-up today.`);
    publishLiveData();
  }

  function renderLiveStaff() {
    const list = input("staffList");
    if (!list) return;
    list.innerHTML = "";
    state.liveStaff.forEach(member => {
      const row = document.createElement("div");
      row.className = "mini-row";
      row.innerHTML = `
        <div>
          <strong>${member.name}</strong>
          ${member.role} - ${member.permission}<br />
          ${member.email || ""}
        </div>
        <span class="status">${member.status || "active"}</span>
      `;
      list.appendChild(row);
    });
  }

  function selectedBalanceId() {
    return document.querySelector(".customer-row.active")?.dataset?.balanceId || state.liveBalances[0]?.id || null;
  }

  function selectedBalance() {
    const id = selectedBalanceId();
    return state.liveBalances.find(balance => balance.id === id) || state.liveBalances[0] || null;
  }

  async function recordActivity(action, entityType, entityId, note) {
    if (!hasSupabase || !state.businessId) return;
    await client.from("activity_logs").insert({
      business_id: state.businessId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      note
    });
  }

  async function recordPaymentEvent(balance, eventType, amount, note) {
    if (!hasSupabase || !state.businessId || !balance) return;
    await client.from("payment_history").insert({
      business_id: state.businessId,
      balance_id: balance.id,
      customer_name: balance.name,
      amount,
      event_type: eventType,
      note
    });
  }

  async function updateSelectedBalanceStatus(status) {
    if (!hasSupabase || !state.businessId) return;
    const balance = selectedBalance();
    if (!balance) return;

    const update = status === "paid"
      ? { status: "paid", amount: 0, tag: "Payment completed" }
      : { status: "part", tag: "Part-payment customer" };

    const { error } = await client
      .from("customer_balances")
      .update(update)
      .eq("id", balance.id)
      .eq("business_id", state.businessId);

    if (error) {
      showStatus(status === "paid" ? "Paid update failed" : "Part-payment update failed");
      return;
    }

    await recordPaymentEvent(
      balance,
      status === "paid" ? "paid" : "part_payment",
      status === "paid" ? balance.amount : 0,
      status === "paid" ? "Marked paid from dashboard" : "Marked part-paid from dashboard"
    );
    await recordActivity(
      status === "paid" ? "marked_paid" : "marked_part_paid",
      "customer_balance",
      balance.id,
      `${balance.name} marked ${status === "paid" ? "paid" : "part-paid"}`
    );
    showStatus(status === "paid" ? "Paid status saved live" : "Part-payment saved live");
    await loadLiveData();
  }

  async function logClickToChatReminder() {
    if (!hasSupabase || !state.businessId) return;
    const balance = selectedBalance();
    const message = input("messageText")?.textContent || "";
    if (!balance || !message.trim()) return;

    await client.from("whatsapp_reminders").insert({
      business_id: state.businessId,
      balance_id: balance.id,
      customer_name: balance.name,
      customer_phone: balance.phone || "",
      message,
      delivery_mode: "click_to_chat",
      status: "sent",
      provider_response: { source: "wa.me" }
    });
    await recordActivity(
      "opened_whatsapp_reminder",
      "customer_balance",
      balance.id,
      `WhatsApp reminder opened for ${balance.name}`
    );
    showStatus("WhatsApp reminder logged");
  }

  async function loadLiveData() {
    if (!hasSupabase) {
      showStatus("Add Supabase anon key");
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    state.user = sessionData.session?.user || null;
    if (!state.user) {
      showStatus("Login required");
      return;
    }

    showStatus("Live account");
    const { data: profileData, error: profileError } = await client
      .from("business_profiles")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1);
    if (profileError) throw profileError;

    let liveProfile = profileData?.[0];
    if (!liveProfile) {
      const { data, error } = await client
        .from("business_profiles")
        .insert({ owner_id: state.user.id, ...formProfile() })
        .select()
        .single();
      if (error) throw error;
      liveProfile = data;
    }

    state.businessId = liveProfile.id;
    fillProfile(liveProfile);

    const [{ data: balances }, { data: staff }] = await Promise.all([
      client.from("customer_balances").select("*").eq("business_id", state.businessId).order("created_at", { ascending: false }),
      client.from("staff_members").select("*").eq("business_id", state.businessId).order("created_at", { ascending: true })
    ]);
    state.liveBalances = (balances || []).map(mapBalance);
    state.liveStaff = staff || [];
    publishLiveData(liveProfile);
    renderLiveStaff();
  }

  async function saveLiveProfile(event) {
    if (!hasSupabase || !state.businessId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const { data, error } = await client
      .from("business_profiles")
      .update(formProfile())
      .eq("id", state.businessId)
      .select()
      .single();
    if (error) {
      showStatus("Profile save failed");
      return;
    }
    fillProfile(data);
    showStatus("Profile saved");
  }

  async function addLiveBalance(event) {
    if (!hasSupabase || !state.businessId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const amount = Number(input("amount")?.value || 0);
    const payload = {
      business_id: state.businessId,
      customer_name: input("customerName")?.value?.trim() || "Unnamed customer",
      customer_phone: input("phone")?.value?.trim() || "",
      amount,
      original_amount: amount,
      due_date: input("dueDate")?.value || new Date().toISOString().slice(0, 10),
      item: input("item")?.value?.trim() || "Business balance",
      status: input("status")?.value || "unpaid",
      tag: input("tag")?.value || "",
      note: input("note")?.value?.trim() || ""
    };
    const { error } = await client.from("customer_balances").insert(payload);
    if (error) {
      showStatus("Balance save failed");
      return;
    }
    showStatus("Balance saved");
    await loadLiveData();
  }

  async function addLiveStaff(event) {
    if (!hasSupabase || !state.businessId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {
      business_id: state.businessId,
      name: input("staffName")?.value?.trim() || "New staff",
      email: input("staffContact")?.value?.trim() || "",
      role: input("staffRole")?.value || "Support staff",
      permission: input("staffPermission")?.value || "View and update balances",
      status: "invited"
    };
    const { error } = await client.from("staff_members").insert(payload);
    if (error) {
      showStatus("Staff save failed");
      return;
    }
    showStatus("Staff access saved");
    await loadLiveData();
  }

  window.addEventListener("DOMContentLoaded", () => {
    text("workspaceSubtitle", `Operated by ${config.companyName || "Dynamic Fix LLC"}, a registered Nigerian company.`);
    input("accountForm")?.addEventListener("submit", saveLiveProfile, true);
    input("saveBusinessProfile")?.addEventListener("click", saveLiveProfile, true);
    input("balanceForm")?.addEventListener("submit", addLiveBalance, true);
    input("staffForm")?.addEventListener("submit", addLiveStaff, true);
    input("markPaid")?.addEventListener("click", () => {
      updateSelectedBalanceStatus("paid").catch(error => showStatus(error.message || "Paid update failed"));
    }, true);
    input("markPart")?.addEventListener("click", () => {
      updateSelectedBalanceStatus("part").catch(error => showStatus(error.message || "Part-payment update failed"));
    }, true);
    input("openWhatsApp")?.addEventListener("click", () => {
      logClickToChatReminder().catch(error => showStatus(error.message || "Reminder log failed"));
    }, true);
    input("filter")?.addEventListener("change", () => {
      if (hasSupabase && state.businessId) publishLiveData();
    }, true);
    loadLiveData().catch(error => showStatus(error.message || "Supabase check failed"));
  });
})();
