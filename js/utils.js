/**
 * Utils module — pure helper functions.
 *
 * - HTML escaping (XSS prevention)
 * - Currency/date formatting (multi-currency)
 * - Phone number validation + WhatsApp link generation
 * - Clipboard copy with fallback
 * - CSV building + file download
 */

/** Escape user input for safe insertion into innerHTML. */
export function esc(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

/** Create a currency formatter for a given currency code. */
export function createFormatter(currency) {
  const locale = currency === "NGN" ? "en-NG" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** Format a number as currency string. */
export function formatMoney(formatter, value) {
  const formatted = formatter.format(Number(value) || 0);
  return formatted.replace("NGN", "NGN ");
}

/** Format an ISO date string (YYYY-MM-DD) into a human-readable date. */
export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value + "T12:00:00"));
  } catch {
    return "—";
  }
}

/** Format an ISO datetime string into date + time. */
export function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

/**
 * Validate a Nigerian phone number.
 * Accepts: 08031234567, 07031234567, +2348031234567, 2348031234567
 * Returns normalized "0XXXXXXXXX" format or null if invalid.
 */
export function validatePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  const prefixes = ["070", "080", "081", "090", "091"];

  if (digits.length === 11 && prefixes.some((p) => digits.startsWith(p))) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith("234")) {
    const local = "0" + digits.slice(3);
    if (prefixes.some((p) => local.startsWith(p))) return local;
  }
  return null;
}

/** Generate a WhatsApp click-to-chat URL from a phone + message. */
export function whatsappUrl(phone, text) {
  const normalized = validatePhone(phone);
  const encoded = encodeURIComponent(text);
  if (normalized) {
    const international = "234" + normalized.slice(1);
    return `https://wa.me/${international}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/** Copy text to clipboard with a fallback for older browsers. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    const ok = document.execCommand("copy");
    fallback.remove();
    return ok;
  }
}

/** Validate that amount is a positive number. */
export function validateAmount(value) {
  const num = Number(value);
  if (isNaN(num) || num < 0) return null;
  if (!Number.isFinite(num)) return null;
  return num;
}

/** Validate that a date string is valid ISO format YYYY-MM-DD. */
export function validateDate(value) {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value + "T12:00:00");
  return !isNaN(date.getTime());
}

/** Escape a value for CSV (wrap in quotes, double internal quotes). */
export function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

/** Build a CSV string from balances array. */
export function buildCsv(balances, statusLabelFn) {
  const headers = ["Customer", "Phone", "Amount", "Item", "Due date", "Status", "Tag", "Note"];
  const rows = balances.map((b) => [
    b.name,
    b.phone,
    b.amount,
    b.item,
    b.dueDate,
    statusLabelFn(b.status),
    b.tag,
    b.note,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

/** Download a file with given filename and content. */
export function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Convert a business name to a slug for filenames. */
export function slugify(name) {
  return String(name || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
