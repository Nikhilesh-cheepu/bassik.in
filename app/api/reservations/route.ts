import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Pool } from "pg";
import { getContactForBrand, getFullPhoneNumber } from "@/lib/outlet-contacts";

const RESERVATION_PHONE_NUMBER = "917013884485"; // India + business 10-digit

export async function POST(request: NextRequest) {
  try {
    console.log("[RESERVATION API] Starting reservation request");

    // Reservations no longer depend on server-side auth; middleware + frontend protect the flow.
    const userId: string | null = null;
    const user: any = null;

    let body;
    try {
      body = await request.json();
      console.log("[RESERVATION API] Request body received:", { 
        brandId: body.brandId, 
        hasDate: !!body.date,
        hasTimeSlot: !!body.timeSlot,
      });
    } catch (parseError: any) {
      console.error("[RESERVATION API] Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }
    let {
      fullName,
      contactNumber,
      numberOfMen,
      numberOfWomen,
      numberOfCouples,
      date,
      time,
      timeSlot,
      notes,
      selectedDiscounts,
      brandId,
      brandName,
      hubSpotId,
    } = body;

    // Normalize to 10-digit Indian number (strip +91, 91, 0 prefix)
    const digitsOnly = String(contactNumber || "").replace(/\D/g, "");
    const normalized =
      digitsOnly.length > 10 && (digitsOnly.startsWith("91") || digitsOnly.startsWith("0"))
        ? digitsOnly.replace(/^(91|0)+/, "").slice(0, 10)
        : digitsOnly.slice(0, 10);
    contactNumber = normalized;

    const valid10Digit = /^\d{10}$/.test(contactNumber);

    if (
      !fullName ||
      !contactNumber ||
      numberOfMen === undefined ||
      numberOfWomen === undefined ||
      numberOfCouples === undefined ||
      !date ||
      (!time && !timeSlot) ||
      !brandId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!valid10Digit) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit contact number." },
        { status: 400 }
      );
    }

    // Format date nicely
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return date.toLocaleDateString("en-IN", options);
    };

    // Format time from 24-hour to 12-hour format
    const formatTime = (time24: string): string => {
      if (!time24) return "";
      const [hours, minutes] = time24.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    // Format date in short format (e.g., "18 Jan 2026")
    const formatDateShort = (dateStr: string): string => {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
      };
      return date.toLocaleDateString("en-IN", options);
    };

    const timeToFormat = timeSlot || time;
    const formattedTime = timeSlot ? formatTime(timeSlot) : time;

    // Format the message for WhatsApp
    const totalGuests =
      parseInt(numberOfMen) + parseInt(numberOfWomen) + parseInt(numberOfCouples) * 2;

    // Build guest count string
    const guestParts: string[] = [];
    if (parseInt(numberOfMen) > 0) guestParts.push(`${numberOfMen}M`);
    if (parseInt(numberOfWomen) > 0) guestParts.push(`${numberOfWomen}W`);
    if (parseInt(numberOfCouples) > 0) guestParts.push(`${numberOfCouples} Couple${parseInt(numberOfCouples) > 1 ? "s" : ""}`);
    const guestCountStr = `${totalGuests} Guests (${guestParts.join(" / ")})`;

    // Build notes section (plain text, no emojis)
    let notesSection = "";
    if (notes && notes.trim()) {
      const notesLower = notes.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSection = "\n\nBirthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "\n\nAnniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "\n\nCelebration";
      } else {
        notesSection = `\n\n${notes.trim()}`;
      }
    }

    // Find or create venue
    console.log("[RESERVATION API] Looking for venue:", brandId);
    let venue;
    try {
      // Test database connection first
      await prisma.$connect().catch((connError) => {
        console.error("[RESERVATION API] Database connection error:", connError);
      });
      
      venue = await prisma.venue.findUnique({
        where: { brandId },
      });
      console.log("[RESERVATION API] Venue found:", venue?.id || "not found");

      if (!venue) {
        // Create venue if it doesn't exist
        console.log("[RESERVATION API] Creating new venue:", brandId);
        try {
          venue = await prisma.venue.create({
            data: {
              brandId,
              name: brandName,
              shortName: brandName,
              address: "Address to be updated",
            },
          });
          console.log("[RESERVATION API] Venue created:", venue.id);
        } catch (createVenueError: any) {
          console.error("[RESERVATION API] Error creating venue:", {
            code: createVenueError?.code,
            message: createVenueError?.message,
            meta: createVenueError?.meta,
          });
          throw createVenueError;
        }
      }
    } catch (venueError: any) {
      console.error("[RESERVATION API] Error with venue:", {
        code: venueError?.code,
        message: venueError?.message,
        meta: venueError?.meta,
        stack: venueError?.stack?.split('\n').slice(0, 3).join('\n'),
      });
      throw venueError;
    }

    const discountIds = Array.isArray(selectedDiscounts) ? selectedDiscounts.filter((id: unknown) => typeof id === "string") : [];
    let discountTitles: string[] = [];
    if (discountIds.length > 0) {
      const discounts = await prisma.discount.findMany({
        where: { id: { in: discountIds }, venue: { brandId } },
      });
      if (discounts.length !== discountIds.length) {
        return NextResponse.json(
          { error: "One or more selected discounts are invalid." },
          { status: 400 }
        );
      }
      discountTitles = discounts.map((d) => d.title);
    }

    // Build offers section from DB discount titles (after validation)
    const offersSection = discountTitles.length > 0 ? `\n\n${discountTitles.join("\n")}` : "";

    const message = `Table Reservation | ${brandName}

${fullName} | ${contactNumber}

${formatDateShort(date)} | ${formattedTime}

${guestCountStr}${offersSection}${notesSection}

Reservation submitted via bassik.in`;

    // Build reservation data object (no server-side user linkage; reservations are anonymous here)
    const reservationData: any = {
      venueId: venue.id,
      brandId,
      brandName,
      fullName,
      contactNumber,
      numberOfMen: numberOfMen || "0",
      numberOfWomen: numberOfWomen || "0",
      numberOfCouples: numberOfCouples || "0",
      date,
      timeSlot: timeSlot || time || "",
      notes: notes || null,
      selectedDiscounts: selectedDiscounts
        ? JSON.stringify(selectedDiscounts)
        : null,
      status: "PENDING",
    };

    console.log("[RESERVATION API] Creating reservation with data:", {
      venueId: reservationData.venueId,
      brandId: reservationData.brandId,
    });

    let reservation;
    const runWithDiscounts = discountIds.length > 0;
    try {
      if (runWithDiscounts) {
        reservation = await prisma.$transaction(async (tx) => {
          for (const discountId of discountIds) {
            await tx.$executeRawUnsafe(
              `INSERT INTO "DiscountDailyUsage" (id, "discountId", date, "usedCount")
               VALUES (gen_random_uuid()::text, $1, $2, 0)
               ON CONFLICT ("discountId", date) DO NOTHING`,
              discountId,
              date
            );
            const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
              `UPDATE "DiscountDailyUsage" u SET "usedCount" = u."usedCount" + 1
               FROM "Discount" d
               WHERE u."discountId" = d.id AND u."discountId" = $1 AND u.date = $2
                 AND u."usedCount" < d."limitPerDay"
               RETURNING u.id`,
              discountId,
              date
            );
            if (!rows || rows.length === 0) {
              throw new Error("SOLD_OUT");
            }
          }
          return tx.reservation.create({ data: reservationData });
        });
      } else {
        reservation = await prisma.reservation.create({
          data: reservationData,
        });
      }
      console.log("[RESERVATION API] Reservation created successfully:", reservation.id);
    } catch (createError: any) {
      if (createError?.message === "SOLD_OUT") {
        return NextResponse.json(
          { error: "This discount just sold out. Please choose another." },
          { status: 400 }
        );
      }
      console.error("[RESERVATION API] Reservation creation failed:", {
        code: createError?.code,
        message: createError?.message,
        meta: createError?.meta,
        errorName: createError?.name,
      });
      
      // If creation fails due to userId foreign key constraint, field doesn't exist, or unknown argument
      // Try again without userId
      const isUserIdRelatedError = 
        createError?.code === "P2003" || // Foreign key constraint
        createError?.code === "P2014" || // Related record not found
        createError?.code === "P2009" || // Unknown argument
        createError?.code === "P2011" || // Null constraint
        createError?.code === "P2021" || // Table does not exist
        createError?.code === "P2022" || // Column does not exist (CRITICAL - this is the current error)
        createError?.message?.includes("Unknown argument") ||
        createError?.message?.includes("Unknown field") ||
        createError?.message?.includes("userId") ||
        createError?.message?.includes("does not exist") ||
        createError?.message?.includes("column") && createError?.message?.includes("not exist") ||
        (createError?.meta?.target && Array.isArray(createError.meta.target) && createError.meta.target.includes("userId")) ||
        (createError?.meta?.driverAdapterError?.cause?.kind === "ColumnNotFound");
      
      // If it's a userId-related error, use raw SQL to bypass Prisma schema validation
      // This handles cases where Prisma Client expects the column but it doesn't exist in DB
      if (isUserIdRelatedError) {
        console.warn("[RESERVATION API] userId-related error detected (code: " + createError?.code + ")");
        console.warn("[RESERVATION API] Original error:", createError.message);
        console.warn("[RESERVATION API] This usually means the database migration hasn't been run.");
        console.warn("[RESERVATION API] Using raw SQL to create reservation (bypassing Prisma schema)...");
        
        try {
          // Use raw SQL via direct database pool to insert reservation without userId column
          // This bypasses Prisma's schema validation which expects the column to exist
          // Generate a unique ID first
          const newId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          
          console.log("[RESERVATION API] Executing raw SQL insert via database pool (bypassing Prisma schema)...");
          
          // Create a new pool connection for raw SQL (or reuse existing one)
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
          });
          
          try {
            // Use parameterized query for safety
            const insertQuery = `
              INSERT INTO "Reservation" (
                "id", "venueId", "brandId", "brandName", "fullName", 
                "contactNumber", "numberOfMen", "numberOfWomen", "numberOfCouples",
                "date", "timeSlot", "notes", "selectedDiscounts", "status", 
                "createdAt", "updatedAt"
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
              RETURNING "id"
            `;
            
            const insertResult = await pool.query(insertQuery, [
              newId,
              reservationData.venueId,
              reservationData.brandId,
              reservationData.brandName,
              reservationData.fullName,
              reservationData.contactNumber,
              reservationData.numberOfMen,
              reservationData.numberOfWomen,
              reservationData.numberOfCouples,
              reservationData.date,
              reservationData.timeSlot,
              reservationData.notes || null,
              reservationData.selectedDiscounts || null,
              reservationData.status,
            ]);
            
            console.log("[RESERVATION API] Raw SQL insert completed, inserted ID:", insertResult.rows[0]?.id);
            
            // Fetch the created reservation
            const fetchResult = await pool.query(
              `SELECT * FROM "Reservation" WHERE "id" = $1`,
              [newId]
            );
            
            if (fetchResult.rows && fetchResult.rows[0]) {
              const row = fetchResult.rows[0];
              // Create a reservation object that matches Prisma's expected format
              reservation = {
                id: row.id,
                venueId: row.venueId,
                brandId: row.brandId,
                brandName: row.brandName,
                fullName: row.fullName,
                contactNumber: row.contactNumber,
                numberOfMen: row.numberOfMen,
                numberOfWomen: row.numberOfWomen,
                numberOfCouples: row.numberOfCouples,
                date: row.date,
                timeSlot: row.timeSlot,
                notes: row.notes,
                selectedDiscounts: row.selectedDiscounts,
                status: row.status,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
              } as any;
              
              console.log("[RESERVATION API] Reservation created successfully via raw SQL:", reservation.id);
              console.warn("[RESERVATION API] ⚠️  Please run 'npm run db:migrate' to enable user linking!");
            } else {
              throw new Error("Failed to retrieve created reservation - no data returned");
            }
          } finally {
            // Close the pool connection
            await pool.end();
          }
        } catch (rawSqlError: any) {
          console.error("[RESERVATION API] Raw SQL insertion also failed:", {
            code: rawSqlError?.code,
            message: rawSqlError?.message,
            errorName: rawSqlError?.name,
          });
          
          // If raw SQL also fails, it's a more serious database issue
          console.error("[RESERVATION API] Database schema mismatch detected!");
          console.error("[RESERVATION API] The Prisma schema includes 'userId' but the database column doesn't exist.");
          console.error("[RESERVATION API] SOLUTION: Run 'npm run db:migrate' to sync the database schema.");
          
          throw rawSqlError;
        }
      } else {
        // Log the full error for debugging
        console.error("[RESERVATION API] Reservation creation error (non-recoverable):", {
          code: createError?.code,
          message: createError?.message,
          meta: createError?.meta,
          errorName: createError?.name,
          stack: createError?.stack?.split('\n').slice(0, 5).join('\n'),
        });
        throw createError;
      }
    }

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const hubOutlets = ["c53", "boiler-room", "firefly"] as const;
    const waNumber =
      brandId === "the-hub" &&
      hubSpotId &&
      typeof hubSpotId === "string" &&
      hubOutlets.includes(hubSpotId as (typeof hubOutlets)[number])
        ? getFullPhoneNumber(getContactForBrand(hubSpotId))
        : RESERVATION_PHONE_NUMBER;
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;

    if (!reservation) {
      throw new Error("Reservation was not created successfully");
    }

    console.log("[RESERVATION API] Reservation successful, returning response");
    return NextResponse.json(
      {
        success: true,
        message: "Reservation submitted successfully",
        whatsappUrl: whatsappUrl,
        reservationId: reservation.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[RESERVATION API] Top-level error caught:", error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error?.message || "Internal server error";
    const errorCode = error?.code || "UNKNOWN";
    
    // Log full error details (always log - helps with debugging)
    console.error("[RESERVATION API] Full error details:", {
      message: errorMessage,
      code: errorCode,
      meta: error?.meta,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    });

    // Return user-friendly error message with details for debugging
    return NextResponse.json(
      { 
        error: "Failed to process reservation. Please try again.",
        // Always include details in response for debugging (can be removed in production if needed)
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

