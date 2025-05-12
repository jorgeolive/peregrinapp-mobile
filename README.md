# PeregrinApp - Your Camino de Santiago Companion

PeregrinApp is a mobile application designed to enhance the Camino de Santiago pilgrimage experience. It provides pilgrims with interactive maps, accommodation information, and social features to connect with other pilgrims along the journey.

## 🌟 Features

### 🗺️ Interactive Map Navigation
- **Multiple Map Layers**: Toggle between IGN official maps, Camino Norte routes, and albergue locations
- **Stage Information**: View detailed information about each stage of the Camino
- **Current Location**: Track your position along the route in real-time
- **Other Pilgrims**: See other pilgrims on the map who have opted to share their location

### 🏠 Albergue Information
- **Comprehensive Database**: Access details about pilgrim hostels along the route
- **Essential Details**: View capacity, prices, amenities, and contact information
- **Interactive Markers**: Tap on any albergue on the map for instant information

### 📝 Stage Details
- **Route Information**: Distance, difficulty level, elevation profile
- **Points of Interest**: Notable landmarks and attractions along each stage
- **Visual Identification**: Color-coded routes for easy identification

### 👤 User Profile & Privacy
- **Customizable Profile**: Set your display name and bio
- **Location Privacy**: Control whether your location is shared with other pilgrims
- **Visibility Settings**: Choose who can contact you via direct messages

### 💬 Direct Messaging
- **Connect with Pilgrims**: Send private messages to other users on the route
- **Real-time Chat**: Instant messaging with pilgrims you meet along the way
- **Community Building**: Form connections and share experiences with fellow travelers

## 📱 Installation

### Prerequisites
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [Android Studio](https://developer.android.com/studio) with Android SDK installed
- [Java Development Kit (JDK)](https://www.oracle.com/java/technologies/javase-downloads.html)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/peregrinapp-mobile.git
   cd peregrinapp-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   npx expo install
   ```

3. Start the app (Android):
   ```bash
   npx expo run:android
   ```

## 🧪 Testing with Multiple Emulators

To fully test social features, you can run multiple Android emulators simultaneously:

### Quick Setup

1. Open a terminal and start the first emulator:
   ```bash
   emulator -avd Medium_Phone_API_36 -port 5554
   ```

2. Open another terminal tab and start the second emulator:
   ```bash
   emulator -avd Pixel_9_Pro -port 5556
   ```

3. In a third terminal tab, build and run the application:
   ```bash
   npx expo run:android
   ```

4. Force install the APK into the second emulator:
   ```bash
   adb -s emulator-5556 install -r D:\UOC\TFG\peregrinapp-mobile\android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Detailed Setup

1. List available emulators:
   ```bash
   emulator -list-avds
   ```

2. Start emulators on different ports:
   ```bash
   # First emulator
   emulator -avd EmulatorName1 -port 5554
   
   # Second emulator
   emulator -avd EmulatorName2 -port 5556
   ```

3. Verify both devices are running:
   ```bash
   adb devices
   ```

4. Run the app on specific emulators:
   ```bash
   # List available devices
   npx expo run:android --list
   
   # Run on first emulator
   npx expo run:android --device "Pixel_6_API_33"
   
   # Run on second emulator
   npx expo run:android --device "Pixel_7_API_34"
   ```

5. Simulate different locations for testing:
   ```bash
   # Set first emulator's position (Camino Norte coordinates)
   adb -s emulator-5554 emu geo fix -8.544844 42.880447
   
   # Set second emulator's position (nearby location)
   adb -s emulator-5556 emu geo fix -8.543901 42.879986
   ```

## 🏗️ Building APK Files

To create APKs for deployment or testing:

1. Create a development build APK:
   ```bash
   npx expo prebuild --platform android
   cd android
   ./gradlew assembleDebug
   ```
   This creates an APK at `android/app/build/outputs/apk/debug/app-debug.apk`

2. Create a release APK (for distribution testing):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The release APK will be at `android/app/build/outputs/apk/release/app-release.apk`

## 🔌 Technical Architecture

PeregrinApp uses a real-time socket management system to enable features like location sharing and direct messaging:

- **Socket Management**: Centralized system for all real-time communications
- **Map Integration**: MapLibre GL for advanced mapping capabilities
- **Layer System**: Toggle different map layers for customized viewing
- **User Authentication**: Secure login and profile management
- **Privacy Controls**: Fine-grained settings for location sharing and communications

## 📝 License

PeregrinApp is [license type] licensed - see the LICENSE file for details. 