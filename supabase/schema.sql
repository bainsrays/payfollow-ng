-- PayFollow NG initial Supabase schema
-- Run this in the Supabase SQL editor after creating the project.
-- Product owner/operator: Dynamic Fix LLC, Nigeria

create extension if not exists "pgcrypto";

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_name text not null,
  legal_owner_name text not null default 'Dynamic Fix LLC',
  legal_owner_country text not null default 'Nigeria',
  owner_name text,
  business_type text,
  business_phone text,
  business_city text,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_balances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  item text not null,
  amount numeric(14, 2) not null default 0,
  original_amount numeric(14, 2) not null default 0,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'part', 'paid', 'overdue')),
  tag text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'Support staff',
  permission text not null default 'View and update balances',
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  balance_id uuid references public.customer_balances(id) on delete set null,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,
  amount numeric(14, 2) not null default 0,
  event_type text not null default 'payment' check (event_type in ('payment', 'part_payment', 'paid', 'status_change')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  actor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  balance_id uuid references public.customer_balances(id) on delete set null,
  sent_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  message text not null,
  delivery_mode text not null default 'click_to_chat' check (delivery_mode in ('click_to_chat', 'text', 'template')),
  provider_message_id text,
  status text not null default 'sent' check (status in ('queued', 'sent', 'failed')),
  provider_response jsonb,
  created_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
alter table public.customer_balances enable row level security;
alter table public.staff_members enable row level security;
alter table public.payment_history enable row level security;
alter table public.activity_logs enable row level security;
alter table public.whatsapp_reminders enable row level security;

drop policy if exists "Owners can manage their business profiles" on public.business_profiles;
create policy "Owners can manage their business profiles"
on public.business_profiles
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners can manage balances for their businesses" on public.customer_balances;
create policy "Owners can manage balances for their businesses"
on public.customer_balances
for all
using (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = customer_balances.business_id
      and bp.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = customer_balances.business_id
      and bp.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can manage staff for their businesses" on public.staff_members;
create policy "Owners can manage staff for their businesses"
on public.staff_members
for all
using (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = staff_members.business_id
      and bp.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = staff_members.business_id
      and bp.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can manage payment history for their businesses" on public.payment_history;
create policy "Owners can manage payment history for their businesses"
on public.payment_history
for all
using (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = payment_history.business_id
      and bp.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = payment_history.business_id
      and bp.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can read activity logs for their businesses" on public.activity_logs;
create policy "Owners can read activity logs for their businesses"
on public.activity_logs
for select
using (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = activity_logs.business_id
      and bp.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can add activity logs for their businesses" on public.activity_logs;
create policy "Owners can add activity logs for their businesses"
on public.activity_logs
for insert
with check (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = activity_logs.business_id
      and bp.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can manage WhatsApp reminders for their businesses" on public.whatsapp_reminders;
create policy "Owners can manage WhatsApp reminders for their businesses"
on public.whatsapp_reminders
for all
using (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = whatsapp_reminders.business_id
      and bp.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_profiles bp
    where bp.id = whatsapp_reminders.business_id
      and bp.owner_id = auth.uid()
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_profiles_updated_at on public.business_profiles;
create trigger set_business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_balances_updated_at on public.customer_balances;
create trigger set_customer_balances_updated_at
before update on public.customer_balances
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_members_updated_at on public.staff_members;
create trigger set_staff_members_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();

create index if not exists business_profiles_owner_id_idx on public.business_profiles(owner_id);
create index if not exists customer_balances_business_id_idx on public.customer_balances(business_id);
create index if not exists customer_balances_status_idx on public.customer_balances(status);
create index if not exists customer_balances_due_date_idx on public.customer_balances(due_date);
create index if not exists staff_members_business_id_idx on public.staff_members(business_id);
create index if not exists payment_history_business_id_idx on public.payment_history(business_id);
create index if not exists activity_logs_business_id_idx on public.activity_logs(business_id);
create index if not exists whatsapp_reminders_business_id_idx on public.whatsapp_reminders(business_id);
create index if not exists whatsapp_reminders_balance_id_idx on public.whatsapp_reminders(balance_id);
create index if not exists whatsapp_reminders_created_at_idx on public.whatsapp_reminders(created_at);

grant usage on schema public to anon, authenticated;
grant select on public.business_profiles to anon;
grant select on public.customer_balances to anon;
grant select on public.staff_members to anon;
grant select on public.payment_history to anon;
grant select on public.activity_logs to anon;
grant select, insert, update, delete on public.business_profiles to authenticated;
grant select, insert, update, delete on public.customer_balances to authenticated;
grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.payment_history to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert, update on public.whatsapp_reminders to authenticated;
