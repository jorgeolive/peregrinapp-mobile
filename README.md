# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   npx expo install
   ```

2. Start the app (Android)

   ```bash
     npx expo run:android
   ```

3. Reset AsyncStorage in emulator

```bash
adb shell pm clear com.anonymous.peregrinapp
```

4. Enforce coordinates 

```bash
adb emu geo fix -8.544844 42.880447
```

## Running multiple emulators for testing

To test user interaction features like location sharing and DMs, you can run multiple emulators simultaneously:

### Using the command line

1. List available emulators:
   ```bash
   emulator -list-avds
   ```

2. Start the first emulator on port 5554:
   ```bash
   emulator -avd EmulatorName1 -port 5554
   ```

3. Start the second emulator on port 5556:
   ```bash
   emulator -avd EmulatorName2 -port 5556
   ```

4. Verify both devices are running:
   ```bash
   adb devices
   ```

5. Install and run the app on both emulators:
   ```bash
   # First, list available devices as Expo sees them
   npx expo run:android --list
   
   # Run on the first emulator (use the name from the list above)
   npx expo run:android --device "Pixel_6_API_33"
   
   # Run on the second emulator
   npx expo run:android --device "Pixel_7_API_34"
   ```

6. Set different positions for each emulator:
   ```bash
   # For the first emulator (specify by port or device ID)
   adb -s emulator-5554 emu geo fix -8.544844 42.880447
   
   # For the second emulator (nearby location)
   adb -s emulator-5556 emu geo fix -8.543901 42.879986
   ```

### Using Android Studio

1. Open Android Studio
2. Click "Device Manager" in the toolbar
3. Click the play button next to two different virtual devices
4. Both emulators will launch separately
5. Install the app on both emulators using Expo CLI

## Building and deploying APKs

To create APKs and deploy them to emulators:

1. **Create a development build APK**:
   ```bash
   npx expo prebuild --platform android
   cd android
   ./gradlew assembleDebug
   ```
   This creates an APK at `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Install to second emulator**:
   ```bash
   adb devices -l # Verify your emulators are connected
   adb -s emulator-5556 install -r D:\UOC\TFG\peregrinapp-mobile\android\app\build\outputs\apk\debug\app-debug.apk
   ```

3. **Install to specific emulator** (if you have multiple):
   ```bash
   # For the first emulator
   adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
   
   # For the second emulator
   adb -s emulator-5556 install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Creating a release APK** (for distribution testing):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The release APK will be at `android/app/build/outputs/apk/release/app-release.apk`

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
