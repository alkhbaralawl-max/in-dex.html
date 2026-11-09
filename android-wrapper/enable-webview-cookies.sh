#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:?Usage: enable-webview-cookies.sh <capacitor-app-directory>}"
ANDROID_DIR="$APP_DIR/android"
MAIN_ACTIVITY="$(find "$ANDROID_DIR/app/src/main/java" -name MainActivity.java -print -quit)"

if [[ -z "$MAIN_ACTIVITY" || ! -f "$MAIN_ACTIVITY" ]]; then
  echo "MainActivity.java was not generated for $APP_DIR" >&2
  exit 1
fi

APP_PACKAGE="$(sed -n 's/^package \([^;]*\);/\1/p' "$MAIN_ACTIVITY" | head -n 1)"
if [[ -z "$APP_PACKAGE" ]]; then
  echo "Could not read the MainActivity package from $MAIN_ACTIVITY" >&2
  exit 1
fi

cat > "$MAIN_ACTIVITY" <<JAVA
package $APP_PACKAGE;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (getBridge() != null && getBridge().getWebView() != null) {
            cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
        }
    }
}
JAVA

echo "Configured Supabase session cookies for $APP_PACKAGE"
