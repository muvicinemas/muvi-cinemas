-- generate_ulid() returns UUID-compatible output
-- ULID contains 128 bits (same as UUID), we generate the binary and cast to UUID
DROP FUNCTION IF EXISTS generate_ulid();
CREATE OR REPLACE FUNCTION generate_ulid() RETURNS uuid AS $$
DECLARE
  unix_time  BIGINT;
  ts_bytes   BYTEA;
  ulid_bytes BYTEA;
BEGIN
  unix_time = (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;

  -- 6 bytes of millisecond timestamp
  ts_bytes = SET_BYTE(E'\\x000000000000'::bytea, 0, (unix_time >> 40)::INT & 255);
  ts_bytes = SET_BYTE(ts_bytes, 1, (unix_time >> 32)::INT & 255);
  ts_bytes = SET_BYTE(ts_bytes, 2, (unix_time >> 24)::INT & 255);
  ts_bytes = SET_BYTE(ts_bytes, 3, (unix_time >> 16)::INT & 255);
  ts_bytes = SET_BYTE(ts_bytes, 4, (unix_time >> 8)::INT & 255);
  ts_bytes = SET_BYTE(ts_bytes, 5, unix_time::INT & 255);

  -- 10 bytes of randomness
  ulid_bytes = ts_bytes || gen_random_bytes(10);

  -- Cast 16-byte hex to UUID
  RETURN ENCODE(ulid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
