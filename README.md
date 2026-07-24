# SMT — Système Minimal de Trésorerie

Starter Next.js 14 (App Router) + Supabase pour le projet SMT.

## Ce qui est déjà en place

- Structure App Router avec routes protégées (`/dashboard`, `/saisie`) et route publique (`/login`)
- Clients Supabase (navigateur + serveur) via `@supabase/ssr`
- Middleware d'authentification (redirige vers `/login` si non connecté)
- Schéma SQL complet (`supabase/schema.sql`) : organizations, companies, transactions, stocks, dettes/créances, abonnements
- Politiques RLS multi-tenant (`supabase/rls_policies.sql`) basées sur `company_members`
- Validation Zod pour la saisie de flux (`lib/validations/transaction.ts`)
- Une Server Action d'exemple pour créer une transaction (`app/(dashboard)/saisie/actions.ts`)
- Page dashboard (Server Component) qui lit le solde et le résultat du mois depuis les vues SQL
- Page de connexion fonctionnelle (email/mot de passe)

## Installation

### 1. Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un nouveau projet (région **Europe/Frankfurt** recommandée pour la latence Afrique de l'Ouest).
2. Dans **SQL Editor**, exécutez dans l'ordre :
   - `supabase/schema.sql`
   - `supabase/rls_policies.sql`
3. Dans **Authentication > Providers**, activez Email/Password.
4. Récupérez l'URL et la clé anon dans **Project Settings > API**.

### 2. Configurer le projet local

```bash
npm install
cp .env.local.example .env.local
# Remplissez .env.local avec vos valeurs Supabase
```

### 3. Créer vos premières données de test

Dans le SQL Editor de Supabase, après avoir créé un utilisateur via l'interface d'auth (ou l'app) :

```sql
-- Créer une organisation et un dossier de test
insert into organizations (name, type) values ('Mon Organisation', 'individuel') returning id;
-- Copiez l'id retourné, puis :
insert into companies (organization_id, name) values ('<org_id>', 'Ma Première Entreprise') returning id;
-- Puis rattachez votre utilisateur comme owner :
insert into company_members (company_id, user_id, role)
values ('<company_id>', '<votre_user_id>', 'owner');
```

Votre `user_id` se trouve dans **Authentication > Users** dans le dashboard Supabase.

### 4. Lancer le projet

```bash
npm run dev
```

Ouvrez [http://localhost:3000/login](http://localhost:3000/login).

## Mise à jour importante des policies RLS

Si votre base a été créée avant cette version, exécutez à nouveau
`supabase/rls_policies.sql` dans le SQL Editor. Deux ajouts récents :
- `companies_update` — permet à un `owner` de modifier le nom de son
  entreprise depuis `/parametres`.
- `transactions_delete` — permet à un `owner`/`comptable` de supprimer
  une transaction depuis `/journal`. Sans elle, le bouton "Supprimer"
  échoue silencieusement.

## Migration : colonne "label" sur debts_receivables

Si votre table `debts_receivables` existait déjà avant cette version,
ajoutez la colonne manquante dans le SQL Editor :

```sql
alter table debts_receivables add column if not exists label varchar(255);
```

Sans cette colonne, le champ "Libellé" du formulaire Dettes & créances
échouera à l'enregistrement.

## Migration : refonte du modèle de Stocks (mouvements)

Si votre table `stock_items` existait déjà (avec une colonne `quantity`),
cette version la remplace par un **grand livre de mouvements**
(`stock_movements`) : Stock Initial, Entrée, Sortie. La quantité n'est plus
stockée directement, elle est recalculée via la vue `v_stock_quantities`.

Exécutez ceci dans le SQL Editor (attention, la première ligne supprime
les données existantes de `stock_items` si vous en aviez créé en test) :

```sql
drop table if exists stock_items cascade;

create table stock_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  reference varchar(100),
  name varchar(255) not null,
  unit_cost decimal(15,2),
  reorder_threshold decimal(10,2),
  updated_at timestamptz default now()
);

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

create view v_stock_quantities as
select
  stock_item_id,
  sum(case when type = 'sortie' then -quantity else quantity end) as quantity
from stock_movements
group by stock_item_id;

alter table stock_items enable row level security;
alter table stock_movements enable row level security;

create policy "stock_items_select" on stock_items
  for select using (public.has_company_access(company_id));
create policy "stock_items_write" on stock_items
  for all using (public.has_company_access(company_id));

create policy "stock_movements_select" on stock_movements
  for select using (public.has_company_access(company_id));
create policy "stock_movements_write" on stock_movements
  for all using (public.has_company_access(company_id));
```

## Migration : auto-inscription avec entreprise séparée

Cette version automatise ce que vous faisiez à la main via SQL : à
l'inscription (`/signup`), chaque nouvel utilisateur reçoit désormais sa
propre organisation et sa propre entreprise, avec le rôle `owner` et les 10
catégories standard déjà créées — totalement isolées des autres comptes
(y compris du vôtre) grâce aux policies RLS déjà en place.

Si votre base existait déjà, remplacez la fonction `handle_new_user` dans le
SQL Editor :

```sql
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  new_company_id uuid;
  company_label text;
begin
  company_label := coalesce(new.raw_user_meta_data->>'company_name', 'Mon Entreprise');

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  insert into organizations (name, type)
  values (company_label, 'individuel')
  returning id into new_org_id;

  update profiles set organization_id = new_org_id where id = new.id;

  insert into companies (organization_id, name)
  values (new_org_id, company_label)
  returning id into new_company_id;

  insert into company_members (company_id, user_id, role)
  values (new_company_id, new.id, 'owner');

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
```

Cette fonction ne s'exécute que pour les **futurs** comptes créés via
`/signup` — elle ne modifie rien pour les comptes déjà existants.

## Pages disponibles

- `/signup` — inscription libre ; crée automatiquement une entreprise dédiée et isolée pour chaque nouveau compte
- `/login` — connexion (avec lien vers l'inscription)
- `/dashboard` — KPIs, courbe d'évolution du solde de trésorerie
- `/saisie` — saisie de flux (recette/dépense, Caisse ou Banque)
- `/journal` — journal Caisse/Banque filtrable par **exercice comptable**, avec report à nouveau (soldes d'ouverture), ventilations, soldes courants séparés, totaux en pied de tableau, **export CSV** (compatible Excel) et impression PDF ; modification/suppression par ligne
- `/compte-resultat` — compte de résultat comparatif N/N-1, sélecteur d'exercice, impression PDF
- `/bilan` — bilan patrimonial arrêté à la date de clôture de l'exercice sélectionné, avec **report à nouveau** des résultats antérieurs (équilibre multi-exercices), impression PDF
- `/ratios` — ratios financiers calculés sur l'exercice sélectionné, impression PDF
- `/dettes-creances` — suivi des créances/dettes avec libellé et synthèse des totaux/réglé/solde
- `/stocks` — État global : tableau récapitulatif de tous les articles
- `/stocks/saisie` — Stock Input : Stock Initial, Entrée, Sortie, création d'article à la volée
- `/stocks/par-article` — Stock par article : historique filtrable par période, modification/suppression
- `/parametres` — modification du nom de l'entreprise (réservé au rôle `owner`)

## Déploiement (GitHub + Vercel)

Ce projet est déjà initialisé en dépôt Git local (`git init` + premier commit
fait). Il ne reste qu'à le pousser sur GitHub puis à l'importer dans Vercel.

### 1. Créer le dépôt sur GitHub

1. Allez sur [github.com/new](https://github.com/new).
2. Donnez un nom au dépôt (ex. `smt-app`), laissez-le vide (pas de README,
   pas de .gitignore — ce projet en a déjà un), et créez-le.
3. GitHub affiche une URL du type `https://github.com/votre-compte/smt-app.git`.

### 2. Pousser le code

Dans le dossier `smt-app` en local :

```bash
git remote add origin https://github.com/votre-compte/smt-app.git
git branch -M main
git push -u origin main
```

### 3. Importer le projet dans Vercel

1. Allez sur [vercel.com/new](https://vercel.com/new) et connectez-vous avec
   votre compte GitHub.
2. Sélectionnez le dépôt `smt-app` que vous venez de pousser.
3. Vercel détecte automatiquement Next.js — aucun réglage de build à changer.
4. Avant de cliquer sur Deploy, ouvrez **Environment Variables** et ajoutez
   les mêmes valeurs que dans votre `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Cliquez sur **Deploy**. Après 1 à 2 minutes, Vercel vous donne une URL du
   type `smt-app-xxxx.vercel.app`.

### 4. Autoriser cette URL dans Supabase

Dans le dashboard Supabase, allez dans **Authentication > URL Configuration**
et ajoutez l'URL Vercel (celle en `https://...vercel.app`) dans **Site URL**
et dans **Redirect URLs**. Sans ça, la connexion/inscription échouera une
fois déployé, même si tout fonctionne en local.

### Mises à jour suivantes

Chaque `git push` sur la branche `main` redéploie automatiquement le site
sur Vercel — aucune action manuelle supplémentaire n'est nécessaire.

## Prochaines étapes suggérées

1. Ajouter un sélecteur de dossier actif (pour le mode multi-dossiers / cabinet) stocké en cookie ou en state.
2. Construire le formulaire de saisie complet (`/saisie`) en connectant `createTransaction` à un `<form action={...}>`.
3. Ajouter shadcn/ui : `npx shadcn-ui@latest init` pour accélérer la construction des composants.
4. Brancher Recharts sur le dashboard pour le graphique d'évolution.
5. Ajouter les tables `exchange_rates` et la logique multi-devises (V2 de la roadmap).

## Structure du projet

```
smt-app/
├── app/
│   ├── (auth)/login/          Route publique de connexion
│   ├── (dashboard)/
│   │   ├── dashboard/         KPIs et vue d'ensemble
│   │   └── saisie/            Saisie de flux + Server Action
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase/               Clients navigateur + serveur
│   └── validations/             Schémas Zod
├── supabase/
│   ├── schema.sql               Tables + vues SQL
│   └── rls_policies.sql         Politiques de sécurité multi-tenant
└── middleware.ts                 Protection des routes
```
