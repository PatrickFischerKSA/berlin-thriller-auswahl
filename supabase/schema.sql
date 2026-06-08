create extension if not exists pgcrypto;

create table if not exists public.selections (
  id uuid primary key default gen_random_uuid(),
  text_id text not null,
  student_name text not null,
  student_name_norm text not null unique,
  group_name text not null default '',
  is_third_slot boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.selections enable row level security;

revoke all on table public.selections from anon, authenticated;
grant select, insert on table public.selections to service_role;

create or replace function public.create_selection(
  p_text_id text,
  p_student_name text,
  p_group_name text default '',
  p_third_slot_approved boolean default false
)
returns table (
  id uuid,
  text_id text,
  student_name text,
  group_name text,
  is_third_slot boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_student_name text;
  v_student_name_norm text;
  v_group_name text;
  v_inserted public.selections%rowtype;
begin
  v_student_name := btrim(regexp_replace(coalesce(p_student_name, ''), '\s+', ' ', 'g'));
  v_student_name_norm := lower(v_student_name);
  v_group_name := btrim(regexp_replace(coalesce(p_group_name, ''), '\s+', ' ', 'g'));

  if char_length(v_student_name) < 2 then
    raise exception 'Bitte gib deinen Namen an.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_text_id));

  if exists (
    select 1 from public.selections where student_name_norm = v_student_name_norm
  ) then
    raise exception 'Für diesen Namen gibt es bereits einen Eintrag. Bestehende Einträge werden nicht überschrieben.';
  end if;

  select count(*)
    into v_count
    from public.selections
    where selections.text_id = p_text_id;

  if v_count >= 3 then
    raise exception 'Dieser Text ist bereits voll belegt.';
  end if;

  if v_count >= 2 and not coalesce(p_third_slot_approved, false) then
    raise exception 'Der dritte Platz ist nur nach Absprache gedacht. Bitte bestätige die Absprache.';
  end if;

  insert into public.selections (
    text_id,
    student_name,
    student_name_norm,
    group_name,
    is_third_slot
  )
  values (
    p_text_id,
    v_student_name,
    v_student_name_norm,
    v_group_name,
    v_count >= 2
  )
  returning * into v_inserted;

  return query
    select
      v_inserted.id,
      v_inserted.text_id,
      v_inserted.student_name,
      v_inserted.group_name,
      v_inserted.is_third_slot,
      v_inserted.created_at;
end;
$$;

revoke all on function public.create_selection(text, text, text, boolean) from anon, authenticated;
grant execute on function public.create_selection(text, text, text, boolean) to service_role;
