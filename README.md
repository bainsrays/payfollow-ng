# PayFollow NG

PayFollow NG is a payment follow-up website and dashboard for Nigerian small businesses that sell on credit or collect balances later.

It helps business owners:

- Track unpaid customer balances
- See overdue payments and payments due today
- Generate polite WhatsApp-ready reminders
- Mark balances as unpaid, part-paid, paid, or overdue
- Copy simple cashflow reports
- Explain the product through a landing page, navigation, feature sections, and pricing teaser

## Hackathon MVP

This is a self-contained static MVP built for the Outskill hackathon.

GitHub repository:

```text
https://github.com/bainsrays/payfollow-ng
```

Public demo:

```text
https://bainsrays.github.io/payfollow-ng/
```

Open locally:

```text
http://127.0.0.1:8770/index.html
```

Or open:

```text
index.html
```

## Demo Story

A Nigerian fashion seller has money stuck across multiple customers. PayFollow NG shows who owes, what is overdue, who needs follow-up today, and generates respectful WhatsApp messages to help recover balances faster.

## Current Features

- Product landing page
- Sticky website navigation across multiple pages
- Separate pages for Home, Features, Pricing, Contact, Login, and App/Demo
- Feature and pricing pages
- Dedicated login/create-account demo page
- Live dashboard demo page
- Demo business account setup
- Demo create account and login flow
- Multiple business profiles
- Team/staff access management
- Dashboard metrics
- Demo Nigerian SME customer balances
- Add customer balance form
- Payment status tracking
- Reminder tone selector
- Copy reminder message
- Open WhatsApp click-to-chat
- Mark paid and mark part-paid actions
- Cashflow summary report
- Downloadable text report
- CSV export
- WhatsApp Cloud API setup link
- Local browser storage
- Supabase starter schema for launch-ready auth/database work

## Safe Positioning

PayFollow NG is a payment organization and communication tool. It does not harass, threaten, shame, report, or guarantee payment recovery.

## Next Product Steps

- Replace demo login with real authentication
- Connect the app to Supabase auth and database
- Add Paystack/Flutterwave payment links
- Add deeper WhatsApp Business API integration
- Add public marketing pages for FAQs, support, and terms
- Add mobile-first production UI polish

## Supabase Setup

The first database schema is saved at:

```text
supabase/schema.sql
```

It creates:

- business profiles
- customer balances
- staff/team members
- payment history
- Row Level Security policies
