#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:?Usage: enable-webview-cookies.sh <capacitor-app-directory>}"
ANDROID_DIR="$APP_DIR/android"
MAIN_ACTIVITY="$(find "$ANDROID_DIR/app/src/main/java" \\( -name MainActivity.kt -o -name MainActivity.java \\) -print -quit)"

if [[ -z "$MAIN_ACTIVITY" || ! -f "$MAIN_ACTIVITY" ]]; then
  echo "MainActivity source was not generated for $APP_DIR" >&2
  exit 1
fi

APP_PACKAGE="$(sed -nE 's/^package[[:space:]]+([A-Za-z0-9_.]+);?$/\\1/p' "$MAIN_ACTIVITY" | head -n 1)"
if [[ -z "$APP_PACKAGE" ]]; then
  echo "Could not read the MainActivity package from $MAIN_ACTIVITY" >&2
  exit 1
fi

case "$MAIN_ACTIVITY" in
  *.kt)
    cat > "$MAIN_ACTIVITY" <<KOTLIN
package $APP_PACKAGE

import android.os.Bundle
import android.webkit.CookieManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val cookies = CookieManager.getInstance()
        cookies.setAcceptCookie(true)
        val bridge = getBridge()
        if (bridge != null) {
            cookies.setAcceptThirdPartyCookies(bridge.webView, true)
        }
    }
}
KOTLIN
    ;;
  *.java)
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
    ;;
esac

echo "Configured Supabase session cookies for $APP_PACKAGE"
