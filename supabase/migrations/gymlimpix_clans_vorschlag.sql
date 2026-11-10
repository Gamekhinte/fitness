-- Zufällige Clans zum Entdecken (wie in Clash Royale), nur mit echten, aktiven Spielern und freiem Platz.
-- Bots stehen in wf_bots und sind keine Mitglieder in wf_spieler, tauchen hier also nie auf.
create or replace function wf_clans_vorschlag(p_id uuid, p_geheim text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform wf_pruefen(p_id, p_geheim);
  return coalesce((
    select jsonb_agg(x) from (
      select g.id, g.name, g.code, g.emblem, g.beschreibung,
             count(m.spieler_id)::int as mitglieder,
             count(m.spieler_id) filter (where s.zuletzt > now() - interval '7 days')::int as aktiv
      from wf_gruppen g
      join wf_mitglieder m on m.gruppe_id = g.id
      join wf_spieler s on s.id = m.spieler_id
      where not exists (select 1 from wf_mitglieder me where me.gruppe_id = g.id and me.spieler_id = p_id)
      group by g.id
      having count(m.spieler_id) between 1 and 49
         and max(s.zuletzt) > now() - interval '30 days'
      order by random()
      limit 8
    ) x), '[]'::jsonb);
end $$;
