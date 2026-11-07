-- Remove the temporary outbound HTTP client after the one-time legacy data import.
drop extension if exists http;
