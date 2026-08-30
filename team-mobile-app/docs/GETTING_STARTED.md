# Getting Started with Bassik Team Mobile App

Quick start guide to run the app in development mode.

## Prerequisites

1. **Node.js** (v16 or later)
   - Download from: https://nodejs.org/

2. **Expo Go App** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

## Step 1: Install Dependencies

```bash
cd team-mobile-app
npm install
```

## Step 2: Configure API URL

### For Local Development

If running the backend locally:

```bash
# Create .env file
echo "EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000" > .env
```

**Find your local IP:**
- **Mac/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig` (look for IPv4 Address)

Example:
```
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

### For Production

```bash
echo "EXPO_PUBLIC_API_URL=https://bassik.in" > .env
```

## Step 3: Start Development Server

```bash
npm start
```

You'll see a QR code in your terminal.

## Step 4: Open on Your Phone

### iOS (iPhone/iPad)
1. Open Camera app
2. Point at QR code
3. Tap notification that appears
4. Expo Go opens automatically

### Android
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Point at QR code
4. App loads automatically

## Step 5: Login

Use your team password to login:
- Team member passwords (from backend env)
- Admin password: Default `522529` (or from `TEAM_ADMIN_PASSWORD`)

## Development Tips

### Live Reload
Changes to code automatically reload the app.

### Debug Menu
- **iOS**: Shake device or press Cmd+D
- **Android**: Shake device or press Cmd+M

### Clear Cache
```bash
npm start -- --clear
```

### Running on Simulator/Emulator

**iOS Simulator (Mac only):**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

## Project Structure

```
src/
├── api/              # API client and endpoints
├── config/           # Configuration
├── navigation/       # Navigation setup
├── screens/          # All app screens
├── types/            # TypeScript types
└── utils/            # Utilities (auth context)
```

## Available Scripts

- `npm start` - Start development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser (testing only)

## Troubleshooting

### Can't connect to backend
- Check API URL in `.env`
- Make sure backend is running
- Ensure phone and computer are on same WiFi
- Try using computer's IP instead of localhost

### "Network request failed"
- Check firewall settings
- Backend might not be accessible from phone
- Try using ngrok for local development:
  ```bash
  ngrok http 3000
  # Use ngrok URL in .env
  ```

### Expo Go not opening
- Update Expo Go app to latest version
- Restart Expo Go
- Try manual URL entry in Expo Go

### App crashes on open
- Check terminal for error messages
- Clear cache: `npm start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Next Steps

1. **Explore the app** - Try all features (Tasks, Notes, Reminders, AI, Reports)
2. **Make changes** - Edit code and see live updates
3. **Build for production** - See deployment guides in `docs/`

## API Endpoints

The app connects to these backend endpoints:
- `/api/team/auth` - Authentication
- `/api/team/tasks` - Task management
- `/api/team/notes` - Personal notes
- `/api/team/reminders` - Reminders
- `/api/team/ai` - AI assistant
- `/api/team/whatsapp-report` - WhatsApp reports
- `/api/team/done-report` - Done reports

All endpoints require authentication.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `https://bassik.in` |

## Support

For issues:
1. Check troubleshooting section
2. Review terminal errors
3. Contact development team

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
