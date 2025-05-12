# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   npx expo install
   ```

Docker compose + node.js backend should be running in local

Open terminal

 emulator -avd Pixel_9_Pro  -port 5556

 In another tab

 emulator -avd Medium_Phone_API_36 -port 5554

 IN another tab, build application with  npx expo run:android

Force APK into second emulator

 adb -s emulator-5556 install -r D:\UOC\TFG\peregrinapp-mobile\android\app\build\outputs\apk\debug\app-debug.apk

 IMPORTANT: On first run with backend, ensure to clean LOCAL STORAGE in user profile tab.
