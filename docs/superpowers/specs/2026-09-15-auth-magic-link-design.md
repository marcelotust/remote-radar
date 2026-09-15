# Auth: magic link + allowlist de e-mails (#71)

## Goal

Permitir múltiplos usuários (amigos) usando o Remote Radar, com login **sem
senha** (magic link via Supabase Auth Email OTP) e cadastro **controlado**: só
e-mails liberados numa allowlist conseguem entrar. Sem UI de admin no MVP — a
allowlist é mantida manualmente pelo dono do projeto direto no Supabase.

## Schema (`supabase/schema.sql` + `supabase/migrations/0005_allowed_users.sql`)

```sql
create table if not exists allowed_users (
  email      text primary key,
  created_at timestamptz default now()
);

alter table allowed_users enable row level security;
-- Sem policy de select: a tabela nunca é lida direto pelo cliente (nem por
-- anon, nem por authenticated) — só via a função RPC abaixo, que roda com
-- privilégio de dono (security definer) e não expõe a lista inteira.

create or replace function is_email_allowed(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_users where email = lower(check_email)
  );
$$;

grant execute on function is_email_allowed(text) to anon, authenticated;
```

Emails são sempre comparados em lowercase. Adicionar alguém = `insert into
allowed_users (email) values ('amigo@example.com');` no SQL editor do Supabase.

## Fluxo de login

1. `/login`: usuário digita o e-mail.
2. App chama `supabase.rpc('is_email_allowed', { check_email: email })`.
3. Se `false` → mensagem "esse e-mail ainda não foi liberado, peça pro
   administrador te adicionar".
4. Se `true` → `supabase.auth.signInWithOtp({ email })` → mensagem "verifique
   seu e-mail" (o link do Supabase cria a sessão via `detectSessionInUrl`,
   habilitado por padrão no client).
5. `AuthProvider` (via `getSession` + `onAuthStateChange`) atualiza o contexto
   assim que a sessão existir; `RequireAuth` deixa de redirecionar.

## Componentes/hooks novos

- `src/contexts/AuthContext.tsx` — `AuthProvider` + `useAuth()`, expõe
  `{ session, user, loading, signOut }`.
- `src/components/RequireAuth/RequireAuth.tsx` — rota-guarda: sem sessão (e não
  carregando) → `<Navigate to="/login" replace />`; senão `<Outlet />`.
- `src/pages/LoginPage.tsx` — formulário de e-mail; usa `useAuth` só pra
  redirecionar se já houver sessão.
- `NavBar`: novo botão "Sair" (chama `useAuth().signOut()`), visível só quando
  há sessão.

## `App.tsx` — nova estrutura de rotas

```
AuthProvider → QueryClientProvider → UIProvider → BrowserRouter
  /login              → LoginPage (pública)
  RequireAuth
    Layout (NavBar + Outlet)
      /, /inbox, /companies, /scraping-sources, /settings
```

## Fake do Supabase (testes)

`src/lib/__mocks__/supabase.ts` ganha:

- `supabase.auth.getSession()`, `onAuthStateChange(cb)`, `signInWithOtp()`,
  `signOut()`, apoiados por um estado de sessão em memória.
- `supabase.rpc('is_email_allowed', { check_email })`, resolvendo contra
  `MOCK_ALLOWED_USERS` (novo seed em `mockData.ts`).
- Helper de teste `__setSupabaseSession(session)` para simular login em specs
  de `AuthContext`/`RequireAuth`/`NavBar`.

## Fora de escopo

- UI de administração da allowlist.
- RLS `authenticated` nas demais tabelas (issue #72, próxima).
