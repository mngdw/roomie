-- =============================================================================
-- ROOMIE · migration 0600 · verification_records (PRIVATE)
--
-- CCCD handling:
--   * the ID number is NEVER stored in plain text and NEVER used for matching;
--   * id_number_hmac  = HMAC-SHA256(server secret, number)  → detects one ID on two accounts;
--   * id_number_last4 = last four digits (only digits ever shown to the owner / admin);
--   * pii_ciphertext  = application-level AES-GCM blob of {full name, DOB, hometown, address};
--   * the document image lives in a private storage bucket and is deleted after review.
-- The public only ever sees profiles.verification_status → "Verified / Not verified".
-- =============================================================================

create table public.verification_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  method          text not null default 'cccd_manual' check (method in ('cccd_manual')),
  status          public.verification_status_t not null default 'pending'
                    check (status in ('pending', 'verified', 'rejected')),
  id_number_hmac  bytea,
  id_number_last4 char(4) check (id_number_last4 ~ '^[0-9]{4}$'),
  pii_ciphertext  bytea,
  document_path   text check (char_length(document_path) <= 300),
  consent_version text not null,
  consent_at      timestamptz not null,
  submitted_at    timestamptz not null default now(),
  reviewed_by     uuid references public.users (id),
  reviewed_at     timestamptz,
  reject_reason   text check (char_length(reject_reason) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((status = 'pending') = (reviewed_at is null))
);
create index verification_records_user_idx   on public.verification_records (user_id, submitted_at desc);
create index verification_records_status_idx on public.verification_records (status, submitted_at);
-- one real-world ID may back only one pending/verified account
create unique index verification_records_unique_id
  on public.verification_records (id_number_hmac)
  where id_number_hmac is not null and status in ('pending', 'verified');
-- a user can have only one open (pending) request at a time
create unique index verification_records_one_pending
  on public.verification_records (user_id) where status = 'pending';

create trigger verification_records_set_updated_at before update on public.verification_records
  for each row execute function public.tg_set_updated_at();
