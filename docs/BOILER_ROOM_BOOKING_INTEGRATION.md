# Boiler Room only — table booking from the home screen (handoff doc)

**Who this is for:** You are building **one website: Boiler Room.** There is no bigger “directory” of venues and no other brand. The user opens **your Boiler Room home page** and that’s it.

**What you need to implement:** From the **Book table** button **fixed at the bottom of the home screen**, take the user through choosing date → time → offers → guests → details → confirm. Then save the booking and send WhatsApp (Interakt) like below.

This doc uses **simple words** first, then the exact **API and WhatsApp** details your backend must match if you reuse the same templates and payloads.

---

## 1. The only journey you have to explain (table booking)

**Assume:** User is already on the **Boiler Room home screen** (`/` on your site). They see photos, events, whatever you put on home — plus a **Book table** button at the **bottom** (sticky bar or same idea).

**Step 1 — User taps “Book table”**  
Open the **booking screen**. On a dedicated site, a clean URL is `/book` (you can use any path; the important part is the **screen** and the **API** below).

**Step 2 — On the booking screen, top to bottom**

1. **Pick a day**
  A row of days (e.g. next **15 days** starting today). Tapping a day selects it and clears the time and any chosen offers so the user starts fresh for that day.
2. **Pick lunch or dinner, then a time**
  - Two tabs: **Lunch** and **Dinner**.  
  - **Lunch:** times from **12:00** to **18:00**, every **15 minutes**.  
  - **Dinner:** from **18:15** to end of evening, every **15 minutes**.  
  - If the day is **today**, hide or disable times that are already in the past.  
  - When they tap a time, you store it as **24-hour** text like `19:30` (this is what the server expects).
3. **Pick offers (after a time is chosen)**
  Your app asks the server which offers are valid for **this outlet + this date + this time + lunch or dinner**.  
   Show a list; the user can tick **one or more**. Each offer has an **id** (see below for Boiler Room).
4. **How many guests**
  A simple control from **1** to **20** (or your cap). The old API shape sends all guests as `numberOfMen` and sends `0` for women and couples — copy that so existing backends work.
5. **Name and mobile**
  Full name + **10-digit** Indian mobile (numbers only).
6. **Confirm**
  A big sticky button at the bottom, e.g. **Confirm Booking**. Until day, time, name, phone, and guest count are valid, keep it disabled.

**Step 3 — After a successful booking**  
Show a **success state on the same site** (message like “Booking confirmed”, WhatsApp sent). **Do not** send the user off to WhatsApp in the browser to “finish” the booking.  
A **Back to home** (or “Done”) button should return them to `/`.

That’s the full user story for **table** booking. No separate “outlet page” is required on a Boiler Room–only site unless you want extra marketing pages.

---

## 2. Words your backend still uses (even on a small site)


| What                         | Value                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Outlet id**                | Always `boiler-room` in JSON when you talk to the same API as this project.                                        |
| **Outlet name**              | `Boiler Room` in the JSON field `brandName` where the API expects it.                                              |
| **Save booking**             | `POST /api/reservations` with JSON (next section).                                                                 |
| **Load offers for the form** | `GET /api/venues/boiler-room/discounts-available?date=YYYY-MM-DD&timeSlot=HH:MM&session=lunch` or `session=dinner` |
| **WhatsApp**                 | Interakt template message API (details in section 4).                                                              |


Your **home** can live at `/` and your **book** screen at `/book`. The reference Bassik codebase used `/boiler-room` and `/boiler-room/book` because many outlets lived on one domain — **you don’t need those URLs** on a Boiler Room–only domain; you only need the **same request bodies and Interakt variable order** if you share templates.

---

## 3. JSON sent when the user taps Confirm (`POST /api/reservations`)

Example body (table booking, no event):

```json
{
  "fullName": "Priya Sharma",
  "contactNumber": "9876543210",
  "numberOfMen": "4",
  "numberOfWomen": "0",
  "numberOfCouples": "0",
  "date": "2026-04-22",
  "timeSlot": "20:00",
  "notes": null,
  "selectedDiscounts": ["boiler-127"],
  "brandId": "boiler-room",
  "brandName": "Boiler Room",
  "hubSpotId": null
}
```

- `**selectedDiscounts`:** array of string ids the user selected (can be empty `[]`).  
- **Do not send `eventId`** for a normal table booking.

On **success**, the API returns JSON including `reservationId`. Show that if you want a reference number.

**Success screen:** After 200 OK, show confirmation + optional “Back to home” to `/`.

---

## 4. What the server does (short checklist)

1. Check all required fields and a valid 10-digit phone.
2. Normalize phone (strip spaces; handle `91` / leading `0` if you copy the same rules).
3. Find the venue row for `brandId: "boiler-room"` in the database.
4. Save one **reservation** row (status **confirmed** in the reference app).
5. **Interakt — guest:** send the **table** template to the guest’s number with **nine** body fields in the fixed order (section 5).
6. **Interakt — staff (optional):** if you set a staff number in env and it’s not the same as the guest, send the **outlet** copy template with the **same nine** values.
7. **Double-tap protection:** if the same booking is submitted again within about **30 seconds**, don’t send duplicate WhatsApp; still respond OK.

If Interakt fails for the **guest**, return an error so the UI can say “try again”. (Staff failure can be logged only in the reference implementation.)

---

## 5. Interakt — table template: nine placeholders (`{{1}}` … `{{9}}`)

**English only:** `languageCode: "en"`.

**HTTP:** `POST https://api.interakt.ai/v1/public/message/`  
**Header:** `Authorization: Basic <your Interakt API key>`  
**Body shape:**

```json
{
  "countryCode": "+91",
  "phoneNumber": "9876543210",
  "type": "Template",
  "callbackData": "<reservationId>",
  "template": {
    "name": "bassik_website",
    "languageCode": "en",
    "bodyValues": ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9"]
  }
}
```

**Order of `bodyValues` (must match the template):**


| #   | Meaning                                               |
| --- | ----------------------------------------------------- |
| 1   | Outlet name as you want it printed (e.g. Boiler Room) |
| 2   | Guest full name                                       |
| 3   | Guest phone (10 digits)                               |
| 4   | Booking date, short text (e.g. `22 Apr 2026`)         |
| 5   | Booking time, 12-hour (e.g. `8:00 PM`)                |
| 6   | Notes or `-` if empty                                 |
| 7   | Offers line built from selected discount ids, or `NA` |
| 8   | Total guests as text                                  |
| 9   | `CONFIRMED`                                           |


**Env names (same templates as this project if you want):**

- Guest table: `INTERAKT_BOOKING_TEMPLATE_NAME` (default `bassik_website`), `INTERAKT_BOOKING_TEMPLATE_LANGUAGE_CODE=en`  
- Staff table copy: `INTERAKT_STAFF_BOOKING_TEMPLATE_NAME` (default `bassik_website_outlet`), staff phone `INTERAKT_STAFF_NOTIFY_PHONE`

---

## 6. Offers for Boiler Room (ids the form and API understand)

Until you build admin-driven offers, you can keep a **fixed list** for `boiler-room`:


| id               | What the user sees (short)                        | Valid times (24h) for “is this slot allowed” |
| ---------------- | ------------------------------------------------- | -------------------------------------------- |
| `boiler-127`     | Eat & Drink Anything @ ₹127 (12PM–7PM style copy) | `12:00`–`19:00`                              |
| `boiler-flat-30` | 15% flat discount on à la carte                   | `12:00`–`22:00`                              |


The discounts endpoint filters by the chosen **time slot** so only matching offers appear.

---

## 7. Optional: events on the same Boiler Room site

If your **home** also shows **event posters** and a “book this event” flow, that is a **second** small form (name, phone, people, date, time) that still calls `POST /api/reservations` but adds `**eventId`** and `**eventName`**. Then the server uses the **event** WhatsApp template (**eight** placeholders), not the table one.  
You can add this later; the **Book table** bottom button flow does not depend on it.

---

## 8. Admin / content (your Boiler Room site)

- **Menus, photos, text on home:** your CMS or admin screens + database.  
- **These static offer ids** for the booking form: code or config until you move them to DB.

---

## 9. Copy-paste prompt for an AI (standalone Boiler Room website)

---

Build **one** website for **Boiler Room** only.

**Home (`/`):** Boiler Room branding, content you like, and a **fixed bottom button: “Book table”**. Tapping it goes to `**/book`** (or equivalent).

**Book page:** Implement the steps in order: 15-day date strip → Lunch/Dinner tabs → 15-minute slots (lunch 12:00–18:00, dinner from 18:15; hide past times today) → after time selected, `GET /api/venues/boiler-room/discounts-available?date=&timeSlot=&session=lunch|dinner` → multi-select offers → guests 1–20 → name + 10-digit phone → sticky **Confirm Booking**.

**Submit:** `POST /api/reservations` with `brandId: "boiler-room"`, `brandName: "Boiler Room"`, guest fields as in the spec, `selectedDiscounts` as id strings, `hubSpotId: null`, no `eventId` for table bookings.

**After save:** Interakt guest message with template `bassik_website`, `en`, and **nine** `bodyValues` in the documented order; optional second message to staff template `bassik_website_outlet` if env phone set. No WhatsApp redirect for the user — show on-site success and **Back to home**.

**Static offers:** ids `boiler-127` and `boiler-flat-30` with the time windows described. **Idempotency:** no duplicate guest WhatsApp within ~30s for identical booking fingerprint.

---

## 10. Where to look in the original Bassik repo (optional)

Only if you are **copying code** from this monorepo:


| Piece                    | File                                                    |
| ------------------------ | ------------------------------------------------------- |
| Form behaviour           | `components/ReservationForm.tsx`                        |
| Save + Interakt          | `app/api/reservations/route.ts`                         |
| Discounts endpoint       | `app/api/venues/[brandId]/discounts-available/route.ts` |
| Boiler offer definitions | `lib/reservation-discounts.ts` (`"boiler-room"` block)  |


On your **new** Boiler Room–only project you **do not** need `HomeTrail`, multi-outlet cards, or `/boiler-room` URLs — only the **booking behaviour** and **API contract** above.

---

*End of document.*