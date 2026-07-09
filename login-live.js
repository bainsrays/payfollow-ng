(function () {
  const config = window.PayFollowConfig || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const client = hasSupabase ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

  const form = document.getElementById("loginPageForm");
  const status = document.getElementById("loginStatus");
  const submit = document.getElementById("loginSubmit");
  const loadSample = document.getElementById("loadLoginSample");
  const title = document.getElementById("loginTitle");
  const intro = document.getElementById("loginIntro");

  if (!form || !status || !submit) return;

  function value(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function mode() {
    return new URLSearchParams(window.location.search).get("mode") === "signin" ? "signin" : "create";
  }

  function setProductionCopy() {
    if (title) {
      title.textContent = mode() === "signin"
        ? "Login to PayFollow NG."
        : "Create your PayFollow NG account.";
    }
    if (intro) {
      intro.textContent = mode() === "signin"
        ? "Enter your details to continue to your business dashboard."
        : `Set up a business workspace operated by ${config.companyName || "Dynamic Fix LLC"}.`;
    }
    submit.textContent = mode() === "signin" ? "Login and open dashboard" : "Create account";
    status.textContent = hasSupabase
      ? "Live account access is connected to Supabase."
      : "Live account screen is ready. Add the Supabase anon key to activate real signup/login.";
    if (loadSample) loadSample.textContent = "Use sample workspace";
  }

  document.getElementById("createMode")?.addEventListener("click", () => {
    window.setTimeout(setProductionCopy, 0);
  });
  document.getElementById("signinMode")?.addEventListener("click", () => {
    window.setTimeout(setProductionCopy, 0);
  });

  async function createBusinessProfile(user) {
    const profile = {
      owner_id: user.id,
      business_name: value("loginBusinessName") || "My Business",
      owner_name: value("loginOwnerName") || user.email,
      business_type: value("loginBusinessType") || "Small business",
      business_phone: value("loginBusinessPhone"),
      business_city: value("loginBusinessCity") || "Nigeria",
      currency: value("loginCurrency") || "NGN"
    };

    const { error } = await client
      .from("business_profiles")
      .insert(profile);

    if (error && !String(error.message || "").includes("duplicate")) throw error;
  }

  function persistSession(user) {
    localStorage.setItem("payfollow:account", JSON.stringify({
      email: user.email,
      loggedIn: true,
      live: hasSupabase
    }));
  }

  form.addEventListener("submit", async event => {
    if (!hasSupabase) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = value("loginEmail");
    const password = document.getElementById("loginPassword")?.value || "";
    if (!email || !password) {
      status.textContent = "Enter an email and password to continue.";
      return;
    }

    submit.disabled = true;
    status.textContent = mode() === "signin" ? "Checking account..." : "Creating account...";

    try {
      const result = mode() === "signin"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password });

      if (result.error) throw result.error;
      const user = result.data.user;
      if (user && mode() !== "signin") await createBusinessProfile(user);
      if (user) persistSession(user);

      status.textContent = "Account ready. Opening dashboard...";
      window.location.href = "app.html";
    } catch (error) {
      status.textContent = error.message || "Could not complete account access.";
      submit.disabled = false;
    }
  }, true);

  setProductionCopy();
})();
