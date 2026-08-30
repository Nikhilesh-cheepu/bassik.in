# Bassik Team Mobile App

Internal task management mobile application for the Bassik team.

## Features

- 📋 **Task Management** - View, create, and manage ad tasks for different outlets
- 📝 **Personal Notes** - Create and manage your personal notes
- ⏰ **Reminders** - Set and track reminders
- 🤖 **Team AI** - Chat with AI assistant for team coordination
- 📊 **Reports** - Generate WhatsApp and done reports

## Tech Stack

- **React Native** with Expo
- **TypeScript**
- **React Navigation** for routing
- **Axios** for API calls
- **Expo Secure Store** for authentication

## Prerequisites

Before you begin, make sure you have:

- Node.js (v16 or higher) installed
- npm or yarn package manager
- Expo Go app installed on your phone (for testing)
- For iOS development: macOS with Xcode
- For Android development: Android Studio

## Installation

1. Clone the repository and navigate to the mobile app:
   ```bash
   cd team-mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the API URL:
   - For development with local server:
     ```bash
     # Create .env file
     echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:3000" > .env
     ```
   - For production:
     ```bash
     echo "EXPO_PUBLIC_API_URL=https://bassik.in" > .env
     ```

## Running the App

### Development Mode

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Choose how to run:
   - **iPhone**: Press `i` or scan QR code with Camera app
   - **Android**: Press `a` or scan QR code with Expo Go app
   - **Web**: Press `w` (for testing only)

### Running on Physical Device

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Start the dev server: `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Running on Simulator/Emulator

**iOS Simulator (macOS only):**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

## Project Structure

```
team-mobile-app/
├── src/
│   ├── api/              # API client and endpoints
│   │   ├── client.ts     # Axios client with auth
│   │   ├── auth.ts       # Authentication API
│   │   ├── tasks.ts      # Tasks API
│   │   ├── notes.ts      # Notes API
│   │   ├── reminders.ts  # Reminders API
│   │   ├── ai.ts         # AI API
│   │   └── reports.ts    # Reports API
│   ├── config/
│   │   └── api.ts        # API configuration
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── NotesScreen.tsx
│   │   ├── RemindersScreen.tsx
│   │   ├── AIScreen.tsx
│   │   └── ReportsScreen.tsx
│   ├── types/
│   │   └── team.ts       # TypeScript types
│   └── utils/
│       └── AuthContext.tsx
├── App.tsx
└── package.json
```

## Building for Production

See the detailed guides:
- [iOS App Store Submission](./docs/IOS_DEPLOYMENT.md)
- [Android Play Store Submission](./docs/ANDROID_DEPLOYMENT.md)

### Quick Build Commands

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

## Configuration

### API URL

Update the API URL in `src/config/api.ts`:
```typescript
export const BASE_URL = 'https://bassik.in';
```

Or use environment variables:
```bash
EXPO_PUBLIC_API_URL=https://bassik.in
```

### Authentication

The app uses password-based authentication with JWT tokens stored securely using Expo Secure Store.

Default passwords are managed in your backend environment variables.

## Troubleshooting

### Cannot connect to API
- Make sure your device is on the same network as your development server
- Use your computer's IP address, not `localhost`
- Check firewall settings

### Expo Go not connecting
- Ensure both devices are on the same WiFi network
- Try scanning the QR code again
- Restart the Expo dev server

### Build errors
- Clear cache: `npx expo start -c`
- Remove node_modules: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo prebuild --clean`

## Support

For issues or questions, contact the development team.

## License

Internal use only - Bassik Team
