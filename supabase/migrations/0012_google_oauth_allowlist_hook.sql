-- Login via Google (#100): reforça a allowlist no banco pra qualquer método
-- de login (magic link ou Google), não só o RPC client-side. Necessário
-- porque no fluxo OAuth a conta é criada só depois do redirect do Google
-- voltar, sem chance de checar antes como dá pra fazer com o magic link.
--
-- Depois de rodar esta migration, ative em:
-- Supabase Dashboard → Authentication → Hooks → "Before User Created" →
-- selecione a função hook_restrict_signup_to_allowlist.

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
