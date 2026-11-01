package com.dailyspent.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsBroadcastReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "dailyspent_sms_alerts";
    private static final String PREF_NAME = "DailySpentQueue";
    private static final String KEY_SMS_QUEUE = "pending_sms_json";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");
        if (pdus == null) return;

        StringBuilder fullMessage = new StringBuilder();
        String sender = "";

        for (Object pdu : pdus) {
            SmsMessage smsMessage;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
            }
            if (smsMessage != null) {
                fullMessage.append(smsMessage.getMessageBody());
                sender = smsMessage.getOriginatingAddress();
            }
        }

        String messageBody = fullMessage.toString();

        // Check if message is a bank debit, withdrawal, or expense notification
        if (isFinancialNotification(messageBody)) {
            // Save to pending queue so the webapp consumes it
            queueSmsMessage(context, messageBody);

            // Notify active MainActivity if running
            if (MainActivity.instance != null) {
                MainActivity.instance.dispatchSmsToWebView(messageBody);
            }

            // Post native status bar notification
            showSystemNotification(context, messageBody);
        }
    }

    private boolean isFinancialNotification(String text) {
        String lower = text.toLowerCase();
        return lower.contains("debit") ||
               lower.contains("debited") ||
               lower.contains("spent") ||
               lower.contains("withdrawn") ||
               lower.contains("withdrawal") ||
               lower.contains("charged") ||
               lower.contains("purchase") ||
               lower.contains("authorized") ||
               lower.contains("paid to") ||
               lower.contains("trf to");
    }

    private void queueSmsMessage(Context context, String smsText) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String existingQueue = prefs.getString(KEY_SMS_QUEUE, "[]");
            JSONArray array = new JSONArray(existingQueue);
            array.put(smsText);
            prefs.edit().putString(KEY_SMS_QUEUE, array.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void showSystemNotification(Context context, String smsText) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "DailySpent Expense Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Automatic alerts when bank debit SMS is captured");
            notificationManager.createNotificationChannel(channel);
        }

        // Try extracting amount for notification title
        String amountStr = "";
        Pattern p = Pattern.compile("(?i)(?:rs\\.?|inr|usd|\\$)\\s*([\\d,]+(?:\\.\\d{1,2})?)");
        Matcher m = p.matcher(smsText);
        if (m.find()) {
            amountStr = m.group(1);
        }

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = amountStr.isEmpty()
            ? "DailySpent: Bank SMS Auto-Captured"
            : "DailySpent: ₹" + amountStr + " Auto-Captured!";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText("Transaction categorized and encrypted automatically.")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(smsText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
