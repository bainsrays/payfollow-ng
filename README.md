# PayFollow NG

PayFollow NG is a payment follow-up website and dashboard for Nigerian small businesses that sell on credit or collect balances later.

It helps business owners:

- Track unpaid customer balances
- See overdue payments and payments due today
- Generate polite WhatsApp-ready reminders
- Mark balances as unpaid, part-paid, paid, or overdue
- Copy simple cashflow reports
- Explain the product through a landing page, navigation, feature sections, and pricing teaser
- Manage multiple business profiles and team/staff access
- Export balances as CSV and download text reports

## Architecture

```
payfollow-ng/
├── index.html          # Semantic HTML structure (landing page + dashboard)
├── css/
│   └── styles.css       # All styling, responsive breakpoints, modal styles
└── js/
    ├── app.js           # Entry point — event wiring + DOM rendering
    ├── store.js         # State management + localStorage persistence
    ├── utils.js         # Pure helpers (escaping, validation, formatting, CSV)
    └── templates.js     # Reminder message + report template generators
```

### Key design decisions

- **Separation of concerns**: HTML, CSS, and JS are fully separated. State, rendering, and templates are independent modules.
- **XSS prevention**: All user input is escaped via `esc()` before insertion into `innerHTML`.
- **Input validation**: Phone numbers validated against Nigerian formats (070/080/081/090/091). Amounts must be positive. Dates must be valid ISO format.
- **Payment history**: Every payment (full or partial) is timestamped and displayed. "Paid this week" is calculated from actual timestamps, not hardcoded fields.
- **Part-payment flow**: A modal prompts for the amount received. The remaining balance is updated and the difference is recorded in history.
- **Edit/delete**: Customer balances can be edited (name, phone, amount, date, item, status, tag, note) or deleted with confirmation.
- **Business name**: Configurable via modal. Used in the cashflow report and workspace title.
- **Multi-profile support**: Multiple business profiles with a selector dropdown. Each profile has its own currency, city, owner name, etc.
- **Staff management**: Add staff members with roles and permissions. Copy invite messages.
- **CSV export + report download**: Download balances as CSV and cashflow reports as text files.
- **Original amount preserved**: `originalAmount` tracks the initial balance even after payments.
- **No external image dependencies**: Hero and sidebar use CSS gradients instead of Unsplash URLs.
- **Inline SVG favicon**: No external favicon request.

## Hackathon MVP

This is a self-contained static MVP built for the Outskill hackathon.

GitHub repository:

```
https://github.com/bainsrays/payfollow-ng
```

Public demo:

```
https://bainsrays.github.io/payfollow-ng/
```

Open locally:

```bash
# Any static server works. Example with Python:
python3 -m http.server 8770
# Then open http://127.0.0.1:8770/
```

Or simply open `index.html` in a browser.

## Demo Story

A Nigerian fashion seller has money stuck across multiple customers. PayFollow NG shows who owes, what is overdue, who needs follow-up today, and generates respectful WhatsApp messages to help recover balances faster.

## Current Features

- Product landing page
- Sticky website navigation
- Feature and pricing sections
- Live demo section
- Demo business account setup
- Demo create account and login flow
- Multiple business profiles
- Team/staff access management
- Dashboard metrics
- Demo Nigerian SME customer balances
- Add / edit / delete customer balances
- Payment status tracking (unpaid, part-paid, overdue, paid)
- Reminder tone selector (polite, firm, final, part-payment, thank-you)
- Copy reminder message to clipboard
- Open WhatsApp click-to-chat with pre-filled message
- Mark paid (records payment in history)
- Mark part-paid (modal prompts for amount received, records in history)
- Payment history with timestamps
- Cashflow summary report (uses business name)
- Configurable business name
- Downloadable text report
- CSV export
- WhatsApp Cloud API setup link
- Local browser storage (localStorage)
- Input validation (phone, amount, date)
- XSS prevention (all user input escaped)
- Inline SVG favicon
- Responsive design (desktop, tablet, mobile)

## Safe Positioning

PayFollow NG is a payment organization and communication tool. It does not harass, threaten, shame, report, or guarantee payment recovery.

## Next Product Steps

- Replace demo login with real authentication
- Add cloud database
- Add Paystack/Flutterwave payment links
- Add deeper WhatsApp Business API integration
- Add public marketing pages for FAQs, support, and terms
- Add mobile-first production UI polish
