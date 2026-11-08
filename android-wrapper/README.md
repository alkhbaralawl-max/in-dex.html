# ركن الغرب — Android APK

This folder contains a Capacitor Android wrapper for the existing production website.

- Android application ID: `com.ruknalgharb.app`
- App label: `ركن الغرب`
- Website origin: `https://rukn-algharb-main.vercel.app`
- The installed app opens the HTTPS website in a full-screen Android WebView. Authentication, game logic, API routes, and database remain on the existing server.
- An internet connection is required. This build does not bundle the website or make the games available offline.
- GitHub Actions builds a debug-signed APK and publishes it as the `Rukn-AlGharb-Android-APK` workflow artifact. Download the artifact ZIP, extract it, then install `Rukn-AlGharb.apk`.
- The debug APK is suitable for direct testing/sideloading. A Play Store release needs a separately managed release keystore and signing configuration.

The Android wrapper is deliberately separate from the website's root deployment and does not modify the admin application or database.
