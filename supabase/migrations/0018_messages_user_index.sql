-- WP-12: "¿espera respuesta?" busca el último mensaje de la persona; con este índice no
-- recorre toda la tabla de mensajes (antes: Seq Scan en cada pasada horaria).
create index if not exists messages_user_role_created_idx on public.messages (user_id, created_at desc) where role = 'user';
