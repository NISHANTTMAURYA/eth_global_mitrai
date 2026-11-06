-- MitrAI private application state. The server connects using DATABASE_URL;
-- this credential must never be exposed to the browser.
create table if not exists characters (
  id text primary key,
  body jsonb not null
);
create table if not exists messages (
  key text primary key,
  body jsonb not null
);
create table if not exists nonces (
  nonce text primary key,
  message text not null,
  expires bigint not null
);
create table if not exists offers (
  id text primary key,
  body jsonb not null
);
create table if not exists sessions (
  token text primary key,
  owner text not null,
  expires bigint not null
);
create table if not exists brain_events (
  id text primary key,
  character_id text not null,
  owner text not null,
  epoch integer not null,
  at bigint not null,
  visibility text not null check (visibility in ('public', 'private')),
  body jsonb not null
);
create index if not exists brain_events_character on brain_events(character_id, at desc);
create table if not exists owner_profiles (
  scope text primary key,
  character_id text not null,
  owner text not null,
  epoch integer not null,
  started_at bigint not null,
  ended_at bigint,
  body jsonb not null
);
create table if not exists conversation_events (
  id text primary key,
  scope text not null,
  at bigint not null,
  body jsonb not null,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(body->>'text', ''))
  ) stored
);
create index if not exists conversation_scope_at on conversation_events(scope, at desc);
create index if not exists conversation_search on conversation_events using gin(search_vector);
create table if not exists private_minds (
  scope text primary key,
  body jsonb not null
);
create table if not exists reach_preferences (
  owner text primary key,
  body jsonb not null
);
create table if not exists proactive_jobs (
  id text primary key,
  scope text not null,
  character_id text not null,
  owner text not null,
  epoch integer not null,
  due_at bigint not null,
  status text not null,
  lease_until bigint not null default 0,
  attempts integer not null default 0,
  body jsonb not null
);
create index if not exists due_proactive_jobs on proactive_jobs(status, due_at);
create index if not exists proactive_scope_status on proactive_jobs(scope, status);
create table if not exists notifications (
  id text primary key,
  owner text not null,
  character_id text not null,
  epoch integer not null,
  created_at bigint not null,
  read_at bigint,
  body jsonb not null
);
create index if not exists notification_owner on notifications(owner, created_at desc);
create table if not exists delivery_outbox (
  id text primary key,
  notification_id text not null,
  channel text not null,
  status text not null,
  lease_until bigint not null default 0,
  attempts integer not null default 0,
  next_at bigint not null,
  body jsonb not null
);
create index if not exists delivery_due on delivery_outbox(status, next_at);
create table if not exists push_subscriptions (
  endpoint text primary key,
  owner text not null,
  body jsonb not null
);
create table if not exists model_claims (
  model text primary key,
  character_id text not null unique,
  owner text not null,
  state text not null,
  expires bigint not null,
  entity_key text
);
create table if not exists community_members (
  character_id text not null,
  wallet text not null,
  joined_at bigint not null,
  primary key (character_id, wallet)
);
create table if not exists community_posts (
  id text primary key,
  character_id text not null,
  wallet text not null,
  body text not null,
  created_at bigint not null
);
create index if not exists community_posts_recent on community_posts(character_id, created_at desc);
