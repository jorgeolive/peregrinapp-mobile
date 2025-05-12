Docker compose + node.js in local

Open terminal

 emulator -avd Pixel_9_Pro  -port 5556

 In another tab

 emulator -avd Medium_Phone_API_36 -port 5554

 IN another tab, build application with  npx expo run:android

Force APK into second emulator

 adb -s emulator-5556 install -r D:\UOC\TFG\peregrinapp-mobile\android\app\build\outputs\apk\debug\app-debug.apk

 IMPORTANT: On first run with backend, ensure to clean LOCAL STORAGE in user profile tab.