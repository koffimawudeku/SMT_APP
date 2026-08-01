-- =========================================================
-- SMT — Schéma initial (à exécuter dans Supabase SQL Editor)
-- =========================================================

create extension if not exists "pgcrypto";

-- Organisations (cabinet, incubateur, ou entrepreneur individuel)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  type varchar(50) check (type in ('individuel', 'cabinet', 'incubateur')) default 'individuel',
  subscription_plan varchar(50) default 'free',
  created_at timestamptz default now()
);

-- Profils utilisateurs (lié à auth.users de Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null,
  full_name varchar(255),
  organization_id uuid references organizations(id),
  is_platform_admin boolean default false,
  created_at timestamptz default now()
);

-- Dossiers / entreprises suivies (multi-dossiers)
create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  name varchar(255) not null,
  sector varchar(100),
  default_currency varchar(3) default 'XOF',
  fiscal_year_start date default date_trunc('year', now()),
  initial_capital decimal(15,2) default 0,
  logo_url text,
  created_at timestamptz default now()
);

-- Rôles d'accès par dossier (base de la RLS multi-tenant)
create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role varchar(50) check (role in ('owner', 'consultant', 'comptable', 'viewer')) not null,
  unique (company_id, user_id)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name varchar(100) not null,
  type varchar(20) check (type in ('recette', 'depense')) not null,
  parent_category_id uuid references categories(id)
);

-- Le cœur : journal des flux
create table transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  category_id uuid references categories(id),
  type varchar(20) check (type in ('recette', 'depense')) not null,
  amount decimal(15,2) not null check (amount > 0),
  currency varchar(3) default 'XOF',
  exchange_rate decimal(10,6) default 1.0,
  payment_method varchar(30) check (payment_method in ('caisse', 'banque', 'mobile_money')) not null,
  transaction_date date not null,
  description text,
  receipt_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Fiche article (référentiel), la quantité n'est plus stockée ici :
-- elle se calcule à partir de stock_movements (voir vue plus bas).
create table stock_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  reference varchar(100),
  name varchar(255) not null,
  unit_cost decimal(15,2),
  reorder_threshold decimal(10,2),
  updated_at timestamptz default now()
);

-- Grand livre des mouvements de stock : Stock Initial, Entrée, Sortie
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  stock_item_id uuid references stock_items(id) on delete cascade,
  type varchar(20) check (type in ('initial', 'entree', 'sortie')) not null,
  quantity decimal(10,2) not null check (quantity >= 0),
  unit_cost decimal(15,2),
  movement_date date not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name varchar(255) not null,
  acquisition_date date not null,
  acquisition_value decimal(15,2) not null,
  useful_life_years decimal(5,2) not null,
  exit_date date,
  exit_price decimal(15,2)
);

create table debts_receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type varchar(20) check (type in ('dette', 'creance')) not null,
  third_party_name varchar(255) not null,
  label varchar(255),
  amount decimal(15,2) not null,
  amount_paid decimal(15,2) default 0,
  due_date date,
  status varchar(20) default 'en_cours' check (status in ('en_cours', 'solde', 'en_retard')),
  linked_transaction_id uuid references transactions(id)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  plan varchar(50) check (plan in ('trial', 'monthly', 'annual')),
  status varchar(20) check (status in ('trialing', 'pending', 'active', 'past_due', 'canceled', 'expired')),
  payment_provider varchar(20),
  external_subscription_id varchar(255),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Invitations de collaborateurs à un dossier (mode cabinet). Un owner
-- invite par email ; si l'invité n'a pas encore de compte, l'invitation
-- reste 'pending' et est consommée automatiquement à sa première
-- connexion (voir lib/members.ts / acceptPendingInvitations).
create table company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade not null,
  email varchar(255) not null,
  role varchar(50) check (role in ('owner', 'consultant', 'comptable', 'viewer')) not null,
  status varchar(20) default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references profiles(id),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  unique (company_id, email)
);

-- Commandes clients (module Gestion de commande)
create table orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade not null,
  client_name varchar(255) not null,
  order_date date not null default current_date,
  delivery_date date,
  status varchar(20) not null default 'devis'
    check (status in ('devis', 'confirmee', 'livree', 'payee', 'annulee')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Lignes d'une commande (articles, quantités, prix unitaires)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  description varchar(255) not null,
  quantity decimal(10,2) not null default 1 check (quantity > 0),
  unit_price decimal(15,2) not null default 0 check (unit_price >= 0)
);

-- Vue : Compte de résultat simplifié, agrégé par mois
create view v_compte_resultat as
select
  company_id,
  date_trunc('month', transaction_date) as periode,
  sum(case when type = 'recette' then amount else 0 end) as total_recettes,
  sum(case when type = 'depense' then amount else 0 end) as total_depenses,
  sum(case when type = 'recette' then amount else -amount end) as resultat_net
from transactions
group by company_id, date_trunc('month', transaction_date);

-- Vue : Solde de trésorerie courant par entreprise
create view v_solde_tresorerie as
select
  company_id,
  sum(case when type = 'recette' then amount else -amount end) as solde
from transactions
group by company_id;

-- Vue : quantité en stock courante par article, dérivée du grand livre
-- des mouvements (Stock Initial + Entrées - Sorties)
create view v_stock_quantities as
select
  stock_item_id,
  sum(case when type = 'sortie' then -quantity else quantity end) as quantity
from stock_movements
group by stock_item_id;

-- Fonction utilitaire : à l'inscription, crée le profil ET provisionne
-- automatiquement une organisation/entreprise dédiée à ce nouvel
-- utilisateur (owner), totalement isolée des autres comptes existants.
--
-- Exception : si une invitation en attente existe déjà pour cet email
-- (collaborateur invité en mode cabinet), on NE crée PAS d'organisation ni
-- de dossier perso. L'utilisateur sera rattaché au dossier partagé à sa
-- première connexion (acceptPendingInvitations), et n'aura donc pas de
-- doublon d'organisation ni d'essai parasite.
create function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  new_company_id uuid;
  company_label text;
  has_pending_invite boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  select exists (
    select 1 from public.company_invitations
    where lower(email) = lower(new.email) and status = 'pending'
  ) into has_pending_invite;

  if has_pending_invite then
    return new;
  end if;

  company_label := coalesce(new.raw_user_meta_data->>'company_name', 'Mon Entreprise');

  insert into organizations (name, type)
  values (company_label, 'individuel')
  returning id into new_org_id;

  update profiles set organization_id = new_org_id where id = new.id;

  insert into companies (organization_id, name)
  values (new_org_id, company_label)
  returning id into new_company_id;

  insert into company_members (company_id, user_id, role)
  values (new_company_id, new.id, 'owner');

  insert into subscriptions (organization_id, plan, status, current_period_end)
  values (new_org_id, 'trial', 'trialing', now() + interval '14 days');

  insert into categories (company_id, name, type) values
    (new_company_id, 'Ventes', 'recette'),
    (new_company_id, 'Autres Recettes', 'recette'),
    (new_company_id, 'Matériel/Mobilier', 'depense'),
    (new_company_id, 'Achat Marchandises', 'depense'),
    (new_company_id, 'Achat Matières/Fourn.', 'depense'),
    (new_company_id, 'Loyer', 'depense'),
    (new_company_id, 'Salaires', 'depense'),
    (new_company_id, 'Eau/Électricité', 'depense'),
    (new_company_id, 'Impôts/Taxes', 'depense'),
    (new_company_id, 'Autres Dépenses', 'depense');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
