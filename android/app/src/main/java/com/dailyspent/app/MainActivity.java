package com.dailyspent.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;

public class MainActivity extends BridgeActivity {
    public static MainActivity instance = null;
    private static final int SMS_PERMISSION_CODE = 101;
    private static final String PREF_NAME = "DailySpentQueue";
    private static final String KEY_SMS_QUEUE = "pending_sms_json";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        requestSmsPermissions();
    }

    @Override
    public void onResume() {
        super.onResume();
        instance = this;
        drainPendingQueue();
    }

    private void requestSmsPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean needSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED;
            boolean needRead = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED;
            boolean needNotif = false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                needNotif = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;
            }

            if (needSms || needRead || needNotif) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ActivityCompat.requestPermissions(this, new String[]{
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS,
                        Manifest.permission.POST_NOTIFICATIONS
                    }, SMS_PERMISSION_CODE);
                } else {
                    ActivityCompat.requestPermissions(this, new String[]{
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS
                    }, SMS_PERMISSION_CODE);
                }
            }
        }
    }

    public void dispatchSmsToWebView(final String smsBody) {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    // Escape for JS string literal
                    String escaped = smsBody.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                    String js = "window.dispatchEvent(new CustomEvent('native_sms_received', { detail: '" + escaped + "' }));";
                    webView.evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public void drainPendingQueue() {
        runOnUiThread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                String queueJson = prefs.getString(KEY_SMS_QUEUE, "[]");
                JSONArray array = new JSONArray(queueJson);

                if (array.length() > 0) {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        for (int i = 0; i < array.length(); i++) {
                            String msg = array.getString(i);
                            String escaped = msg.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                            String js = "window.dispatchEvent(new CustomEvent('native_sms_received', { detail: '" + escaped + "' }));";
                            webView.evaluateJavascript(js, null);
                        }
                        // Clear drained queue
                        prefs.edit().putString(KEY_SMS_QUEUE, "[]").apply();
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (instance == this) {
            instance = null;
        }
    }
}
