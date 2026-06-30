# Bassik Team Mobile App - Complete Guide

## Overview

This is the mobile application for internal team management at Bassik. It provides access to:

- ✅ Task Management
- 📝 Personal Notes  
- ⏰ Reminders
- 🤖 Team AI Assistant
- 📊 WhatsApp & Done Reports

**For Bassik team members only** - requires team authentication.

---

## Quick Links

- 📱 **[Getting Started](./docs/GETTING_STARTED.md)** - Run the app in development
- 🍎 **[iOS Deployment](./docs/IOS_DEPLOYMENT.md)** - Publish to App Store
- 🤖 **[Android Deployment](./docs/ANDROID_DEPLOYMENT.md)** - Publish to Play Store

---

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install dependencies
cd team-mobile-app
npm install

# 2. Configure API (choose one)
echo "EXPO_PUBLIC_API_URL=https://bassik.in" > .env           # Production
echo "EXPO_PUBLIC_API_URL=http://192.168.1.10:3000" > .env  # Local dev

# 3. Start the app
npm start

# 4. Open on your phone
# - iOS: Scan QR with Camera app
# - Android: Scan QR with Expo Go app
```

---

## 📁 Project Structure

```
team-mobile-app/
├── src/
│   ├── api/              # API client & endpoints
│   │   ├── auth.ts       # Authentication
│   │   ├── tasks.ts      # Task management
│   │   ├── notes.ts      # Personal notes
│   │   ├── reminders.ts  # Reminders
│   │   ├── ai.ts         # AI assistant
│   │   └── reports.ts    # Reports generation
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
├── docs/                 # Documentation
├── App.tsx              # Root component
├── app.json             # Expo configuration
├── package.json         # Dependencies
└── README.md           # This file
```

---

## 🛠️ Development

### Prerequisites

- Node.js 16+
- Expo Go app on your phone
- Backend running (local or production)

### Commands

```bash
npm start              # Start dev server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator (Mac only)
npm run web            # Run in browser (testing only)
```

### Testing

1. **Login**: Use team password (from backend env)
2. **Tasks**: View/complete tasks across outlets
3. **Notes**: Create personal notes
4. **Reminders**: Set reminders
5. **AI**: Chat with team AI
6. **Reports**: Generate reports

---

## 🚢 Deployment

### iOS App Store

See detailed guide: [iOS Deployment](./docs/IOS_DEPLOYMENT.md)

**Summary:**
1. Apple Developer account ($99/year)
2. Configure `app.json` with bundle ID
3. `npm run build:ios`
4. `npm run submit:ios`
5. Complete App Store listing
6. Submit for review (24-48 hours)

### Google Play Store

See detailed guide: [Android Deployment](./docs/ANDROID_DEPLOYMENT.md)

**Summary:**
1. Google Play Console account ($25 one-time)
2. Configure `app.json` with package name
3. `npm run build:android`
4. `npm run submit:android`
5. Complete Play Store listing
6. Submit for review (1-3 days)

---

## 🔐 Authentication

The app uses password-based authentication:

- **Admin**: `TEAM_ADMIN_PASSWORD` from backend env
- **Members**: Individual passwords from `TEAM_MEMBER_PASSWORDS`
- **Viewer**: `TEAM_VIEWER_PASSWORD` from backend env

Tokens are stored securely using Expo Secure Store.

---

## 🌐 API Configuration

### Backend URL

Set in `.env`:

```bash
# Production
EXPO_PUBLIC_API_URL=https://bassik.in

# Local development
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000

# ngrok tunnel
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

### API Endpoints

All endpoints require authentication:

| Endpoint | Purpose |
|----------|---------|
| `/api/team/auth` | Login/logout |
| `/api/team/tasks` | Task CRUD |
| `/api/team/notes` | Personal notes |
| `/api/team/reminders` | Reminders |
| `/api/team/ai` | AI assistant |
| `/api/team/whatsapp-report` | WhatsApp reports |
| `/api/team/done-report` | Done reports |

---

## 🎨 Features

### 1. Tasks Screen
- View all ad tasks
- Filter: All / To Do / Done
- Complete/uncomplete tasks
- View by outlet and assignee
- Priority indicators

### 2. Notes Screen
- Create personal notes
- Edit existing notes
- Delete notes
- Searchable

### 3. Reminders Screen
- Create reminders
- Mark as complete
- Delete reminders
- Simple text-based

### 4. AI Screen
- Chat with team AI
- Get help with tasks
- Team coordination assistance
- Context-aware responses

### 5. Reports Screen
- Generate WhatsApp reports
- View done reports
- Filter by date range
- Stats by outlet/member

---

## 🔧 Configuration Files

### `app.json`
Expo configuration with:
- App name and version
- Bundle identifiers
- Icons and splash screen
- Platform-specific settings

### `package.json`
Dependencies and scripts:
- React Native 0.85.3
- Expo SDK 56
- React Navigation 7
- TypeScript 6

### `.env`
Environment variables:
- `EXPO_PUBLIC_API_URL` - Backend URL

---

## 📱 Supported Platforms

- ✅ iOS 13+
- ✅ Android 5.0+ (API 21+)
- ⚠️ Web (limited support, testing only)

---

## 🐛 Troubleshooting

### Can't connect to backend
```bash
# Check API URL
cat .env

# Ensure backend is running
curl https://bassik.in/api/team/auth

# Use IP address for local dev
ifconfig | grep "inet "  # Mac/Linux
ipconfig                 # Windows
```

### Build fails
```bash
# Clear cache
npm start -- --clear

# Reinstall dependencies
rm -rf node_modules
npm install

# Clear Expo cache
npx expo prebuild --clean
```

### Login fails
- Check backend is running
- Verify password is correct
- Check network connection
- Review API URL configuration

---

## 📚 Resources

### Documentation
- [Getting Started Guide](./docs/GETTING_STARTED.md)
- [iOS Deployment](./docs/IOS_DEPLOYMENT.md)
- [Android Deployment](./docs/ANDROID_DEPLOYMENT.md)

### External Links
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

## 💰 Costs

| Service | Cost | Required For |
|---------|------|--------------|
| Apple Developer | $99/year | iOS App Store |
| Google Play | $25 one-time | Android Play Store |
| Expo EAS | Free tier OK | Building apps |

---

## 🔄 Update Workflow

1. Make changes to code
2. Test locally with `npm start`
3. Update version in `app.json`
4. Build: `npm run build:ios` or `npm run build:android`
5. Submit: `npm run submit:ios` or `npm run submit:android`
6. Update store listings with "What's New"

---

## 🤝 Support

For issues or questions:
1. Check [Getting Started](./docs/GETTING_STARTED.md) troubleshooting
2. Review error messages in terminal
3. Contact development team

---

## 📝 License

Internal use only - Bassik Team

---

## ✨ Key Features Summary

| Feature | Status |
|---------|--------|
| Password Authentication | ✅ |
| Task Management | ✅ |
| Personal Notes | ✅ |
| Reminders | ✅ |
| Team AI Assistant | ✅ |
| WhatsApp Reports | ✅ |
| Done Reports | ✅ |
| Offline Support | ⚠️ (Future) |
| Push Notifications | ⚠️ (Future) |

---

**Built with ❤️ for the Bassik Team**
