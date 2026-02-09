import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Pool } from "pg";

const RESERVATION_PHONE_NUMBER = "917013884485"; // India + business 10-digit

// Stub auth helpers: reservations API no longer depends on Clerk on the server.
// Frontend + middleware already ensure only signed-in users reach this flow.
const auth = async () => ({ userId: null as string | null });
const currentUser = async () => null;

export async function POST(request: NextRequest) {
  try {
    console.log("[RESERVATION API] Starting reservation request");
    
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      console.log("[RESERVATION API] No userId - unauthorized");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to make a reservation" },
        { status: 401 }
      );
    }

    console.log("[RESERVATION API] User authenticated:", userId);

    // Get user info to sync to database (optional - don't fail if can't get)
    let user;
    try {
      user = await currentUser();
      console.log("[RESERVATION API] User fetched from Clerk:", user?.id);
    } catch (userError: any) {
      console.warn("[RESERVATION API] Could not fetch current user:", userError?.message);
      // Continue without user - reservation can still be created
    }

    if (!user) {
      console.warn("[RESERVATION API] User not found from Clerk, but continuing with reservation");
    }

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

    // Map discount IDs to friendly names
    const discountNames: Record<string, string> = {
      "kiik-10-percent": "10% off on total bill",
      "kiik-lunch": "Lunch Special @ ₹128",
      "lunch-special": "Lunch Special @ ₹127",
      "alehouse-lunch": "Lunch Special @ ₹128",
      "alehouse-liquor": "50% off on liquor",
      "skyhy-lunch": "Lunch Special @ ₹128",
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

    // Build offers section (plain text, no emojis)
    let offersSection = "";
    if (selectedDiscounts && Array.isArray(selectedDiscounts) && selectedDiscounts.length > 0) {
      const offerList = selectedDiscounts
        .map((discountId: string) => discountNames[discountId] || discountId)
        .join("\n");
      offersSection = `\n\n${offerList}`;
    }

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

    const message = `Table Reservation | ${brandName}

${fullName} | ${contactNumber}

${formatDateShort(date)} | ${formattedTime}

${guestCountStr}${offersSection}${notesSection}

Reservation submitted via bassik.in`;

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

    // Ensure user exists in database (sync from Clerk)
    // Handle case where User table might not exist yet (migration not run)
    let dbUser = null;
    let userTableExists = false; // Track if User table exists
    
    if (user) {
      try {
        // Check if User model exists by trying to find first user
        dbUser = await prisma.user.upsert({
          where: { id: userId },
          update: {
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            imageUrl: user.imageUrl || null,
          },
          create: {
            id: userId,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            imageUrl: user.imageUrl || null,
          },
        });
        userTableExists = true; // If upsert succeeded, table exists
        console.log("[RESERVATION API] User synced to database:", dbUser.id);
      } catch (error: any) {
        // If User table doesn't exist, log warning but continue (backward compatibility)
        // P2021 = Table does not exist, P2002 = Unique constraint (might be OK)
        if (
          error?.code === "P2021" || 
          error?.message?.includes("does not exist") ||
          error?.message?.includes("Unknown model") ||
          error?.message?.includes("model User") ||
          error?.message?.includes("The table 'public.User'")
        ) {
          console.warn("[RESERVATION API] User table not found. Please run database migration: npm run db:migrate");
          console.warn("[RESERVATION API] Continuing without userId - reservation will be created without user link");
          dbUser = null; // Explicitly set to null
          userTableExists = false; // Mark that table doesn't exist
        } else if (error?.code === "P2002") {
          // Unique constraint violation - user might already exist, try to find it
          try {
            dbUser = await prisma.user.findUnique({ where: { id: userId } });
            userTableExists = true; // If find succeeded, table exists
            console.log("[RESERVATION API] User found in database:", dbUser?.id);
          } catch (findError) {
            console.warn("[RESERVATION API] Could not find user after unique constraint error:", findError);
            dbUser = null;
            userTableExists = false;
          }
        } else {
          // For other errors, log but don't fail - allow reservation without user link
          console.error("[RESERVATION API] Error syncing user to database:", error);
          dbUser = null;
          userTableExists = false; // Assume table doesn't exist on unknown errors
        }
      }
    }

    // Save to database with userId (if User table exists)
    // Build reservation data object - start without userId
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

    // Only add userId if User table exists and user was created successfully
    // Don't add userId field at all if User table doesn't exist (avoids Prisma errors)
    // IMPORTANT: Only add userId if we confirmed the User table exists
    if (userTableExists && dbUser && userId) {
      reservationData.userId = userId;
      console.log("[RESERVATION API] Adding userId to reservation:", userId);
    } else {
      console.log("[RESERVATION API] Skipping userId - User table may not exist or user not synced");
    }

    console.log("[RESERVATION API] Creating reservation with data:", {
      venueId: reservationData.venueId,
      brandId: reservationData.brandId,
      hasUserId: !!reservationData.userId,
      userTableExists,
    });

    let reservation;
    try {
      reservation = await prisma.reservation.create({
        data: reservationData,
      });
      console.log("[RESERVATION API] Reservation created successfully:", reservation.id);
    } catch (createError: any) {
      console.error("[RESERVATION API] Reservation creation failed:", {
        code: createError?.code,
        message: createError?.message,
        meta: createError?.meta,
        hasUserId: !!reservationData.userId,
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
    const whatsappUrl = `https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodedMessage}`;

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

