-- Allow decimal hosting fees (e.g. 9.99). Production may have had INTEGER columns
-- that reject values like 9.99 with: invalid input syntax for type integer: "9.99"
ALTER TABLE public.clients
  ALTER COLUMN one_time_amount TYPE NUMERIC USING one_time_amount::numeric,
  ALTER COLUMN monthly_amount TYPE NUMERIC USING monthly_amount::numeric;
