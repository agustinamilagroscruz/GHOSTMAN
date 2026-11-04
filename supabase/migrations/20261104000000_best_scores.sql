-- Incremento 28 — Mejores puntajes (HU-38, HU-39; decisiones 62, 63 y 74).
-- Se aplica a mano, en el SQL Editor de cada proyecto (prueba y producción), después de la de profiles.

create table public.best_scores (
  -- Referencia a profiles para que el tablero pueda traer el username en la misma consulta.
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('pacman', 'ghostman')),
  score integer not null check (score >= 0),
  achieved_at timestamptz not null default now(),
  primary key (user_id, mode)
);

-- Orden del tablero global: mayor puntaje primero y, en un empate, el que se logró antes.
create index best_scores_board_idx on public.best_scores (mode, score desc, achieved_at asc);

-- Única forma de registrar un puntaje (decisión 63). Toma al usuario de la sesión, valida el modo y
-- el máximo de cada modo (decisión 74) y actualiza solo si supera el mejor personal: un empate no
-- cambia la fila, así conserva la fecha en que se logró primero.
create function public.submit_score(p_mode text, p_score integer)
returns table (best integer, improved boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_max integer;
  v_previous integer;
begin
  if v_user is null then
    raise exception 'sesión requerida' using errcode = '42501';
  end if;
  v_max := case p_mode when 'pacman' then 50000 when 'ghostman' then 12480 end;
  if v_max is null then
    raise exception 'modo inválido' using errcode = '22023';
  end if;
  if p_score is null or p_score < 0 or p_score > v_max then
    raise exception 'puntaje fuera de rango' using errcode = '22023';
  end if;

  select s.score into v_previous
    from public.best_scores s
    where s.user_id = v_user and s.mode = p_mode
    for update;

  if v_previous is null then
    insert into public.best_scores (user_id, mode, score) values (v_user, p_mode, p_score);
    return query select p_score, true;
  elsif p_score > v_previous then
    update public.best_scores s
      set score = p_score, achieved_at = now()
      where s.user_id = v_user and s.mode = p_mode;
    return query select p_score, true;
  else
    return query select v_previous, false;
  end if;
end;
$$;

-- Permisos (decisión 62): con sesión iniciada se leen los tableros; nadie escribe directamente.
alter table public.best_scores enable row level security;

create policy "Usuarios con sesión leen los tableros"
  on public.best_scores for select
  to authenticated
  using (true);

revoke all on public.best_scores from anon, authenticated;
grant select on public.best_scores to authenticated;

revoke all on function public.submit_score(text, integer) from public, anon;
grant execute on function public.submit_score(text, integer) to authenticated;
