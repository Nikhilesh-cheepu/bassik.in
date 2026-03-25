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

