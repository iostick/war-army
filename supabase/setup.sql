-- War Army: tablas y permisos para sincronizar listas, colección, partidas y fotos.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run.

create table if not exists public.items (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  store text not null,          -- rosters | collection | games
  key text not null,            -- id del elemento
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, key)
);

create index if not exists items_updated on public.items (user_id, updated_at);

alter table public.items enable row level security;

drop policy if exists "Cada usuario ve solo lo suyo" on public.items;
create policy "Cada usuario ve solo lo suyo" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fotos (privadas): cada usuario solo puede leer y escribir en su carpeta
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

drop policy if exists "Fotos: leer las mias" on storage.objects;
create policy "Fotos: leer las mias" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fotos: subir las mias" on storage.objects;
create policy "Fotos: subir las mias" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fotos: cambiar las mias" on storage.objects;
create policy "Fotos: cambiar las mias" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fotos: borrar las mias" on storage.objects;
create policy "Fotos: borrar las mias" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
