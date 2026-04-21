do $$ begin
  create type public.user_role as enum ('MEMBER', 'ADMIN', 'SUPER_ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_status as enum ('PENDING', 'ACTIVE', 'REJECTED');
exception when duplicate_object then null;
end $$;

create table if not exists public.guild_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  description text not null,
  discord_invite text,
  updated_at timestamptz not null default now()
);

create table if not exists public.build_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  color text not null default '#94a3b8',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.build_options
  add column if not exists color text not null default '#94a3b8';

-- one-time migration from old guild_settings.build_options jsonb (if present)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guild_settings'
      and column_name = 'build_options'
  ) then
    insert into public.build_options (label, sort_order)
    select distinct value, (ordinality - 1)::int
    from public.guild_settings gs,
         jsonb_array_elements_text(gs.build_options) with ordinality as j(value, ordinality)
    on conflict (label) do nothing;
  end if;
end $$;

insert into public.build_options (label, color, sort_order)
values
  ('Duo-Chain', '#94a3b8', 0),
  ('Fan-Tang', '#94a3b8', 1),
  ('Fan-Um', '#94a3b8', 2),
  ('HEAL', '#22c55e', 3),
  ('Nameless', '#94a3b8', 4),
  ('Strategic', '#94a3b8', 5),
  ('TangDao', '#94a3b8', 6),
  ('TANK', '#fb923c', 7),
  ('Um-Chain', '#94a3b8', 8)
on conflict (label) do nothing;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  username text not null,
  avatar text,
  role public.user_role not null default 'MEMBER',
  status public.user_status not null default 'PENDING',
  character_name text,
  build text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guild_war_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day_id date,
  week_id date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day_id)
);

create table if not exists public.guild_war_registration_windows (
  id uuid primary key default gen_random_uuid(),
  day_id date not null unique,
  week_id date not null,
  is_open boolean not null default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guild_war_registration_windows_day_weekend_check
    check (extract(isodow from day_id) in (6, 7))
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  week_id date not null,
  day_id date,
  registration_window_id uuid references public.guild_war_registration_windows(id) on delete set null,
  name text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  unique (team_id, user_id)
);

create table if not exists public.map_strategies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  plan_date date not null,
  data jsonb not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guild_war_registrations
  add column if not exists day_id date;

alter table public.teams
  add column if not exists day_id date,
  add column if not exists registration_window_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_registration_window_id_fkey'
  ) then
    alter table public.teams
      add constraint teams_registration_window_id_fkey
      foreign key (registration_window_id)
      references public.guild_war_registration_windows(id)
      on delete set null;
  end if;
end $$;

alter table public.guild_war_registrations
  drop constraint if exists guild_war_registrations_user_id_week_id_key;

create unique index if not exists idx_gwr_unique_user_day
  on public.guild_war_registrations(user_id, day_id)
  where day_id is not null;

create unique index if not exists idx_gwrw_single_open
  on public.guild_war_registration_windows(is_open)
  where is_open = true;

create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_reg_week on public.guild_war_registrations(week_id);
create index if not exists idx_reg_day on public.guild_war_registrations(day_id);
create index if not exists idx_windows_day on public.guild_war_registration_windows(day_id);
create index if not exists idx_windows_week on public.guild_war_registration_windows(week_id);
create index if not exists idx_teams_week on public.teams(week_id);
create index if not exists idx_teams_day on public.teams(day_id);

-- ============================================================
-- TRIGGER: auto-create user profile row on Discord signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, discord_id, username, avatar)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'preferred_username',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HELPER: get current auth user's role from users table
-- ============================================================
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
as $$
  select coalesce(
    (select role from public.users where id = auth.uid()),
    'MEMBER'::public.user_role
  )
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.guild_settings                    enable row level security;
alter table public.build_options                     enable row level security;
alter table public.users                             enable row level security;
alter table public.guild_war_registrations           enable row level security;
alter table public.guild_war_registration_windows    enable row level security;
alter table public.teams                             enable row level security;
alter table public.team_members                      enable row level security;
alter table public.map_strategies                    enable row level security;

-- ---- build_options ----
drop policy if exists "Public can read build options" on public.build_options;
create policy "Public can read build options"
  on public.build_options for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert build options" on public.build_options;
create policy "Admins can insert build options"
  on public.build_options for insert
  to authenticated
  with check (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can update build options" on public.build_options;
create policy "Admins can update build options"
  on public.build_options for update
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can delete build options" on public.build_options;
create policy "Admins can delete build options"
  on public.build_options for delete
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

-- ---- guild_settings ----
drop policy if exists "Public can read guild settings" on public.guild_settings;
create policy "Public can read guild settings"
  on public.guild_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert guild settings" on public.guild_settings;
create policy "Admins can insert guild settings"
  on public.guild_settings for insert
  to authenticated
  with check (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can update guild settings" on public.guild_settings;
create policy "Admins can update guild settings"
  on public.guild_settings for update
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

-- ---- users ----
drop policy if exists "Users can view own profile; admins can view all" on public.users;
create policy "Users can view own profile; admins can view all"
  on public.users for select
  to authenticated
  using (
    id = auth.uid() or
    public.current_user_role() in ('ADMIN', 'SUPER_ADMIN')
  );

drop policy if exists "User can insert own row" on public.users;
create policy "User can insert own row"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "User can update own non-role fields" on public.users;
create policy "User can update own non-role fields"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid() and
    role = (select role from public.users where id = auth.uid())
  );

drop policy if exists "Admins can update any user" on public.users;
create policy "Admins can update any user"
  on public.users for update
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Super admins can delete users" on public.users;
create policy "Super admins can delete users"
  on public.users for delete
  to authenticated
  using (public.current_user_role() = 'SUPER_ADMIN');

-- ---- guild_war_registration_windows ----
drop policy if exists "Authenticated users can view war windows" on public.guild_war_registration_windows;
create policy "Authenticated users can view war windows"
  on public.guild_war_registration_windows for select
  to authenticated
  using (true);

drop policy if exists "Admins can create war windows" on public.guild_war_registration_windows;
create policy "Admins can create war windows"
  on public.guild_war_registration_windows for insert
  to authenticated
  with check (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can update war windows" on public.guild_war_registration_windows;
create policy "Admins can update war windows"
  on public.guild_war_registration_windows for update
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can delete war windows" on public.guild_war_registration_windows;
create policy "Admins can delete war windows"
  on public.guild_war_registration_windows for delete
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

-- ---- guild_war_registrations ----
drop policy if exists "Members see own registrations; admins see all" on public.guild_war_registrations;
create policy "Members see own registrations; admins see all"
  on public.guild_war_registrations for select
  to authenticated
  using (
    user_id = auth.uid() or
    public.current_user_role() in ('ADMIN', 'SUPER_ADMIN')
  );

drop policy if exists "Active members can register" on public.guild_war_registrations;
create policy "Active members can register"
  on public.guild_war_registrations for insert
  to authenticated
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and status = 'ACTIVE'
    )
  );

drop policy if exists "Members can cancel own; admins can cancel any" on public.guild_war_registrations;
create policy "Members can cancel own; admins can cancel any"
  on public.guild_war_registrations for delete
  to authenticated
  using (
    user_id = auth.uid() or
    public.current_user_role() in ('ADMIN', 'SUPER_ADMIN')
  );

-- ---- teams ----
drop policy if exists "Authenticated users can view teams" on public.teams;
create policy "Authenticated users can view teams"
  on public.teams for select
  to authenticated
  using (true);

drop policy if exists "Admins can create teams" on public.teams;
create policy "Admins can create teams"
  on public.teams for insert
  to authenticated
  with check (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can update teams" on public.teams;
create policy "Admins can update teams"
  on public.teams for update
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can delete teams" on public.teams;
create policy "Admins can delete teams"
  on public.teams for delete
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

-- ---- team_members ----
drop policy if exists "Authenticated users can view team members" on public.team_members;
create policy "Authenticated users can view team members"
  on public.team_members for select
  to authenticated
  using (true);

drop policy if exists "Admins can add team members" on public.team_members;
create policy "Admins can add team members"
  on public.team_members for insert
  to authenticated
  with check (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists "Admins can remove team members" on public.team_members;
create policy "Admins can remove team members"
  on public.team_members for delete
  to authenticated
  using (public.current_user_role() in ('ADMIN', 'SUPER_ADMIN'));

-- ---- map_strategies ----
drop policy if exists "Authenticated users can view strategies" on public.map_strategies;
create policy "Authenticated users can view strategies"
  on public.map_strategies for select
  to authenticated
  using (true);

drop policy if exists "Active members can create strategies" on public.map_strategies;
create policy "Active members can create strategies"
  on public.map_strategies for insert
  to authenticated
  with check (
    created_by = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and status = 'ACTIVE'
    )
  );

drop policy if exists "Creator or admin can update strategy" on public.map_strategies;
create policy "Creator or admin can update strategy"
  on public.map_strategies for update
  to authenticated
  using (
    created_by = auth.uid() or
    public.current_user_role() in ('ADMIN', 'SUPER_ADMIN')
  );

drop policy if exists "Creator or admin can delete strategy" on public.map_strategies;
create policy "Creator or admin can delete strategy"
  on public.map_strategies for delete
  to authenticated
  using (
    created_by = auth.uid() or
    public.current_user_role() in ('ADMIN', 'SUPER_ADMIN')
  );