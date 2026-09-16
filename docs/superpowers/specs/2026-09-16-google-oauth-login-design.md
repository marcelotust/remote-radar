# Login via Google (#100)

## Goal

Sem SMTP customizado, o serviço padrão de e-mail do Supabase só entrega
mensagem pra quem já é membro da organização do projeto — magic link nunca
chega pros amigos (ver #99). Login via Google não depende de e-mail sendo
enviado pelo Supabase, então resolve isso sem precisar de domínio próprio nem
SMTP.

## Enforcement da allowlist (as duas camadas)

1. **Client-side (já existia pro magic link):** `LoginPage` chama a RPC
   `is_email_allowed` antes de disparar o login — pro Google, não dá pra
   checar antes, já que o clique já redireciona pro consentimento do Google
   sem digitar e-mail primeiro.
2. **Server-side (novo, cobre os dois métodos):** um Auth Hook
   `before-user-created` no Postgres — `hook_restrict_signup_to_allowlist` —
   roda **antes** de qualquer usuário novo ser criado, seja por magic link ou
   Google, e reusa a mesma `is_email_allowed`. Se o e-mail não estiver na
   allowlist, a criação é rejeitada com erro 403 e o Supabase nunca chega a
   criar a conta.

Isso fecha a brecha que existiria com checagem só no client: no fluxo OAuth,
o Supabase cria a conta _depois_ do redirect do Google retornar — sem o hook,
um estranho com conta Google teria uma sessão válida por um instante antes de
eu conseguir barrar no client.

## Schema

```sql
create or replace function hook_restrict_signup_to_allowlist(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  user_email := event->'user'->>'email';
  if is_email_allowed(user_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Esse e-mail ainda não foi liberado. Peça para o administrador te adicionar.'
    )
  );
end;
$$;

grant execute on function hook_restrict_signup_to_allowlist(jsonb) to supabase_auth_admin;
revoke execute on function hook_restrict_signup_to_allowlist(jsonb) from authenticated, anon, public;
```

## Front-end

- `LoginPage`: novo botão "Continuar com Google" → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- Ao voltar do redirect do Google com uma rejeição do hook, o Supabase anexa
  `error`/`error_description` na URL (hash ou query). `LoginPage` lê isso no
  mount e mostra a mesma mensagem de "não liberado", limpando a URL depois
  (`history.replaceState`) pra não reaparecer num refresh.

## Passos manuais no Supabase (fora do meu alcance — sem ferramenta pra isso)

1. Google Cloud Console: criar OAuth Client ID (tipo "Web application"),
   authorized redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → Google: colar Client ID
   - Client Secret, habilitar.
3. Supabase Dashboard → Authentication → Hooks → "Before User Created" →
   selecionar a função `hook_restrict_signup_to_allowlist`.

## Fora de escopo

Não removi o magic link — os dois métodos convivem. O hook cobre os dois.
