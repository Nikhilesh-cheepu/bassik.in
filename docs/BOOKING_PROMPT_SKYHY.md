# Booking Page — UI & Flow (SkyHy Copy-Paste Prompt)

Use the following as a prompt for building the SkyHy booking UI and flow. No backend or database details — only what the user sees and what happens when they interact.

---

## PROMPT START (copy from here)

---

**Booking page for SkyHy — UI and flow**

**1. When the page opens, show:**
- A horizontal scrollable strip of **15 days** starting from today. Each day shows: short label (e.g. "Today", "Mon", "Tue") and the day number. One day is selectable at a time; highlight the selected date.
- Below that, two tabs: **Lunch** and **Dinner**. One is active at a time (e.g. default to Lunch if current time is before 6 PM, else Dinner).
- A grid of **time slots** for the active tab only:
  - **Lunch tab:** slots from **12:00 PM to 6:00 PM** in **15-minute steps** (12:00, 12:15, 12:30 … 18:00).
  - **Dinner tab:** slots from **6:15 PM to 12:00 AM** in **15-minute steps** (18:15, 18:30 … 23:45).
- If the selected date is **today**, hide any time slot that is already in the past (compare slot time + selected date to current date-time).
- Initially no date is confirmed for "booking" until the user taps a date; then that date is selected and the Lunch/Dinner tabs and slots use that date. When the user **changes the date**, clear the selected time and any selected offers.

**2. Date selection:**
- **Date module:** Use a simple 15-day strip (no external date-picker library required). Generate an array of 15 items: for each index `i`, the date is "today + i days". Store each day as a string **YYYY-MM-DD** and a display label (e.g. "Today" for i=0, or weekday short name for i>0).
- **When the user selects a date:** Set that date as the "selected date". Reset the selected time slot to none and clear any selected offers. If the selected date is today, set the default tab to Lunch or Dinner based on current time (before 18:00 → Lunch, else Dinner). If the selected date is not today, default to Lunch. Recompute which time slots to show (Lunch vs Dinner) and, for today, filter out past slots.

**3. Time slot selection:**
- **When the user selects a time slot:** Set that slot as the "selected time" (store as 24h string e.g. "14:30"). Only one slot can be selected. After a time is selected, show the **offers section** (see below). If the user changes date or switches Lunch/Dinner, clear the selected time and offers.

**4. Offers section (show only after a time slot is selected):**
- Fetch or compute the list of **offers valid for the selected date and selected time** for SkyHy:
  - **Offer 1:** "Eat & Drink Anything @ ₹128" — time window **12:00–20:00** (12PM–8PM). Show only if selected time falls in this window.
  - **Offer 2:** "30% Flat Discount" — time window **12:00–22:00** (12PM–10PM). Show only if selected time falls in this window. Do not show remaining slot count (only SOLD OUT if applicable).
- **Offer visibility rule:** An offer is shown only if the **selected time** falls inside that offer's time window. Example: if user selected 2:30 PM, show both offers; if user selected 9:30 PM, show only the 30% Flat Discount; if user selected 10:30 PM, show neither.
- Display each offer as a card/row. User can select **zero or more** offers (e.g. checkboxes or toggle). Disabled state for offers marked SOLD OUT.
- If the selected time changes or the date changes, refresh the offers list (and clear selections if you cleared the time).

**5. Rest of the form (always visible or shown in order):**
- **Guests:** A number (e.g. 1–20), or separate Men / Women / Couples if you want. Minimum 1.
- **Full name** (required).
- **Contact number:** 10-digit Indian mobile (required). Validate on submit.
- **Notes** (optional).
- **Primary button:** e.g. "Confirm Booking".

**6. When the user taps "Confirm Booking":**
- Validate: selected date, selected time, at least 1 guest, non-empty name, valid 10-digit phone. If invalid, show errors and do not proceed.
- Build a **WhatsApp pre-filled message** as plain text. Example format:
  ```
  Table Reservation | SkyHy

  [Full Name] | [Contact Number]

  [Date, e.g. 18 Jan 2026] | [Time in 12h, e.g. 2:30 PM]

  [Guest line, e.g. 2 Guests (2M / 0W / 0 Couples)]
  [If any offers selected, add one line per offer title]
  [If notes, add notes]

  Reservation submitted via [your app name]
  ```
- Build the WhatsApp link: `https://wa.me/91[10-digit-number]?text=[URL-encoded message]`. Use **SkyHy's WhatsApp number** (e.g. 7013884485 → 917013884485). Replace with SkyHy's actual 10-digit number when known. Final URL: `https://wa.me/917013884485?text=...` (or SkyHy's own number).
- **Open that URL** in the same tab or a new tab (e.g. `window.location.href = whatsappUrl` or `window.open(whatsappUrl, '_blank')`). The user then sends the message from WhatsApp; no server submission required if you are doing a "client-only" flow.

**7. Summary of logic for SkyHy:**
- **Outlet name:** SkyHy (SkyHy Live / rooftop lounge).
- **Dates:** 15-day strip from today; store YYYY-MM-DD; on date change → clear time and offers; for "today" hide past slots.
- **Slots:** Lunch 12:00–18:00, Dinner 18:15–23:45, 15-min steps; only show slots for the active tab; for today, filter out past.
- **Offers:**
  - Eat & Drink @ ₹128 → 12:00–20:00.
  - 30% Flat Discount → 12:00–22:00; no slot count shown, only SOLD OUT when applicable.
- **Offer IDs (if needed):** `skyhy-128`, `skyhy-flat-30`.
- **Submit:** Validate → build message string → build `wa.me` URL with 91 + 10-digit SkyHy number → redirect or open URL.

No admin, no database, no API required for this UI-only flow — only SkyHy's WhatsApp number (replace 7013884485 with SkyHy's number when you have it) and the message format above.

---

## PROMPT END (copy until here)
