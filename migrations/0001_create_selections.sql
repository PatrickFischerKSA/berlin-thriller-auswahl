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
