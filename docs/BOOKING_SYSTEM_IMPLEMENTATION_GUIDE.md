# Bassik.in Booking System — Implementation Guide

This document describes how the Alehouse-style booking flow works so you can implement similar logic in another application. It covers flow, contacts, offers, slots, modules, and reservation APIs.

---

## 1. High-Level Flow

1. **User lands on outlet page** (e.g. `/alehouse`) → sees CTA (WhatsApp/Call) and a **“Book a table”** button.
2. **User taps “Book a table”** → navigates to **booking page** (e.g. `/alehouse/reservations`).
3. **Booking page:** User selects **date** (15-day strip) → **Lunch or Dinner** tab → **time slot** (e.g. 12:30 PM).
4. **After time is selected**, the app fetches **available offers** for that date + time. Only offers whose **time window** includes the selected slot are shown. User can select zero or more offers.
5. User enters **name**, **10-digit mobile**, **guests**, optional notes → taps **Confirm Booking**.
6. **Backend** creates a `Reservation` row, (optionally) consumes discount slots, then returns a **WhatsApp deep link** with a pre-filled message.
7. **Frontend** redirects the user to WhatsApp; no payment or confirmation step in-app.

**No login required** for the customer; reservations are anonymous (optional `userId` for future use).

---

## 2. User Journey (Step by Step)

| Step | Action | What happens |
|------|--------|---------------|
| 1 | Open outlet | Outlet page loads; venue data (contacts, gallery, menus) from `GET /api/venues/{brandId}`. |
| 2 | Tap “Book a table” | Client navigates to `/{brandId}/reservations`. |
| 3 | Pick date | 15-day horizontal strip; date format `YYYY-MM-DD`. |
| 4 | Pick Lunch or Dinner | **Lunch** = 12:00–18:00; **Dinner** = 18:15–24:00 (15-min steps). For “today”, past slots are hidden. |
| 5 | Pick time slot | e.g. `12:30` → stored as 24h `HH:MM`. |
| 6 | See offers | `GET /api/venues/{brandId}/discounts-available?date=YYYY-MM-DD&timeSlot=HH:MM` → list of offers valid for that time. User can select multiple; some show “Limited slots” / “Selling out fast” / “Few slots left” or “SOLD OUT”. |
| 7 | Enter details | Full name, 10-digit Indian mobile, guest count (men/women/couples), optional notes. |
| 8 | Confirm | `POST /api/reservations` with all fields; response includes `whatsappUrl`. |
| 9 | Redirect | Client opens `whatsappUrl` (e.g. `https://wa.me/91XXXXXXXXXX?text=...`) so user can send the message to the outlet. |

---

## 3. Contact Numbers

Contacts are used in **two** places:

### 3.1 Outlet page CTA (WhatsApp / Call buttons)

- **Source:** Prefer **venue DB**: `Venue.contactPhone` or `Venue.contactNumbers` (JSON array `[{ phone, label }]`). If the admin has set contacts for that venue, those are shown.
- **Fallback:** If DB has no contacts, use **static map** in `lib/outlet-contacts.ts` (see below).

### 3.2 Post-booking WhatsApp link

- **Default:** One central number is used for the “send to WhatsApp” link after booking: **`917013884485`** (10-digit: `7013884485`). This is hardcoded as `RESERVATION_PHONE_NUMBER` in `app/api/reservations/route.ts`.
- **Exception (The Hub):** When `brandId === "the-hub"` and the user chose a sub-outlet (`hubSpotId` = `c53` | `boiler-room` | `firefly`), the WhatsApp number is taken from `getContactForBrand(hubSpotId)` (i.e. outlet-contacts for that sub-outlet).

### 3.3 Static contact map (fallback / The Hub sub-outlets)

Defined in **`lib/outlet-contacts.ts`**:

| Outlet (brandId)     | Phone      | Use |
|----------------------|------------|-----|
| kiik69               | 9274696969 | CTA fallback; not used for default booking link. |
| **alehouse**         | **8096060606** | CTA fallback; not used for default booking link. |
| c53                  | 9484535353 | CTA fallback; booking link when The Hub + C53. |
| boiler-room          | 7073456789 | CTA fallback; booking link when The Hub + Boiler Room. |
| club-rogue-gachibowli| 8328576564 | CTA fallback only. |
| the-hub              | 7013884485 | CTA fallback; same as central booking number. |
| **Any other**        | **7013884485** (DEFAULT_NUMBER) | CTA fallback; **all** booking WhatsApp links. |

- **Alehouse:** Outlet CTA uses DB contacts if set, else **8096060606**. Post-booking WhatsApp link always uses **7013884485** (central number).

Helper used for formatting: `getFullPhoneNumber(phone)` → normalizes to Indian format (e.g. `91` + 10 digits).

---

## 4. Offers (Discounts)

### 4.1 Two sources

- **DB first:** For each venue, `Discount` rows (with optional `DiscountDailyUsage` for slot limits). Admin can edit time window and slots per day.
- **Static fallback:** If the venue has no active `Discount` rows, offers come from **`lib/reservation-discounts.ts`** (see Alehouse example below).

### 4.2 Alehouse offers (static config)

From **`lib/reservation-discounts.ts`** for `alehouse`:

| Offer ID         | Label                          | Time window (24h) | Notes                |
|------------------|--------------------------------|-------------------|----------------------|
| alehouse-127     | Eat & Drink Anything @ ₹127    | 12:00–19:00       | 12PM–7PM             |
| alehouse-flat-30 | 15% Flat Discount              | 12:00–22:00       | 12PM–10PM; no slot count shown (hideSlotsLeft) |

- **Time window:** An offer is shown only if the user’s selected **time slot** falls within `startTime` and `endTime` (inclusive start, exclusive end in code: `slot >= start && slot < end`).
- **Slot limits:** If using DB discounts, each offer has `limitPerDay`; usage is tracked in `DiscountDailyUsage` per (discountId, date). Reset is per calendar day (no explicit cron; next day = new row or zeroed logic).

### 4.3 Offer display rules

- **Time:** Only show offers whose `startTime`/`endTime` include the selected `timeSlot`.
- **Slots:** If DB: show “Limited slots available” / “Selling out fast” / “Few slots left” from remaining count; if `hideSlotsLeft` or “Flat Discount” → no number, only “SOLD OUT” when exhausted.
- **Validation:** On submit, if using DB discounts, backend checks slot availability in a transaction and returns “This discount just sold out” if a limit is exceeded.

---

## 5. Slots (Time Windows & Daily Limits)

### 5.1 Global time slot windows (UI)

- **Lunch:** 12:00 PM – 6:00 PM (`12:00`–`18:00`), 15-minute steps.
- **Dinner:** 6:15 PM – 12:00 AM (`18:15`–`23:45`), 15-minute steps.
- **Today:** Past slots are hidden (client-side: slot time & date compared to `Date.now()`).

### 5.2 Offer-level time windows

- Each offer has optional `startTime` and `endTime` (24h `HH:MM`).
- Example Alehouse: ₹127 valid 12:00–19:00; 30% flat 12:00–22:00.
- Backend and static config both filter by “selected time inside window”.

### 5.3 Daily slot limits (DB only)

- **Discount** table: `limitPerDay` (e.g. 20 or 30).
- **DiscountDailyUsage** table: `(discountId, date, usedCount)`.
- On booking: in a transaction, for each selected discount ID we upsert a row for `(discountId, date)` and increment `usedCount` only if `usedCount < limitPerDay`; else return SOLD_OUT.
- On cancel/delete: decrement `usedCount` for that discount/date (with resilience if table is missing).

---

## 6. Modules and Key Files

### 6.1 Frontend (Next.js App Router)

| Path | Purpose |
|------|--------|
| `app/[outlet]/OutletPageClient.tsx` | Outlet page: hero, contacts CTA, “Book a table” button. |
| `app/[outlet]/reservations/page.tsx` | Booking page wrapper; header with back, outlet switcher. |
| `components/ReservationForm.tsx` | Main booking form: date strip, Lunch/Dinner, time slots, offers, guest count, name/phone, submit. |

### 6.2 APIs

| Method + Path | Purpose |
|---------------|--------|
| `GET /api/venues/[brandId]` | Venue payload: name, address, mapUrl, contactPhone, contactNumbers, gallery, menus, offers (banners). |
| `GET /api/venues/[brandId]/discounts-available?date=YYYY-MM-DD&timeSlot=HH:MM` | List of offers valid for that date+time; includes slots left / sold out; DB first, then static fallback. |
| `POST /api/reservations` | Create reservation; optional discount slot consumption; return `{ success, whatsappUrl, reservationId }`. |

### 6.3 Lib (config / helpers)

| Path | Purpose |
|------|--------|
| `lib/brands.ts` | List of outlets: id, name, shortName, accentColor, etc. |
| `lib/outlet-contacts.ts` | Default phone + WhatsApp message per outlet; `getContactForBrand`, `getFullPhoneNumber`. |
| `lib/reservation-discounts.ts` | Static offers per brand: id, label, description, startTime, endTime, hideSlotsLeft; `getDiscountsForBrand`, `getDiscountLabel`, `isValidDiscountId`. |
| `lib/db.ts` | Prisma client (single instance). |

### 6.4 Database (Prisma)

| Path | Purpose |
|------|--------|
| `prisma/schema.prisma` | Models: User, Venue, Discount, DiscountDailyUsage, Reservation, etc. |

---

## 7. Data Models (Summary)

### 7.1 Venue

- `id`, `brandId` (unique), `name`, `shortName`, `address`, `mapUrl`, `contactPhone`, `contactNumbers` (JSON), timestamps.

### 7.2 Discount (per venue)

- `id`, `venueId`, `title`, `description`, `limitPerDay`, `startTime`, `endTime` (24h string or null), `session` (enum or null), `active`.

### 7.3 DiscountDailyUsage

- `id`, `discountId`, `date` (YYYY-MM-DD), `usedCount`. Unique on `(discountId, date)`.

### 7.4 Reservation

- `id`, `venueId`, `brandId`, `brandName`, `fullName`, `contactNumber`, `numberOfMen`, `numberOfWomen`, `numberOfCouples`, `date`, `timeSlot`, `notes`, `selectedDiscounts` (JSON string array of discount IDs), `status` (PENDING | CONFIRMED | CANCELLED | COMPLETED), timestamps, optional `userId`.

---

## 8. Reservation API Contract

### 8.1 POST /api/reservations

**Request body (JSON):**

- `brandId` (string) — required, e.g. `"alehouse"`.
- `brandName` (string) — required, display name.
- `date` (string) — required, `YYYY-MM-DD`.
- `timeSlot` (string) — required, 24h `HH:MM`.
- `fullName` (string) — required.
- `contactNumber` (string) — required; normalized to 10-digit Indian; validated.
- `numberOfMen`, `numberOfWomen`, `numberOfCouples` (string or number) — required.
- `selectedDiscounts` (array of strings) — optional; discount IDs.
- `notes` (string or null) — optional.
- `hubSpotId` (string or null) — optional; for “The Hub” sub-outlet (c53 / boiler-room / firefly).

**Response 200:**

```json
{
  "success": true,
  "message": "Reservation submitted successfully",
  "whatsappUrl": "https://wa.me/917013884485?text=...",
  "reservationId": "..."
}
```

**Errors:** 400 (missing/invalid fields, invalid discount, SOLD_OUT), 404/500 as applicable.

**WhatsApp message format (pre-filled):**

- Plain text: “Table Reservation | {brandName}”, then name, phone, date, time, guest breakdown, selected offer titles, notes, “Reservation submitted via bassik.in”.

---

## 9. Discounts-Available API Contract

### 9.1 GET /api/venues/[brandId]/discounts-available

**Query:**

- `date` (required): `YYYY-MM-DD`.
- `timeSlot` (required): `HH:MM` (24h).

**Response 200:**

```json
{
  "discounts": [
    {
      "id": "alehouse-127",
      "title": "Eat & Drink Anything @ ₹127",
      "description": "12PM – 7PM",
      "slotsLeft": 20,
      "soldOut": false,
      "timeWindowLabel": "12PM–7PM",
      "hideSlotsLeft": false
    }
  ]
}
```

- Offers are filtered so only those whose `startTime`/`endTime` contain the given `timeSlot` are returned. If DB is used, `slotsLeft` and `soldOut` reflect `DiscountDailyUsage` for that date.

---

## 10. Admin Side (for reference)

- **Venues:** Admin can set per-venue `contactPhone` / `contactNumbers` (used for outlet CTA and can be extended for booking link).
- **Discounts:** Admin can create/edit Discount rows (time window, limitPerDay); slot consumption is via `DiscountDailyUsage`.
- **Bookings:** Admin list/filter by date range and **outlet** (`venueId` = brandId); PATCH status (e.g. CONFIRMED/CANCELLED), DELETE; on cancel/delete, backend frees discount slots for that date.

---

## 11. Alehouse-Specific Summary for Another App

- **Outlet id:** `alehouse`.
- **Contacts (CTA):** Prefer DB; else **8096060606**.
- **Booking WhatsApp number:** Central **7013884485** (no per-outlet override for Alehouse).
- **Offers:**  
  - Eat & Drink @ ₹127 → 12:00–19:00.  
  - 30% Flat Discount → 12:00–22:00; no slot count shown, only SOLD OUT when applicable.
- **Slots:** Lunch 12:00–18:00, Dinner 18:15–24:00; 15-min steps; hide past slots for today.
- **Flow:** Date → Lunch/Dinner → Time → Load offers for that time → User picks offers (optional) → Name, 10-digit mobile, guests → POST reservation → Redirect to WhatsApp with pre-filled message.

Use this guide to replicate the same flow, contact rules, offer time windows, and slot behavior in your other application.
