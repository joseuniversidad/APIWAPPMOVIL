-- Activa Realtime en el catálogo: cuando se agrega, edita o borra un lenguaje o framework,
-- la app de todos los usuarios conectados se actualiza al instante.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

do $$
declare
  t text;
begin
  foreach t in array array['languages', 'frameworks'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
