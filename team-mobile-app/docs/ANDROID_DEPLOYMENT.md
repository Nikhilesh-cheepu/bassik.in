# Android Play Store Deployment Guide

Complete guide to publishing the Bassik Team mobile app to the Google Play Store.

## Prerequisites

### Required Accounts
- **Google Play Console Developer Account** ($25 one-time fee)
  - Sign up at: https://play.google.com/console/signup

### Required Software
- Node.js and npm
- Expo CLI installed
- No Android Studio required (EAS handles builds)

## Step 1: Configure Your App

### 1.1 Update app.json

Edit `app.json` with your Android app details:

```json
{
  "expo": {
    "name": "Bassik Team",
    "slug": "bassik-team",
    "version": "1.0.0",
    "android": {
      "package": "in.bassik.team",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

### 1.2 Create App Icons

Required icons:
- **Adaptive Icon (Foreground)**: 1024x1024 PNG
- **App Icon**: 512x512 PNG (for Play Store)

Place them in the `assets/` folder.

## Step 2: Install EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize EAS in your project
eas build:configure
```

## Step 3: Configure EAS Build

Your `eas.json` should look like:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

## Step 4: Create App in Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name**: Bassik Team
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - **Declarations**: Check required boxes

4. Click **Create app**

## Step 5: Set Up Play Store Listing

### Store Presence → Main Store Listing

**App details:**
- Short description (80 chars max):
  ```
  Internal task management for Bassik team members
  ```

- Full description (4000 chars max):
  ```
  Bassik Team is an internal task management application designed exclusively for Bassik team members.

  Key Features:
  • Task Management - View and manage ad tasks across all outlets
  • Personal Notes - Create and organize your personal notes
  • Reminders - Set reminders to stay on top of your work
  • Team AI Assistant - Get help from AI for team coordination
  • Reports - Generate WhatsApp and done reports
  • Real-time Updates - Stay synced with the latest task updates

  This app requires authentication with a team password and is only accessible to authorized Bassik team members.

  For support, contact your team administrator.
  ```

**App Icon:**
- Upload 512x512 PNG icon

**Screenshots:** (Required: at least 2 per device type)
- Phone: 16:9 or 9:16 aspect ratio
  - Minimum 320px
  - Maximum 3840px
- 7-inch tablet: Optional
- 10-inch tablet: Optional

Generate screenshots by running app and taking screenshots.

**Categorization:**
- **App category**: Productivity
- **Tags**: task management, internal, team

**Contact details:**
- Email: your-email@bassik.in
- Phone: Optional
- Website: https://bassik.in

**Privacy Policy:**
- URL: https://bassik.in/privacy (you need to host this)

## Step 6: Content Rating

1. Go to **Policy → App content → Content rating**
2. Fill out questionnaire:
   - Select "Productivity"
   - Answer questions about content
   - Usually results in "Everyone" rating
3. Submit for rating

## Step 7: Set Up Store Settings

### Test Tracks (Optional but Recommended)

Before production release, create internal test track:

1. Go to **Release → Testing → Internal testing**
2. Create new release
3. Add testers' email addresses
4. They'll get access to test the app

### Countries & Regions

1. Go to **Release → Production → Countries/regions**
2. Select:
   - **All countries** OR
   - **Specific countries** (e.g., India only)

### Pricing

1. Go to **Release → Production → Pricing**
2. Set to **Free**

## Step 8: Build for Android

```bash
# Build production AAB (Android App Bundle)
eas build --platform android --profile production

# This creates an .aab file
# Build takes 10-20 minutes
```

**First time?** EAS will:
- Create Android keystore automatically
- Store it securely in Expo
- Use same keystore for all future builds (important!)

### Testing APK (Optional)

For testing outside Play Store:

```bash
# Build APK for direct install
eas build --platform android --profile preview
```

Download and install on Android device.

## Step 9: Submit to Play Store

### Option A: Automatic Submission (Recommended)

1. Create service account key:
   ```bash
   # Follow instructions at:
   # https://github.com/expo/fyi/blob/main/creating-google-service-account.md
   ```

2. Download JSON key file
3. Save as `google-play-service-account.json` in project root
4. Submit:
   ```bash
   eas submit --platform android --profile production
   ```

### Option B: Manual Upload

1. Go to Play Console → **Release → Production**
2. Click **Create new release**
3. Download `.aab` file from EAS build
4. Upload it to Play Console
5. Add release notes:
   ```
   Initial release of Bassik Team app
   
   Features:
   - Task management
   - Personal notes
   - Reminders
   - Team AI
   - Reports
   ```

## Step 10: Complete App Review Requirements

### Privacy Policy
Required. Host on your website and provide URL.

### Data Safety
Go to **Policy → App content → Data safety**

Declare:
- **Data collected**:
  - Personal info (name)
  - Contact info (phone, email)
- **Data usage**:
  - App functionality
  - Account management
- **Data sharing**: No data shared with third parties
- **Security practices**:
  - Data encrypted in transit
  - User authentication required

### Target Audience
- **Target age group**: 18 and older
- **Content**: General audience

### Government Apps (if applicable)
- Indicate if this is a government app

## Step 11: Release Production Version

1. Go to **Release → Production → Releases**
2. Click **Create new release**
3. Upload your `.aab` file
4. Review release details
5. Click **Review release**
6. Click **Start rollout to Production**

### Rollout Options:
- **Staged rollout**: Release to percentage of users first
- **Full rollout**: Release to all users immediately

**Review time**: Usually 1-3 days (can be up to 7 days)

## Step 12: After Approval

Once approved:
- App appears on Play Store
- Track statistics in Play Console
- Monitor reviews and ratings
- Respond to user feedback

## Updating Your App

For future updates:

1. Update version in `app.json`:
   ```json
   {
     "version": "1.0.1",
     "android": {
       "versionCode": 2
     }
   }
   ```
   
   **Important**: `versionCode` must increment with each release

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Submit update:
   ```bash
   eas submit --platform android --profile production
   ```

4. Add release notes describing changes

## Internal Distribution (Alternative)

If you don't want to publish publicly:

### Option 1: Internal Testing Track

```bash
# Build for internal testing
eas build --platform android --profile production
```

Upload to **Internal testing** track in Play Console.
Add up to 100 internal testers via email.

### Option 2: Direct APK Distribution

```bash
# Build APK
eas build --platform android --profile preview
```

Share APK file directly with team members.
They need to enable "Install unknown apps" in Android settings.

## App Signing

Google manages app signing:
- **Upload key**: Created by EAS, used to sign uploads
- **App signing key**: Google's key, used for distribution

This allows Google to optimize APKs for different devices.

## Troubleshooting

### Build Fails
```bash
# Clear cache and retry
eas build --platform android --profile production --clear-cache
```

### Keystore Issues
```bash
# Manage credentials
eas credentials
```

**Critical**: Never lose your keystore! EAS stores it securely.

### Upload Rejected
Common issues:
- Missing privacy policy
- Incomplete data safety section
- Content rating not completed
- Missing screenshots

### App Crashes
- Test on physical Android device before submitting
- Check logs: `adb logcat`

## Testing Before Release

1. **Internal testing**: Create internal test track
2. **Closed testing**: Invite specific testers
3. **Open testing**: Public beta test
4. **Production**: Full release

Recommended flow: Internal → Closed → Production

## Costs

- **Google Play Developer Account**: $25 one-time
- **Expo EAS Builds**: Free tier available
- **App Listing**: Free (no per-app fees)

## Release Checklist

- [ ] Updated version and versionCode
- [ ] Created new build
- [ ] Tested on Android device
- [ ] Updated screenshots
- [ ] Written release notes
- [ ] Completed all Play Console sections
- [ ] Privacy policy URL working
- [ ] Content rating completed
- [ ] Data safety form filled

## Resources

- [Expo Android Build Documentation](https://docs.expo.dev/build/setup/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Play Store Review Guidelines](https://play.google.com/about/developer-content-policy/)
