# iOS App Store Deployment Guide

Complete guide to publishing the Bassik Team mobile app to the Apple App Store.

## Prerequisites

### Required Accounts
- **Apple Developer Account** ($99/year)
  - Sign up at: https://developer.apple.com
  - Must be enrolled in Apple Developer Program

### Required Software
- macOS computer (required for iOS builds)
- Xcode installed (for testing on simulators)
- Expo CLI installed

## Step 1: Configure Your App

### 1.1 Update app.json

Edit `app.json` with your app details:

```json
{
  "expo": {
    "name": "Bassik Team",
    "slug": "bassik-team",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "in.bassik.team",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "in.bassik.team"
    }
  }
}
```

### 1.2 Create App Icons

You need these icon sizes:
- **Icon**: 1024x1024 PNG (app.json: `icon`)
- **Splash Screen**: 1242x2436 PNG (app.json: `splash.image`)

Place them in the `assets/` folder.

## Step 2: Install Expo Application Services (EAS)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize EAS in your project
eas build:configure
```

This creates `eas.json` configuration file.

## Step 3: Configure EAS Build

Update `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-asc-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

## Step 4: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **Apps** → **+** button
3. Fill in:
   - **Name**: Bassik Team
   - **Primary Language**: English
   - **Bundle ID**: `in.bassik.team` (must match app.json)
   - **SKU**: bassik-team-001 (any unique identifier)
   - **User Access**: Full Access

4. Save and note your **App ID** (needed for EAS submission)

## Step 5: Prepare App Store Listing

### Required Information

**App Information:**
- Name: Bassik Team
- Subtitle: Internal Task Management
- Category: Productivity
- Privacy Policy URL: (required - host on your website)

**Description:**
```
Internal task management app for the Bassik team.

Features:
• Manage ad tasks across all outlets
• Personal notes and reminders
• Team AI assistant
• WhatsApp and done reports
• Real-time task updates

For authorized Bassik team members only.
```

**Keywords:**
```
task,management,team,productivity,bassik,internal
```

**Screenshots Required:**
- 6.7" iPhone: 1290 x 2796 pixels (at least 1)
- 5.5" iPhone: 1242 x 2208 pixels (optional)
- 12.9" iPad Pro: 2048 x 2732 pixels (if supporting iPad)

Generate screenshots by running the app and taking screenshots.

## Step 6: Build for iOS

```bash
# Build for production
eas build --platform ios --profile production

# This will:
# 1. Ask for your Apple ID credentials
# 2. Handle code signing automatically
# 3. Create a .ipa file
# 4. Upload to Expo servers
```

**First time?** EAS will:
- Create iOS distribution certificate
- Create provisioning profile
- Store in your Expo account

Build takes 10-30 minutes.

## Step 7: Submit to App Store

### Option A: Automatic Submission (Recommended)

```bash
eas submit --platform ios --profile production
```

This uploads your build directly to App Store Connect.

### Option B: Manual Submission

1. Download the `.ipa` file from EAS build page
2. Use **Transporter** app (free from Mac App Store)
3. Drag `.ipa` file into Transporter
4. Click **Deliver**

## Step 8: Complete App Store Listing

1. Go to App Store Connect
2. Your build should appear under **TestFlight** → **iOS**
3. Go to **App Store** tab
4. Fill in required fields:
   - Screenshots
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
   - App Review Information
   - Contact information

### App Review Information

Since this is an internal app, provide:
- **Demo Account**: A test password
- **Notes**: "Internal app for Bassik team members only. Requires team password to access."

## Step 9: Submit for Review

1. Select your build version
2. Set pricing: **Free** (or paid if needed)
3. Set availability: **All countries** or specific regions
4. Click **Add for Review**
5. Answer questionnaires (export compliance, ads, etc.)
6. Click **Submit for Review**

**Review time**: Usually 24-48 hours

## Step 10: After Approval

Once approved:
- App appears on App Store
- Team members can download it
- You can track installs in App Store Connect

## Updating Your App

For future updates:

1. Update version in `app.json`:
   ```json
   {
     "version": "1.0.1",
     "ios": {
       "buildNumber": "2"
     }
   }
   ```

2. Build and submit:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --profile production
   ```

3. Update listing in App Store Connect with "What's New" text

## Internal Distribution (Alternative)

If you don't want to publish publicly:

### Option 1: TestFlight (Recommended for Internal)

```bash
# Build for TestFlight
eas build --platform ios --profile preview

# App is available in TestFlight for up to 100 internal testers
```

Testers download TestFlight app and use invite link.

### Option 2: Enterprise Distribution

Requires Apple Enterprise Developer account ($299/year).
Allows unlimited internal distribution without App Store review.

## Troubleshooting

### Build Fails
```bash
# Clear cache and retry
eas build --platform ios --profile production --clear-cache
```

### Code Signing Issues
```bash
# Let EAS manage credentials automatically
eas credentials
```

### App Rejected
Common reasons:
- Missing privacy policy
- Misleading app name/description
- Crashes during review
- Missing demo account

Fix issues and resubmit.

## Costs

- **Apple Developer Account**: $99/year (required)
- **Expo EAS Builds**: Free tier includes builds, or paid plans for more
- **App Store Listing**: Free (no per-app fees)

## Resources

- [Expo iOS Build Documentation](https://docs.expo.dev/build/setup/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
