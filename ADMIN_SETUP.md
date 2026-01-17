# Admin Panel Setup Guide

## Two-Level Admin System

### Main Admin (MAIN_ADMIN)
- Can manage **all venues** and their content
- Can create and manage other admins
- Can assign venue permissions to regular admins
- Can view all bookings across all venues
- Full system access

### Regular Admin (ADMIN)
- Can only manage **assigned venues** (permissions set by main admin)
- Can view bookings only for their assigned venues
- Cannot create or manage other admins
- Limited to their assigned outlets

## Cover Image Aspect Ratio

**Required Aspect Ratio: 16:9**

- Recommended dimensions: **1920x1080 pixels**
- Minimum: 1280x720 pixels
- Maximum file size: 5MB
- Accepted formats: JPG, PNG, WebP
- Maximum 3 cover images per venue

## Initial Setup

1. **Create Main Admin:**
   ```bash
   npm run create-admin
   ```
   Or set environment variables:
   - `ADMIN_USERNAME` (default: admin)
   - `ADMIN_PASSWORD` (default: changeme123)
   - `ADMIN_ROLE` (default: MAIN_ADMIN)

2. **Set Environment Variables:**
   Create a `.env` file with:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key-change-in-production"
   ADMIN_USERNAME="admin"
   ADMIN_PASSWORD="your-secure-password"
   ADMIN_ROLE="MAIN_ADMIN"
   ```

3. **Run Database Migrations:**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

4. **Access Admin Panel:**
   - Go to: `http://localhost:3000/admin`
   - Login with username and password

## Admin Features

### Main Admin Features:
- **Venue Management:** Add/edit all venue details
- **Admin Management:** Create new admins and assign venue permissions
- **Cover Images:** Upload up to 3 cover images per venue (16:9 ratio required)
- **Gallery Images:** Upload multiple gallery images
- **Menu Management:** Upload Food Menu and Liquor Menu with multiple pages
- **Bookings View:** View all bookings across all venues
- **Booking Status:** Update reservation status (Pending, Confirmed, Cancelled, Completed)

### Regular Admin Features:
- **Venue Management:** Edit only assigned venues
- **Cover Images:** Upload for assigned venues only
- **Gallery Images:** Upload for assigned venues only
- **Menu Management:** Upload menus for assigned venues only
- **Bookings View:** View bookings only for assigned venues
- **Booking Status:** Update status for their venue bookings

## Creating New Admins

Only Main Admin can create new admins:

1. Login as Main Admin
2. Go to Admin Management section
3. Click "Create New Admin"
4. Enter:
   - Username
   - Password
   - Role (MAIN_ADMIN or ADMIN)
   - Venue Permissions (for ADMIN role - select which venues they can manage)

## Bookings System

- All reservations are automatically saved to the database
- Admins can view bookings filtered by:
  - Venue (brandId)
  - Status (Pending, Confirmed, Cancelled, Completed)
  - Date
- Main Admin sees all bookings
- Regular Admins see only bookings for their assigned venues
- Booking status can be updated by admins

## Database Schema

- **Admin:** Admin users with roles and permissions
- **AdminVenuePermission:** Links admins to venues they can manage
- **Venue:** Main venue information
- **VenueImage:** Cover and gallery images (type: COVER or GALLERY)
- **Menu:** Menu folders (Food Menu, Liquor Menu)
- **MenuImage:** Individual menu page images
- **Reservation:** Booking records with status tracking

## API Endpoints

### Admin Authentication:
- `POST /api/admin/login` - Login with username/password
- `GET /api/admin/me` - Get current admin info

### Admin Management (Main Admin only):
- `GET /api/admin/admins` - List all admins
- `POST /api/admin/admins` - Create new admin

### Venue Management:
- `GET /api/admin/venues` - List venues (filtered by permissions)
- `POST /api/admin/venues` - Create/update venue
- `POST /api/admin/venues/[brandId]/images` - Upload venue images
- `POST /api/admin/venues/[brandId]/menus` - Upload menus

### Bookings:
- `GET /api/admin/bookings` - List bookings (filtered by permissions)
- `PATCH /api/admin/bookings` - Update booking status
