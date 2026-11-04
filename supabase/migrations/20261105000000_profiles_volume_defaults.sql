-- Incremento 29 — Volúmenes por defecto (HU-41): los del motor de audio del incremento 25, 60 la
-- música y 80 los efectos. Los perfiles que nunca cambiaron el volumen pasan a esos valores.
-- Se aplica a mano, en el SQL Editor de cada proyecto (prueba y producción).

alter table public.profiles alter column music_volume set default 60;
alter table public.profiles alter column effects_volume set default 80;

update public.profiles set music_volume = 60 where music_volume = 100;
update public.profiles set effects_volume = 80 where effects_volume = 100;
