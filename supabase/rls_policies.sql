-- =========================================================
-- SMT — Row Level Security (à exécuter après schema.sql)
-- =========================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table companies enable row level security;
alter table company_members enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table stock_items enable row level security;
alter table stock_movements enable row level security;
alter table assets enable row level security;
alter table debts_receivables enable row level security;
alter table subscriptions enable row level security;

-- Lecture seule pour les membres de l'organisation concernée.
-- Aucune policy d'écriture : les insert/update passent exclusivement par
-- la clé service (webhook de paiement CinetPay), qui contourne la RLS.
create policy "subscriptions_select" on subscriptions
  for select using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- Fonction helper : l'utilisateur courant a-t-il accès à ce company_id ?
create function public.has_company_access(target_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from company_members
    where company_id = target_company_id
    and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Profiles : chacun voit et modifie uniquement son propre profil
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- Companies : accessible si membre
create policy "companies_select" on companies
  for select using (public.has_company_access(id));
create policy "companies_insert" on companies
  for insert with check (
    organization_id in (select organization_id from profiles where id = auth.uid())
  );

-- Seul un owner peut modifier les informations de l'entreprise (ex. son nom)
create policy "companies_update" on companies
  for update using (
    exists (
      select 1 from company_members
      where company_id = companies.id
      and user_id = auth.uid()
      and role = 'owner'
    )
  );

-- Company members : visibles par les membres du même dossier
create policy "company_members_select" on company_members
  for select using (public.has_company_access(company_id));

-- Invitations : visibles par les membres du dossier concerné. Les écritures
-- (créer/révoquer/accepter) passent exclusivement par la clé service dans
-- lib/members.ts et members-actions.ts, après contrôle du rôle owner.
alter table company_invitations enable row level security;
create policy "company_invitations_select" on company_invitations
  for select using (public.has_company_access(company_id));

-- Politique générique appliquée à toutes les tables métier :
-- lecture pour tout membre, écriture réservée à owner/comptable
create policy "categories_select" on categories
  for select using (public.has_company_access(company_id));
create policy "categories_write" on categories
  for all using (public.has_company_access(company_id));

create policy "transactions_select" on transactions
  for select using (public.has_company_access(company_id));
create policy "transactions_insert" on transactions
  for insert with check (
    exists (
      select 1 from company_members
      where company_id = transactions.company_id
      and user_id = auth.uid()
      and role in ('owner', 'comptable')
    )
  );
create policy "transactions_update" on transactions
  for update using (
    exists (
      select 1 from company_members
      where company_id = transactions.company_id
      and user_id = auth.uid()
      and role in ('owner', 'comptable')
    )
  );

create policy "transactions_delete" on transactions
  for delete using (
    exists (
      select 1 from company_members
      where company_id = transactions.company_id
      and user_id = auth.uid()
      and role in ('owner', 'comptable')
    )
  );

create policy "stock_items_select" on stock_items
  for select using (public.has_company_access(company_id));
create policy "stock_items_write" on stock_items
  for all using (public.has_company_access(company_id));

create policy "stock_movements_select" on stock_movements
  for select using (public.has_company_access(company_id));
create policy "stock_movements_write" on stock_movements
  for all using (public.has_company_access(company_id));

create policy "assets_select" on assets
  for select using (public.has_company_access(company_id));
create policy "assets_write" on assets
  for all using (public.has_company_access(company_id));

create policy "debts_receivables_select" on debts_receivables
  for select using (public.has_company_access(company_id));
create policy "debts_receivables_write" on debts_receivables
  for all using (public.has_company_access(company_id));

-- Commandes : accès réservé aux membres du dossier.
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "orders_select" on orders
  for select using (public.has_company_access(company_id));
create policy "orders_write" on orders
  for all using (public.has_company_access(company_id));

-- Les lignes héritent de l'accès de leur commande parente.
create policy "order_items_select" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and public.has_company_access(o.company_id)
    )
  );
create policy "order_items_write" on order_items
  for all using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and public.has_company_access(o.company_id)
    )
  );

-- Note : ajustez les policies "_write" ci-dessus si vous voulez distinguer
-- plus finement les droits "viewer" (lecture seule) vs "consultant" (lecture +
-- commentaires) dès la V1 plutôt qu'en V2.
