-- Etapa 3 — Limpieza de los tableros del proyecto de Supabase de PRUEBA (sección 9.2 de entrega-03.md).
-- SOLO en el proyecto de prueba (gstpskqyurpiansmtbtr), nunca en producción. Se corre en el SQL Editor.
--
-- Deja los dos tableros vacíos para cargar DP-1 a DP-3 con cargar_datos_prueba.js:
--   1. Borra los usuarios que crean las suites de navegador (v27…, v28…, v29…) y los de los datos de
--      prueba (tpac…, tgho…). El borrado sigue en cascada a profiles y best_scores.
--   2. Borra los puntajes que quedan (el usuario de prueba y los usuarios cp… de la ejecución manual),
--      sin borrar sus cuentas.
-- Se puede repetir: es el procedimiento para restaurar los tableros durante la etapa 4.

begin;

delete from auth.users
  where email ~ '^(v2[789]|tpac|tgho)[a-z0-9]*@ghostman\.invalid$';

delete from public.best_scores;

commit;

-- Comprobación: tiene que devolver 0 en los dos modos.
select m.mode, count(s.user_id) as puntajes
  from (values ('pacman'), ('ghostman')) as m (mode)
  left join public.best_scores s on s.mode = m.mode
  group by m.mode;
