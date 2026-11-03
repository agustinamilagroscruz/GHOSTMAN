-- Incremento 27 — Perfiles de usuario (HU-35, HU-36; decisiones 61 y 62).
-- Se aplica a mano, en el SQL Editor de cada proyecto (prueba y producción).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Se muestra como se registró; la unicidad no distingue mayúsculas (índice de abajo).
  username text not null check (username ~ '^[A-Za-z0-9]{3,16}$'),
  pacman_skin text not null default 'clasico',
  ghost_skin text not null default 'clasica',
  music_volume smallint not null default 100 check (music_volume between 0 and 100),
  effects_volume smallint not null default 100 check (effects_volume between 0 and 100),
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_key on public.profiles (lower(username));

-- El perfil se crea en la misma transacción que el usuario: si algo falla acá, Supabase deshace
-- el alta entera y no queda una cuenta a medias. El username llega en los metadatos del registro
-- y tiene que corresponder al email sintético <username en minúsculas>@ghostman.invalid.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text := new.raw_user_meta_data ->> 'username';
begin
  if new_username is null or new_username !~ '^[A-Za-z0-9]{3,16}$' then
    raise exception 'username inválido';
  end if;
  if lower(new.email) <> lower(new_username) || '@ghostman.invalid' then
    raise exception 'el email no corresponde al username';
  end if;
  insert into public.profiles (id, username) values (new.id, new_username);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Permisos (decisión 62): con sesión iniciada se leen los usernames; cada usuario modifica solo
-- sus preferencias, nunca su username. Nadie inserta ni borra perfiles directamente.
alter table public.profiles enable row level security;

create policy "Usuarios con sesión leen los perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada usuario modifica sus preferencias"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (pacman_skin, ghost_skin, music_volume, effects_volume) on public.profiles to authenticated;
