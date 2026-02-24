-- Update discount configuration to match Feb 2026 business rules.
-- - Remove all old discounts for target outlets
-- - Recreate only the desired offers with correct timings & limits

DO $$
DECLARE
  v_kiik69_id TEXT;
  v_skyhy_id TEXT;
  v_alehouse_id TEXT;
  v_c53_id TEXT;
  v_boiler_id TEXT;
  v_sos_id TEXT;
BEGIN
  -- Look up venue IDs (brandId is unique on Venue)
  SELECT id INTO v_kiik69_id FROM "Venue" WHERE "brandId" = 'kiik69';
  SELECT id INTO v_skyhy_id FROM "Venue" WHERE "brandId" = 'skyhy';
  SELECT id INTO v_alehouse_id FROM "Venue" WHERE "brandId" = 'alehouse';
  SELECT id INTO v_c53_id FROM "Venue" WHERE "brandId" = 'c53';
  SELECT id INTO v_boiler_id FROM "Venue" WHERE "brandId" = 'boiler-room';
  SELECT id INTO v_sos_id FROM "Venue" WHERE "brandId" = 'sound-of-soul';

  -- Remove ALL existing discounts for the brands covered by the new rules
  DELETE FROM "Discount"
  WHERE "venueId" IN (
    SELECT id FROM "Venue" WHERE "brandId" IN (
      'kiik69',
      'skyhy',
      'alehouse',
      'c53',
      'boiler-room',
      'club-rogue-gachibowli',
      'club-rogue-kondapur',
      'club-rogue-jubilee-hills',
      'the-hub',
      'firefly',
      'sound-of-soul',
      'thezenzspot'
    )
  );

  -- 2️⃣ ₹128 OFFER – ONLY FOR Kiik69, Skyhy (12:00–20:00)
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

  -- 3️⃣ ₹127 OFFER – Alehouse, C53, Boiler Room (12:00–19:00)
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

  -- 4️⃣ ADDITIONAL FLAT DISCOUNTS (30 slots/day, 12:00–22:00, slot count hidden in UI)
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

  IF v_skyhy_id IS NOT NULL THEN
    INSERT INTO "Discount" (id, "venueId", title, description, "limitPerDay", "startTime", "endTime", session, active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      v_skyhy_id,
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
END $$;

