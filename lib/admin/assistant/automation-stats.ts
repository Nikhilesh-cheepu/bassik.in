import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type Gender = "male" | "female";

export type AgeRange = {
  min?: number;
  max?: number;
};

type KeyMatch = {
  key: string;
  maleCount: number;
  femaleCount: number;
};

async function getDistinctExtraKeys(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ key: string }[]>(
    Prisma.sql`
      SELECT DISTINCT jsonb_object_keys("extra") AS key
      FROM "AutomationContact"
      WHERE "extra" IS NOT NULL
    `
  );
  return rows.map((r) => r.key).filter(Boolean);
}

function normalizeGenderValue(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["m", "male", "man", "masc"].includes(v)) return "male";
  if (["f", "female", "woman", "fem", "females", "feminin"].includes(v)) return "female";
  return null;
}

export async function detectGenderExtraKey(): Promise<string | null> {
  const keys = await getDistinctExtraKeys();
  const genderLike = keys.filter((k) => /gender|sex/i.test(k));
  const candidates = genderLike.length ? genderLike.slice(0, 8) : keys.slice(0, 8);

  const maleTokens = ["male", "m", "man", "masc"];
  const femaleTokens = ["female", "f", "woman", "fem", "feminin"];

  let best: KeyMatch | null = null;
  for (const key of candidates) {
    const [maleRes, femaleRes] = await Promise.all([
      prisma.$queryRaw<{ c: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS c
        FROM "AutomationContact"
        WHERE "extra" IS NOT NULL
        AND lower(trim("extra"->>${key})) IN (${Prisma.join(maleTokens)})
      `),
      prisma.$queryRaw<{ c: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS c
        FROM "AutomationContact"
        WHERE "extra" IS NOT NULL
        AND lower(trim("extra"->>${key})) IN (${Prisma.join(femaleTokens)})
      `),
    ]);

    const maleCount = maleRes[0]?.c ?? 0;
    const femaleCount = femaleRes[0]?.c ?? 0;
    const total = maleCount + femaleCount;

    if (!best || total > best.maleCount + best.femaleCount) {
      best = { key, maleCount, femaleCount };
    }
  }

  if (!best) return null;
  if (best.maleCount + best.femaleCount === 0) return null;
  return best.key;
}

export async function detectAgeExtraKey(): Promise<string | null> {
  const keys = await getDistinctExtraKeys();
  const ageLike = keys.filter((k) => /age/i.test(k));
  if (!ageLike.length) return null;
  // Pick the first key that looks like age.
  return ageLike[0];
}

export async function countUniqueCustomerPhones(): Promise<number> {
  const rows = await prisma.$queryRaw<{ c: number }[]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT "phone")::int AS c
      FROM "AutomationContact"
      WHERE "phone" IS NOT NULL AND trim("phone") <> ''
    `
  );
  return rows[0]?.c ?? 0;
}

export async function countGenderDistribution(): Promise<{
  male: number;
  female: number;
  genderKeyUsed: string | null;
}> {
  const genderKey = await detectGenderExtraKey();
  if (!genderKey) {
    return { male: 0, female: 0, genderKeyUsed: null };
  }

  const maleTokens = ["male", "m", "man", "masc"];
  const femaleTokens = ["female", "f", "woman", "fem", "feminin"];

  const [maleRes, femaleRes] = await Promise.all([
    prisma.$queryRaw<{ c: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS c
      FROM "AutomationContact"
      WHERE "extra" IS NOT NULL
      AND lower(trim("extra"->>${genderKey})) IN (${Prisma.join(maleTokens)})
    `),
    prisma.$queryRaw<{ c: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS c
      FROM "AutomationContact"
      WHERE "extra" IS NOT NULL
      AND lower(trim("extra"->>${genderKey})) IN (${Prisma.join(femaleTokens)})
    `),
  ]);

  return {
    male: maleRes[0]?.c ?? 0,
    female: femaleRes[0]?.c ?? 0,
    genderKeyUsed: genderKey,
  };
}

export async function countRepeatedCustomersByPhone(): Promise<{
  repeatedUniquePhones: number;
  repeatedContactRows: number;
}> {
  const repeatedPhones = await prisma.$queryRaw<{ phone: string }[]>(
    Prisma.sql`
      SELECT "phone"
      FROM "AutomationContact"
      WHERE "phone" IS NOT NULL AND trim("phone") <> ''
      GROUP BY "phone"
      HAVING COUNT(*) >= 2
    `
  );

  const repeatedSet = new Set(repeatedPhones.map((r) => r.phone));
  if (repeatedSet.size === 0) {
    return { repeatedUniquePhones: 0, repeatedContactRows: 0 };
  }

  const phonesArray = Array.from(repeatedSet);
  const rows = await prisma.$queryRaw<{ c: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS c
      FROM "AutomationContact"
      WHERE "phone" IN (${Prisma.join(phonesArray)})
    `
  );

  return {
    repeatedUniquePhones: repeatedSet.size,
    repeatedContactRows: rows[0]?.c ?? 0,
  };
}

function buildAgeWhereConditionSql(ageKey: string, age: AgeRange): Prisma.Sql {
  const ageInt = Prisma.sql`
    NULLIF(regexp_replace("extra"->>${ageKey}, '[^0-9]', '', 'g'), '')::int
  `;

  const min = typeof age.min === "number" ? age.min : undefined;
  const max = typeof age.max === "number" ? age.max : undefined;

  if (min != null && max != null) {
    return Prisma.sql`
      AND ${ageInt} IS NOT NULL
      AND ${ageInt} >= ${min}
      AND ${ageInt} <= ${max}
    `;
  }
  if (min != null) {
    return Prisma.sql`
      AND ${ageInt} IS NOT NULL
      AND ${ageInt} >= ${min}
    `;
  }
  if (max != null) {
    return Prisma.sql`
      AND ${ageInt} IS NOT NULL
      AND ${ageInt} <= ${max}
    `;
  }
  return Prisma.sql``;
}

export async function countContactsByAgeRange(age: AgeRange): Promise<{
  count: number;
  ageKeyUsed: string | null;
}> {
  const ageKey = await detectAgeExtraKey();
  if (!ageKey) return { count: 0, ageKeyUsed: null };

  const ageWhere = buildAgeWhereConditionSql(ageKey, age);
  const rows = await prisma.$queryRaw<{ c: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS c
      FROM "AutomationContact"
      WHERE "extra" IS NOT NULL
        ${ageWhere}
    `
  );

  return { count: rows[0]?.c ?? 0, ageKeyUsed: ageKey };
}

export async function countNameStats(): Promise<{
  totalNamedContacts: number;
  uniqueNames: number;
}> {
  const rows = await prisma.$queryRaw<{ totalNamed: number; uniqueNames: number }[]>(
    Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalNamed",
        COUNT(DISTINCT lower(trim("fullName")))::int AS "uniqueNames"
      FROM "AutomationContact"
      WHERE "fullName" IS NOT NULL AND trim("fullName") <> ''
    `
  );

  return {
    totalNamedContacts: rows[0]?.totalNamed ?? 0,
    uniqueNames: rows[0]?.uniqueNames ?? 0,
  };
}

async function detectDateExtraKey(): Promise<string | null> {
  const keys = await getDistinctExtraKeys();
  const candidates = keys.filter((k) => /date/i.test(k));
  const ordered = candidates.length ? candidates : keys.slice(0, 10);

  // Prefer ISO dates first, then loose dd/mm/yyyy.
  let best: { key: string; isoMatches: number; looseMatches: number } | null = null;

  const isoRe = "^\\\\d{4}-\\\\d{2}-\\\\d{2}$";
  const looseRe = "^\\\\d{1,2}\\\\s*[/\\\\-]\\\\s*\\\\d{1,2}\\\\s*[/\\\\-]\\\\s*\\\\d{2,4}$";

  for (const key of ordered.slice(0, 8)) {
    const [isoRes, looseRes] = await Promise.all([
      prisma.$queryRaw<{ c: number }[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS c
          FROM "AutomationContact"
          WHERE "extra" IS NOT NULL
            AND trim("extra"->>${key}) ~ ${isoRe}
        `
      ),
      prisma.$queryRaw<{ c: number }[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS c
          FROM "AutomationContact"
          WHERE "extra" IS NOT NULL
            AND trim("extra"->>${key}) ~ ${looseRe}
        `
      ),
    ]);

    const isoMatches = isoRes[0]?.c ?? 0;
    const looseMatches = looseRes[0]?.c ?? 0;
    if (!best) best = { key, isoMatches, looseMatches };
    else {
      const bestScore = best.isoMatches * 10 + best.looseMatches;
      const score = isoMatches * 10 + looseMatches;
      if (score > bestScore) best = { key, isoMatches, looseMatches };
    }
  }

  if (!best) return null;
  if (best.isoMatches + best.looseMatches === 0) return null;
  return best.key;
}

export async function countVisitFrequencySummary(): Promise<{
  dateKeyUsed: string | null;
  totalVisits: number;
  uniqueCustomers: number;
  customersWith2PlusVisits: number;
  avgVisitsPerCustomer: number;
  topDates: { date: string; visits: number; customers: number }[];
}> {
  const dateKey = await detectDateExtraKey();
  if (!dateKey) {
    return {
      dateKeyUsed: null,
      totalVisits: 0,
      uniqueCustomers: 0,
      customersWith2PlusVisits: 0,
      avgVisitsPerCustomer: 0,
      topDates: [],
    };
  }

  const isoRe = "^\\\\d{4}-\\\\d{2}-\\\\d{2}$";
  const looseRe = "^\\\\d{1,2}\\\\s*[/\\\\-]\\\\s*\\\\d{1,2}\\\\s*[/\\\\-]\\\\s*\\\\d{2,4}$";

  const totals = await prisma.$queryRaw<{ totalVisits: number; uniqueCustomers: number }[]>(
    Prisma.sql`
      WITH visits AS (
        SELECT
          trim("phone") AS phone,
          CASE
            WHEN trim("extra"->>${dateKey}) ~ ${isoRe} THEN trim("extra"->>${dateKey})::date
            WHEN trim("extra"->>${dateKey}) ~ ${looseRe} THEN
              to_date(
                regexp_replace(trim("extra"->>${dateKey}), '\\s*[-/]\\s*', '/', 'g'),
                'DD/MM/YYYY'
              )
            ELSE NULL
          END AS visit_date
        FROM "AutomationContact"
        WHERE "extra" IS NOT NULL
          AND "phone" IS NOT NULL AND trim("phone") <> ''
      )
      SELECT
        COUNT(*)::int AS "totalVisits",
        COUNT(DISTINCT phone)::int AS "uniqueCustomers"
      FROM visits
      WHERE visit_date IS NOT NULL
    `
  );

  const perCustomer = await prisma.$queryRaw<{ customers: number; customersWith2Plus: number; avg: number }[]>(
    Prisma.sql`
      WITH per_phone AS (
        SELECT
          phone,
          COUNT(*)::int AS vcount
        FROM (
          WITH visits AS (
            SELECT
              trim("phone") AS phone,
              CASE
                WHEN trim("extra"->>${dateKey}) ~ ${isoRe} THEN trim("extra"->>${dateKey})::date
                WHEN trim("extra"->>${dateKey}) ~ ${looseRe} THEN
                  to_date(
                    regexp_replace(trim("extra"->>${dateKey}), '\\s*[-/]\\s*', '/', 'g'),
                    'DD/MM/YYYY'
                  )
                ELSE NULL
              END AS visit_date
            FROM "AutomationContact"
            WHERE "extra" IS NOT NULL
              AND "phone" IS NOT NULL AND trim("phone") <> ''
          )
          SELECT phone
          FROM visits
          WHERE visit_date IS NOT NULL
        ) v
        GROUP BY phone
      )
      SELECT
        COUNT(*)::int AS customers,
        COUNT(*) FILTER (WHERE vcount >= 2)::int AS "customersWith2Plus",
        COALESCE(AVG(vcount)::float, 0)::float AS avg
      FROM per_phone
    `
  );

  const topDates = await prisma.$queryRaw<{ date: string; visits: number; customers: number }[]>(
    Prisma.sql`
      WITH visits AS (
        SELECT
          trim("phone") AS phone,
          CASE
            WHEN trim("extra"->>${dateKey}) ~ ${isoRe} THEN trim("extra"->>${dateKey})::date
            WHEN trim("extra"->>${dateKey}) ~ ${looseRe} THEN
              to_date(
                regexp_replace(trim("extra"->>${dateKey}), '\\s*[-/]\\s*', '/', 'g'),
                'DD/MM/YYYY'
              )
            ELSE NULL
          END AS visit_date
        FROM "AutomationContact"
        WHERE "extra" IS NOT NULL
          AND "phone" IS NOT NULL AND trim("phone") <> ''
      )
      SELECT
        to_char(visit_date, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS visits,
        COUNT(DISTINCT phone)::int AS customers
      FROM visits
      WHERE visit_date IS NOT NULL
      GROUP BY visit_date
      ORDER BY visit_date DESC
      LIMIT 10
    `
  );

  return {
    dateKeyUsed: dateKey,
    totalVisits: totals[0]?.totalVisits ?? 0,
    uniqueCustomers: totals[0]?.uniqueCustomers ?? 0,
    customersWith2PlusVisits: perCustomer[0]?.customersWith2Plus ?? 0,
    avgVisitsPerCustomer: perCustomer[0]?.avg ?? 0,
    topDates: (topDates || []).map((r) => ({
      date: r.date,
      visits: r.visits,
      customers: r.customers,
    })),
  };
}

export async function countCustomerOutletInteractionSummary(): Promise<{
  customersVisitedAtLeast2Outlets: number;
  topOutletPairs: { outletA: string; outletB: string; customers: number }[];
}> {
  const distinctPairs = await prisma.$queryRaw<
    { customers: number; outletA: string; outletB: string }[]
  >(
    Prisma.sql`
      WITH distinct_po AS (
        SELECT DISTINCT
          trim("phone") AS phone,
          trim(outlet) AS outlet
        FROM "AutomationContact"
        CROSS JOIN LATERAL regexp_split_to_table("venue", '\\s*/\\s*') AS outlet
        WHERE "phone" IS NOT NULL AND trim("phone") <> ''
          AND "venue" IS NOT NULL AND trim("venue") <> ''
          AND trim(outlet) <> ''
      )
      SELECT
        a.outlet AS "outletA",
        b.outlet AS "outletB",
        COUNT(DISTINCT a.phone)::int AS customers
      FROM distinct_po a
      JOIN distinct_po b
        ON a.phone = b.phone
       AND a.outlet < b.outlet
      GROUP BY a.outlet, b.outlet
      ORDER BY customers DESC
      LIMIT 10
    `
  );

  const customersVisitedAtLeast2Outlets = await prisma.$queryRaw<{ c: number }[]>(
    Prisma.sql`
      WITH distinct_po AS (
        SELECT DISTINCT
          trim("phone") AS phone,
          trim(outlet) AS outlet
        FROM "AutomationContact"
        CROSS JOIN LATERAL regexp_split_to_table("venue", '\\s*/\\s*') AS outlet
        WHERE "phone" IS NOT NULL AND trim("phone") <> ''
          AND "venue" IS NOT NULL AND trim("venue") <> ''
          AND trim(outlet) <> ''
      ),
      per_phone AS (
        SELECT phone, COUNT(DISTINCT outlet)::int AS outlet_count
        FROM distinct_po
        GROUP BY phone
      )
      SELECT COUNT(*)::int AS c
      FROM per_phone
      WHERE outlet_count >= 2
    `
  );

  return {
    customersVisitedAtLeast2Outlets: customersVisitedAtLeast2Outlets[0]?.c ?? 0,
    topOutletPairs: (distinctPairs || []).map((r) => ({
      outletA: r.outletA,
      outletB: r.outletB,
      customers: r.customers,
    })),
  };
}


