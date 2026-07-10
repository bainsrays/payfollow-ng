import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SendPayload = {
  balanceId?: string;
  customerName?: string;
  phone?: string;
  message?: string;
  businessName?: string;
  tone?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeWhatsAppNumber(value: string | undefined) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function buildTemplateMessage(templateName: string, language: string, phone: string, payload: SendPayload, balance: Record<string, unknown> | null) {
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: language }
  };

  if (templateName !== "hello_world") {
    template.components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(payload.customerName || balance?.customer_name || "customer") },
          { type: "text", text: String(payload.businessName || "PayFollow NG") },
          { type: "text", text: String(balance?.amount || "") },
          { type: "text", text: String(balance?.item || "") },
          { type: "text", text: String(balance?.due_date || "") }
        ]
      }
    ];
  }

  return {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const metaToken = requireEnv("META_WHATSAPP_TOKEN");
    const phoneNumberId = requireEnv("META_WHATSAPP_PHONE_NUMBER_ID");
    const apiVersion = Deno.env.get("META_WHATSAPP_API_VERSION") || "v25.0";
    const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "";
    const templateLanguage = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") || "en";

    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Login required" }, 401);

    const payload = await request.json() as SendPayload;
    const phone = normalizeWhatsAppNumber(payload.phone);
    const message = String(payload.message || "").trim();
    if (!phone) return jsonResponse({ error: "Customer WhatsApp number is required" }, 400);
    if (!message) return jsonResponse({ error: "Reminder message is required" }, 400);

    let balance: Record<string, unknown> | null = null;
    if (payload.balanceId) {
      const { data, error } = await supabase
        .from("customer_balances")
        .select("id,business_id,customer_name,customer_phone,item,amount,due_date,status")
        .eq("id", payload.balanceId)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 400);
      balance = data;
    }

    const metaBody = templateName
      ? buildTemplateMessage(templateName, templateLanguage, phone, payload, balance)
      : {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: {
            preview_url: false,
            body: message
          }
        };

    const metaResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${metaToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metaBody)
    });
    const metaResult = await metaResponse.json();
    if (!metaResponse.ok) {
      return jsonResponse({
        error: "Meta WhatsApp API rejected the message",
        meta: metaResult,
        hint: "For test mode, add the recipient number in Meta and use a valid generated token. For production reminders, use an approved WhatsApp template."
      }, 400);
    }

    if (balance?.business_id) {
      await supabase.from("whatsapp_reminders").insert({
        business_id: balance.business_id,
        balance_id: balance.id,
        customer_name: payload.customerName || balance.customer_name,
        customer_phone: phone,
        message,
        delivery_mode: templateName ? "template" : "text",
        provider_message_id: metaResult?.messages?.[0]?.id || null,
        status: "sent"
      });
    }

    return jsonResponse({
      ok: true,
      providerMessageId: metaResult?.messages?.[0]?.id || null,
      mode: templateName ? "template" : "text"
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
