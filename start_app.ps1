Write-Host " Cleaning node_modules and Android build directories..."
Remove-Item -Recurse -Force node_modules, .expo, .expo-shared, android\app\build

Write-Host " Installing JS dependencies..."
npm install

Write-Host "⚙️ Installing Expo-compatible native packages..."
npx expo install

Write-Host " Verifying ADB and Android SDK setup..."
$adbPath = (Get-Command adb -ErrorAction SilentlyContinue)
if (-not $adbPath) {
    Write-Warning "⚠️ ADB not found in PATH. Make sure Android Platform Tools are installed and added to PATH."
} else {
    & adb devices
}

Write-Host " Building and running app on Android..."
npx expo run:android