import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { AgeRange, Gender } from "./automation-stats";
import {
  detectAgeExtraKey,
  detectGenderExtraKey,
} from "./automation-stats";

export type GroupSpec = {
  importScope: "all"; // for now (can later add per importId)
  gender?: Gender;
  age?: AgeRange;
  repeated?: boolean;
};

export type GroupRecipient = {
  id: string;
  fullName: string | null;
  phone: string;
};

function buildAgeConditionSql(ageKey: string, age: AgeRange): {
  sql: Prisma.Sql;
} {
  // Extract digits from extra->>ageKey and cast to int.
  const ageInt = Prisma.sql`
    NULLIF(regexp_replace("extra"->>${ageKey}, '[^0-9]', '', 'g'), '')::int
  `;

  const min = typeof age.min === "number" ? age.min : undefined;
  const max = typeof age.max === "number" ? age.max : undefined;

  if (min != null && max != null) {
    return {
      sql: Prisma.sql`
        AND ${ageInt} IS NOT NULL
        AND ${ageInt} >= ${min}
        AND ${ageInt} <= ${max}
      `,
    };
  }
  if (min != null) {
    return {
      sql: Prisma.sql`
        AND ${ageInt} IS NOT NULL
        AND ${ageInt} >= ${min}
      `,
    };
  }
  if (max != null) {
    return {
      sql: Prisma.sql`
        AND ${ageInt} IS NOT NULL
        AND ${ageInt} <= ${max}
      `,
    };
  }
  return { sql: Prisma.sql`` };
}

function normalizeGenderToken(g: Gender): string[] {
  if (g === "male") return ["male", "m", "man", "masc"];
  return ["female", "f", "woman", "fem", "feminin"];
}

export async function countRecipientsForGroup(spec: GroupSpec): Promise<{
  count: number;
  genderKeyUsed: string | null;
  ageKeyUsed: string | null;
}> {
  let genderKeyUsed: string | null = null;
  let ageKeyUsed: string | null = null;

  let genderClause = Prisma.sql``;
  if (spec.gender) {
    genderKeyUsed = await detectGenderExtraKey();
    if (!genderKeyUsed) {
      return { count: 0, genderKeyUsed: null, ageKeyUsed: null };
    }
    const genderTokens = normalizeGenderToken(spec.gender);
    genderClause = Prisma.sql`
      AND lower(trim("extra"->>${genderKeyUsed})) IN (${Prisma.join(genderTokens)})
    `;
  }

  let ageClause = Prisma.sql``;
  if (spec.age) {
    ageKeyUsed = await detectAgeExtraKey();
    if (!ageKeyUsed) {
      return { count: 0, genderKeyUsed: genderKeyUsed, ageKeyUsed: null };
    }
    const ageCond = buildAgeConditionSql(ageKeyUsed, spec.age);
    ageClause = ageCond.sql;
  }

  let repeatedClause = Prisma.sql``;
  if (spec.repeated) {
    repeatedClause = Prisma.sql`
      AND "phone" IN (
        SELECT "phone"
        FROM "AutomationContact"
        WHERE "phone" IS NOT NULL AND trim("phone") <> ''
        GROUP BY "phone"
        HAVING COUNT(*) >= 2
      )
    `;
  }

  const rows = await prisma.$queryRaw<{ c: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS c
      FROM "AutomationContact"
      WHERE "phone" IS NOT NULL
        AND trim("phone") <> ''
      ${genderClause}
      ${ageClause}
      ${repeatedClause}
    `
  );

  return { count: rows[0]?.c ?? 0, genderKeyUsed, ageKeyUsed };
}

export async function resolveRecipientsForGroup(spec: GroupSpec, limit: number): Promise<{
  recipients: GroupRecipient[];
  genderKeyUsed: string | null;
  ageKeyUsed: string | null;
}> {
  let genderKeyUsed: string | null = null;
  let ageKeyUsed: string | null = null;
  let genderClause = Prisma.sql``;
  if (spec.gender) {
    genderKeyUsed = await detectGenderExtraKey();
    if (!genderKeyUsed) {
      return { recipients: [], genderKeyUsed: null, ageKeyUsed: null };
    }
    genderClause = Prisma.sql`
      AND lower(trim("extra"->>${genderKeyUsed})) IN (${Prisma.join(normalizeGenderToken(spec.gender))})
    `;
  }

  let ageClause = Prisma.sql``;
  if (spec.age) {
    ageKeyUsed = await detectAgeExtraKey();
    if (!ageKeyUsed) {
      return { recipients: [], genderKeyUsed, ageKeyUsed: null };
    }
    const ageCond = buildAgeConditionSql(ageKeyUsed, spec.age);
    ageClause = ageCond.sql;
  }

  let repeatedClause = Prisma.sql``;
  if (spec.repeated) {
    repeatedClause = Prisma.sql`
      AND "phone" IN (
        SELECT "phone"
        FROM "AutomationContact"
        WHERE "phone" IS NOT NULL AND trim("phone") <> ''
        GROUP BY "phone"
        HAVING COUNT(*) >= 2
      )
    `;
  }

  const recipients = await prisma.$queryRaw<GroupRecipient[]>(
    Prisma.sql`
      SELECT "id",
             "fullName",
             "phone"
      FROM "AutomationContact"
      WHERE "phone" IS NOT NULL
        AND trim("phone") <> ''
      ${genderClause}
      ${ageClause}
      ${repeatedClause}
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
    `
  );

  return { recipients, genderKeyUsed, ageKeyUsed };
}

export function applyTemplateToRecipient(
  template: string,
  recipient: { fullName: string | null }
): string {
  const safeName = recipient.fullName?.trim() ? recipient.fullName.trim() : "there";
  return template.replaceAll("{{fullName}}", safeName);
}

