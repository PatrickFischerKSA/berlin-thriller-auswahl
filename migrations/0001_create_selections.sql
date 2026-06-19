create table if not exists selections (
  id text primary key,
  text_id text not null,
  student_name text not null,
  student_name_norm text not null unique,
  group_name text not null default '',
  is_third_slot integer not null default 0,
  third_slot_approved integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_selections_text_id on selections (text_id);
create index if not exists idx_selections_created_at on selections (created_at);

create trigger if not exists selections_block_fourth_reader
before insert on selections
when (select count(*) from selections where text_id = new.text_id) >= 3
begin
  select raise(abort, 'TEXT_FULL');
end;

create trigger if not exists selections_require_third_slot_approval
before insert on selections
when (select count(*) from selections where text_id = new.text_id) >= 2
  and coalesce(new.third_slot_approved, 0) != 1
begin
  select raise(abort, 'THIRD_SLOT_REQUIRES_APPROVAL');
end;
