# Bassik Content Ops — Who Owns What

## Lanes

| Person | Owns |
| --- | --- |
| **You (Admin)** | Fill artist briefs on **Design** tab; WhatsApp OK; keep queue fed (≥1 day Ready) |
| **Mahesh** | Weekend Fri/Sat/Sun creatives — Design queue, 4/day target |
| **Jeslyn** | Mon–Thu stories — Design queue (weekday lane) |
| **Amit** | Download Ready from **Daily** → post → Done. Ads + GBP |
| **Srinath** | Separate shoots lane — not in Design → Amit pipeline |

## Design tab flow (Mahesh / Jeslyn)

```
Admin seeds month → fills brief → Brief ready
        ↓
Designer: Start Job (one at a time)
        ↓
Send WhatsApp as soon as each creative is done
        ↓
You: OK / edits
        ↓
Designer: Upload & close (WA approved checkbox + file)
        ↓
Amit sees green Ready on Daily + Download
```

### Timings (IST) — Designers

| Who | Go-live | Design due |
| --- | --- | --- |
| **Jeslyn** | Mon–Thu stories | **Day before @ 8:00 PM** (Mon flyer → **Sunday 8 PM**) |
| **Mahesh** | Fri–Sat–Sun | **Go-live − 4 days @ 8:00 PM** (Fri → Mon 8 PM, Sat → Tue, Sun → Wed) |

- Send each creative on WA when finished (not batched).
- **Last WA by 19:00.**
- **Upload & close by 20:00** on that due day.
- Target **4 closed jobs/day is mandatory** (red flag after 18:00 IST if under). Finishing this week’s calendar does **not** pause work — Ready briefs can land any day.
- Auto WA nudges (Meta Cloud API) list **Ready to start** only — never Waiting brief.
- **No leave bank** — pull ahead and finish before a day off.
- Idle queue = admin must add briefs / ad-hoc work.

### Single job lock

Only one `IN_PROGRESS` job per designer. Finish (Upload & close) before Start next. Admin can Force clear if stuck.

### Train Mahesh (one-liner)

> After Nikhil says OK on WhatsApp: Design → Upload & close on that job (tick WA approved). Do not wait for him to forward. Then Start the next Ready job.

## Daily tab (Amit)

Green Ready + Download = post it. Mark Done with platforms.

### Timings (IST)

- **Stories (Amit):** post by **11:00 PM** the day before (Mon story → Sunday). Aim ~**10:00 PM**. Avoid before **8:00 PM** — stories only last 24h. Jeslyn’s design due is earlier that same day (**8:00 PM**).
- **Weekend posts (Amit):** post by **11:00 PM** the day before go-live (Sat post → Fri 11 PM). Mahesh’s design due is **4 days earlier @ 8:00 PM**.
- **Weekend ads:** start from the same −4d day as Mahesh (Fri ad → Mon).
- When Mahesh uploads a weekend creative, **Story + Post + Ad** for that go-live day all get the same Ready download.

## Rolling 30-day schedule (not calendar months)

- Design queue is always **today → today+29**.
- Anything with design due **before today** is auto-closed (no backlog chase).
- Mahesh = weekend posts · Jeslyn = Mon–Thu stories — same Start / WA / Upload rules.
- Re-seed anytime: **Seed next 30 days** (skips slots that already exist).

## Admin ritual

1. Design → **Seed next 30 days** (or Mahesh / Jeslyn only).
2. When artist known → paste brief → Save + brief ready.
3. Add Urgent / ad-hoc when something jumps the queue.
4. Friday 15 min: only reds (late uploads, empty throughput).
