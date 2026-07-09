/**
 * Templates module — reminder message generators + cashflow report.
 *
 * 5 tones: polite, firm, final, part-payment follow-up, thank-you.
 * All templates are culturally appropriate for Nigerian business context.
 */

export function generateReminder(balance, tone, moneyFn) {
  if (!balance) return "Add or select a customer balance to generate a reminder.";

  const name = balance.name || "Customer";
  const amount = moneyFn(balance.amount);
  const item = balance.item || "your purchase";

  let dueStr = "";
  if (balance.dueDate) {
    try {
      dueStr = new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(balance.dueDate + "T12:00:00"));
    } catch {
      dueStr = "";
    }
  }

  const templates = {
    polite:
      `Hello ${name}, good day. This is a kind reminder about your pending balance of ${amount} for ${item}.` +
      (dueStr ? ` The agreed due date is ${dueStr}.` : "") +
      ` Please let us know when payment will be completed. Thank you.`,

    firm:
      `Hello ${name}, good day. We are following up on the outstanding balance of ${amount} for ${item}` +
      (dueStr ? `, which was due on ${dueStr}` : "") +
      `. Kindly treat this as important and share payment confirmation once completed. Thank you.`,

    final:
      `Hello ${name}, this is a final payment reminder for the outstanding balance of ${amount} for ${item}.` +
      ` Please complete payment today or contact us immediately if there is any issue. ` +
      `We value clear communication and want to close this properly.`,

    part:
      `Hello ${name}, thank you for the part payment made so far. ` +
      `Your remaining balance for ${item} is ${amount}. ` +
      `Kindly confirm when the balance will be completed. Thank you for your patronage.`,

    thanks:
      `Hello ${name}, payment received with thanks for ${item}. ` +
      `We appreciate your patronage and look forward to serving you again.`,
  };

  return templates[tone] || templates.polite;
}

export function generateReport(balances, businessName, moneyFn) {
  const open = balances.filter((b) => b.status !== "paid");
  const overdue = balances.filter((b) => b.status === "overdue");
  const dueNow = balances.filter(
    (b) => b.status !== "paid" && b.dueDate && new Date(b.dueDate + "T12:00:00") <= new Date()
  );
  const total = open.reduce((sum, b) => sum + Number(b.amount), 0);
  const top = [...open].sort((a, b) => b.amount - a.amount)[0];

  let report = `${businessName} has ${moneyFn(total)} still unpaid across ${open.length} customer${open.length !== 1 ? "s" : ""}. `;
  report += `${overdue.length} balance${overdue.length !== 1 ? "s are" : " is"} overdue and ${dueNow.length} need${dueNow.length === 1 ? "s" : ""} follow-up today. `;

  if (top) {
    report += `The largest open balance is ${moneyFn(top.amount)} from ${top.name} for ${top.item}. `;
  }

  report += `Recommended action: message overdue customers first, then follow up on today's balances before closing.`;

  return report;
}
