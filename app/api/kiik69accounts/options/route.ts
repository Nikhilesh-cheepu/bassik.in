import { NextRequest, NextResponse } from "next/server";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";
import {
  KIIK69_PAYMENT_METHODS,
  KIIK69_PURCHASE_ITEMS,
  KIIK69_PURCHASE_VENDORS,
  mergeKiik69OptionChips,
} from "@/lib/kiik69-accounts";
import { listKiik69CustomOptions } from "@/lib/kiik69-custom-options-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [vendorCustoms, paymentCustoms, itemCustoms] = await Promise.all([
      listKiik69CustomOptions("vendor"),
      listKiik69CustomOptions("payment"),
      listKiik69CustomOptions("item"),
    ]);

    return NextResponse.json({
      vendors: mergeKiik69OptionChips(KIIK69_PURCHASE_VENDORS, vendorCustoms),
      payments: mergeKiik69OptionChips(KIIK69_PAYMENT_METHODS, paymentCustoms),
      items: mergeKiik69OptionChips(KIIK69_PURCHASE_ITEMS, itemCustoms),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Could not load options" }, { status: 500 });
  }
}
