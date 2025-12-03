# Bassik Reservations Hub

A modern, mobile-first booking hub website that acts as the command center for all venue reservations.

## Features

- **8 Brand Tabs**: Switch between different venues with brand-specific styling
- **Dynamic Form**: Reservation form that adapts to the selected brand's accent color
- **Mobile-First Design**: Responsive layout optimized for all screen sizes
- **Dark Theme**: Premium nightclub aesthetic with dark background
- **API Integration**: Ready-to-connect API endpoint for handling reservations

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React 18**

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── reservations/
│   │       └── route.ts      # API endpoint for reservations
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── BrandTabs.tsx         # Brand navigation tabs
│   └── ReservationForm.tsx   # Reservation form component
└── lib/
    └── brands.ts             # Brand configuration
```

## API Endpoint

The reservation form submits to `/api/reservations` (POST). Currently, it logs the reservation details. To integrate with a messaging service:

1. Update `/app/api/reservations/route.ts`
2. Add your preferred service (WhatsApp Business API, Twilio, etc.)
3. The phone number `7013884485` is configured in the route

## Customization

### Adding/Modifying Brands

Edit `/lib/brands.ts` to add or modify brands. Each brand requires:
- `id`: Unique identifier
- `name`: Full brand name
- `shortName`: Display name for tabs
- `accentColor`: Hex color code
- `exploreUrl`: Link to brand website

### Styling

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Brand colors are dynamically applied via inline styles

## License

Private project - All rights reserved

