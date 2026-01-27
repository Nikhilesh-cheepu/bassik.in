CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Ensure emails are unique and fast to query
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

-- Add optional userId field on Reservation to link bookings to Clerk users
ALTER TABLE "Reservation" ADD COLUMN "userId" TEXT;

-- Index for quick lookups by user
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- Foreign key from Reservation.userId -> User.id (nullable for legacy rows)
ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

