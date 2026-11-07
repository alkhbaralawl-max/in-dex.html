-- Temporary helper for server-side, read-only legacy Firebase export verification.
-- Keep the extensions schema inaccessible to browser roles; remove the extension after migration.
create extension if not exists http with schema extensions;
