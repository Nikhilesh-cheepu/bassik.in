import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function prismaSchemaErrorResponse(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return NextResponse.json(
      { error: "Database needs update. Run: npm run db:migrate:deploy" },
      { status: 503 }
    );
  }
  return null;
}
