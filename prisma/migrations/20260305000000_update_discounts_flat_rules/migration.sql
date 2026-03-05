-- Update flat discount rules (March 2026)
-- - Ensure current % discounts per outlet
-- - Keep existing Eat & Drink @127/128 offers
-- - Remove any stale discounts for hidden/no-discount outlets

DO $$
DECLARE
  v_kiik69_id   TEXT;
  v_skyhy_id    TEXT;
  v_alehouse_id TEXT;
  v_c53_id      TEXT;
  v_boiler_id   TEXT;
  v_sos_id      TEXT;
BEGIN
  -- Look up venue IDs
  SELECT id INTO v_kiik69_id   FROM "Venue" WHERE "brandId" = 'kiik69';
  SELECT id INTO v_skyhy_id    FROM "Venue" WHERE "brandId" = 'skyhy';
  SELECT id INTO v_alehouse_id FROM "Venue" WHERE "brandId" = 'alehouse';
  SELECT id INTO v_c53_id      FROM "Venue" WHERE "brandId" = 'c53';
  SELECT id INTO v_boiler_id   FROM "Venue" WHERE "brandId" = 'boiler-room';
  SELECT id INTO v_sos_id      FROM "Venue" WHERE "brandId" = 'sound-of-soul';

  -- 1) Wipe existing discounts for these brands (and brands that should have NO discounts)
  DELETE FROM "Discount"
  WHERE "venueId" IN (
    SELECT id FROM "Venue" WHERE "brandId" IN (
      'kiik69',
      'skyhy',
      'alehouse',
      'c53',
      'boiler-room',
      'sound-of-soul',
      'club-rogue-gachibowli',
      'club-rogue-kondapur',
      'club-rogue-jubilee-hills',
      'the-hub',
      'firefly',
      'thezenzspot'
    )
  );

  -- 2) Eat & Drink @ ₹128 – Kiik69 & SkyHy (12:00–20:00)
  IF v_kiik69_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_kiik69_id,
      'Eat & Drink Anything @ ₹128',
      'Eat & drink anything @ ₹128 (12PM–8PM)',
      20,
      '12:00',
      '20:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  IF v_skyhy_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_skyhy_id,
      'Eat & Drink Anything @ ₹128',
      'Eat & drink anything @ ₹128 (12PM–8PM)',
      20,
      '12:00',
      '20:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- 3) Eat & Drink @ ₹127 – Alehouse, C53, Boiler Room (12:00–19:00)
  IF v_alehouse_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_alehouse_id,
      'Eat & Drink Anything @ ₹127',
      'Eat & drink anything @ ₹127 (12PM–7PM)',
      20,
      '12:00',
      '19:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  IF v_c53_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_c53_id,
      'Eat & Drink Anything @ ₹127',
      'Eat & drink anything @ ₹127 (12PM–7PM)',
      20,
      '12:00',
      '19:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  IF v_boiler_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_boiler_id,
      'Eat & Drink Anything @ ₹127',
      'Eat & drink anything @ ₹127 (12PM–7PM)',
      20,
      '12:00',
      '19:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- 4) Flat discounts (12:00–22:00). Limits kept at 30/day.
  -- Boiler Room: 30% Flat Discount
  IF v_boiler_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_boiler_id,
      '30% Flat Discount',
      '30% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- C53: 25% Flat Discount
  IF v_c53_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_c53_id,
      '25% Flat Discount',
      '25% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- Alehouse: 30% Flat Discount
  IF v_alehouse_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_alehouse_id,
      '30% Flat Discount',
      '30% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- Sound of Soul: 30% Flat Discount
  IF v_sos_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_sos_id,
      '30% Flat Discount',
      '30% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- SkyHy Live: 23% Flat Discount
  IF v_skyhy_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_skyhy_id,
      '23% Flat Discount',
      '23% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- KIIK 69: 10% Flat Discount
  IF v_kiik69_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_kiik69_id,
      '10% Flat Discount',
      '10% flat discount (12PM–10PM)',
      30,
      '12:00',
      '22:00',
      NULL,
      true,
      NOW(),
      NOW()
    );
  END IF;
END $$;

