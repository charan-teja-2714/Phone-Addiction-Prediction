package com.mobileapp;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Process;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * UsageStatsModule — Android native module for collecting smartphone usage metrics.
 *
 * WHY UsageStatsManager:
 *   UsageStatsManager (API 21+) is the official, non-deprecated Android API for
 *   querying app usage data. It provides per-app foreground time via UsageEvents
 *   without requiring Accessibility Services or reflection hacks.
 *
 * WHY permissions are required:
 *   Usage data is considered sensitive. Android requires the user to manually
 *   grant "Usage Access" in system settings (Settings.ACTION_USAGE_ACCESS_SETTINGS).
 *   There is no runtime permission dialog — the user must navigate to settings.
 *
 * PRIVACY guarantees:
 *   - Only aggregate foreground durations per app category are collected.
 *   - No message content, browsing history, keystrokes, or notification content.
 *   - No personally identifiable information leaves the device.
 *   - Data is computed on-demand and never stored by this module.
 *   - Individual app names are never exposed to JavaScript — only category totals.
 */
public class UsageStatsModule extends ReactContextBaseJavaModule {

    // ───────────────────────────────────────────────────────────
    // STATIC CATEGORY MAPPING
    // Deterministic, easy to extend, clearly documented.
    // Add new packages to the appropriate set/prefix list.
    // ───────────────────────────────────────────────────────────

    /** Social media app package names (exact match). */
    private static final Set<String> SOCIAL_MEDIA_PACKAGES = new HashSet<>();
    static {
        // Meta platforms
        SOCIAL_MEDIA_PACKAGES.add("com.whatsapp");
        SOCIAL_MEDIA_PACKAGES.add("com.whatsapp.w4b");              // WhatsApp Business
        SOCIAL_MEDIA_PACKAGES.add("com.instagram.android");
        SOCIAL_MEDIA_PACKAGES.add("com.facebook.katana");
        SOCIAL_MEDIA_PACKAGES.add("com.facebook.lite");
        SOCIAL_MEDIA_PACKAGES.add("com.facebook.orca");              // Messenger
        // Twitter / X
        SOCIAL_MEDIA_PACKAGES.add("com.twitter.android");
        SOCIAL_MEDIA_PACKAGES.add("com.twitter.android.lite");
        // Snap, Telegram, TikTok
        SOCIAL_MEDIA_PACKAGES.add("com.snapchat.android");
        SOCIAL_MEDIA_PACKAGES.add("org.telegram.messenger");
        SOCIAL_MEDIA_PACKAGES.add("com.zhiliaoapp.musically");       // TikTok
        SOCIAL_MEDIA_PACKAGES.add("com.ss.android.ugc.trill");      // TikTok (alt)
        // Others
        SOCIAL_MEDIA_PACKAGES.add("com.reddit.frontpage");
        SOCIAL_MEDIA_PACKAGES.add("com.linkedin.android");
        SOCIAL_MEDIA_PACKAGES.add("com.pinterest");
        SOCIAL_MEDIA_PACKAGES.add("com.discord");
        SOCIAL_MEDIA_PACKAGES.add("com.viber.voip");
        SOCIAL_MEDIA_PACKAGES.add("com.skype.raider");
    }

    /**
     * Gaming app package prefixes (startsWith match).
     * Most mobile games use publisher-based package prefixes.
     */
    private static final String[] GAMING_PREFIXES = {
        "com.supercell.",           // Clash of Clans, Brawl Stars
        "com.king.",                // Candy Crush
        "com.rovio.",               // Angry Birds
        "com.gameloft.",            // Asphalt, etc.
        "com.ea.game.",             // EA games
        "com.mojang.",              // Minecraft
        "com.epicgames.",           // Fortnite
        "com.activision.",          // Call of Duty Mobile
        "com.tencent.ig",           // PUBG Mobile
        "com.dts.freefireth",       // Free Fire
        "com.innersloth.",          // Among Us
        "com.kiloo.",               // Subway Surfers
        "com.imangi.",              // Temple Run
        "com.halfbrick.",           // Fruit Ninja, Jetpack Joyride
        "com.miniclip.",            // 8 Ball Pool, etc.
        "com.nianticlabs.",         // Pokemon Go
        "com.roblox.",              // Roblox
        "io.supercent.",            // Various casual games
        "com.nekki.",               // Shadow Fight
        "com.outfit7.",             // Talking Tom
    };

    /** Education app package names (exact match). */
    private static final Set<String> EDUCATION_PACKAGES = new HashSet<>();
    static {
        EDUCATION_PACKAGES.add("com.google.android.apps.classroom");
        EDUCATION_PACKAGES.add("org.coursera.android");
        EDUCATION_PACKAGES.add("com.udemy.android");
        EDUCATION_PACKAGES.add("org.khanacademy.android");
        EDUCATION_PACKAGES.add("com.duolingo");
        EDUCATION_PACKAGES.add("com.quizlet.quizletandroid");
        EDUCATION_PACKAGES.add("com.byjus.thelearningapp");
        EDUCATION_PACKAGES.add("com.brainly");
        EDUCATION_PACKAGES.add("com.photomath.camera");
        EDUCATION_PACKAGES.add("com.sololearn");
        EDUCATION_PACKAGES.add("com.ed.edx");
        EDUCATION_PACKAGES.add("com.skillshare.app");
        EDUCATION_PACKAGES.add("com.google.android.apps.docs");       // Google Docs
        EDUCATION_PACKAGES.add("com.google.android.apps.docs.editors.docs");
        EDUCATION_PACKAGES.add("com.notion.id");
        EDUCATION_PACKAGES.add("com.microsoft.office.onenote");
    }

    /** Entertainment app package names. */
    private static final Set<String> ENTERTAINMENT_PACKAGES = new HashSet<>();
    static {
        ENTERTAINMENT_PACKAGES.add("com.google.android.youtube");
        ENTERTAINMENT_PACKAGES.add("com.google.android.youtube.tv");
        ENTERTAINMENT_PACKAGES.add("com.google.android.apps.youtube.music");
        ENTERTAINMENT_PACKAGES.add("com.netflix.mediaclient");
        ENTERTAINMENT_PACKAGES.add("com.spotify.music");
        ENTERTAINMENT_PACKAGES.add("com.amazon.avod.thirdpartyclient");  // Prime Video
        ENTERTAINMENT_PACKAGES.add("in.startv.hotstar");                 // Disney+ Hotstar
        ENTERTAINMENT_PACKAGES.add("com.jio.media.jiobeats");            // JioSaavn
        ENTERTAINMENT_PACKAGES.add("com.gaana");
        ENTERTAINMENT_PACKAGES.add("com.bsbportal.music");               // Wynk
        ENTERTAINMENT_PACKAGES.add("com.vimeo.android.videoapp");
        ENTERTAINMENT_PACKAGES.add("com.mxtech.videoplayer.ad");         // MX Player
        ENTERTAINMENT_PACKAGES.add("com.mxtech.videoplayer.pro");
        ENTERTAINMENT_PACKAGES.add("com.vlc");                           // VLC variant
        ENTERTAINMENT_PACKAGES.add("org.videolan.vlc");
        ENTERTAINMENT_PACKAGES.add("tv.twitch.android.app");
        ENTERTAINMENT_PACKAGES.add("com.apple.android.music");           // Apple Music
        ENTERTAINMENT_PACKAGES.add("com.hungama.myplay.activity");
        ENTERTAINMENT_PACKAGES.add("com.sony.liv");
        ENTERTAINMENT_PACKAGES.add("com.jio.media.ondemand");            // JioCinema
        ENTERTAINMENT_PACKAGES.add("com.zee5.hipi");
    }

    /** Communication app package names. */
    private static final Set<String> COMMUNICATION_PACKAGES = new HashSet<>();
    static {
        COMMUNICATION_PACKAGES.add("com.google.android.gm");             // Gmail
        COMMUNICATION_PACKAGES.add("com.microsoft.office.outlook");
        COMMUNICATION_PACKAGES.add("com.yahoo.mobile.client.android.mail");
        COMMUNICATION_PACKAGES.add("com.google.android.apps.messaging");
        COMMUNICATION_PACKAGES.add("com.samsung.android.messaging");
        COMMUNICATION_PACKAGES.add("com.google.android.dialer");
        COMMUNICATION_PACKAGES.add("com.samsung.android.dialer");
        COMMUNICATION_PACKAGES.add("com.samsung.android.incallui");
        COMMUNICATION_PACKAGES.add("com.google.android.apps.tachyon");   // Google Duo/Meet
        COMMUNICATION_PACKAGES.add("us.zoom.videomeetings");
        COMMUNICATION_PACKAGES.add("com.microsoft.teams");
        COMMUNICATION_PACKAGES.add("com.google.android.apps.meetings");  // Google Meet
        COMMUNICATION_PACKAGES.add("com.truecaller");
    }

    /** Browser app package names. */
    private static final Set<String> BROWSER_PACKAGES = new HashSet<>();
    static {
        BROWSER_PACKAGES.add("com.android.chrome");
        BROWSER_PACKAGES.add("org.mozilla.firefox");
        BROWSER_PACKAGES.add("com.opera.browser");
        BROWSER_PACKAGES.add("com.opera.mini.native");
        BROWSER_PACKAGES.add("com.brave.browser");
        BROWSER_PACKAGES.add("com.microsoft.emmx");                      // Edge
        BROWSER_PACKAGES.add("com.sec.android.app.sbrowser");            // Samsung Internet
        BROWSER_PACKAGES.add("com.UCMobile.intl");                       // UC Browser
        BROWSER_PACKAGES.add("com.duckduckgo.mobile.android");
        BROWSER_PACKAGES.add("com.vivaldi.browser");
    }

    /** Shopping app package names. */
    private static final Set<String> SHOPPING_PACKAGES = new HashSet<>();
    static {
        SHOPPING_PACKAGES.add("com.amazon.mShop.android.shopping");
        SHOPPING_PACKAGES.add("com.flipkart.android");
        SHOPPING_PACKAGES.add("com.myntra.android");
        SHOPPING_PACKAGES.add("in.amazon.mShop.android.shopping");
        SHOPPING_PACKAGES.add("com.snapdeal.main");
        SHOPPING_PACKAGES.add("com.meesho.supply");
        SHOPPING_PACKAGES.add("com.ajio.android");
        SHOPPING_PACKAGES.add("com.nykaa.app");
    }

    /** Finance & Banking app package names. */
    private static final Set<String> FINANCE_PACKAGES = new HashSet<>();
    static {
        // UPI / Payments
        FINANCE_PACKAGES.add("net.one97.paytm");
        FINANCE_PACKAGES.add("com.phonepe.app");
        FINANCE_PACKAGES.add("com.google.android.apps.nbu.paisa.user"); // Google Pay
        FINANCE_PACKAGES.add("club.cred");
        FINANCE_PACKAGES.add("com.jio.myjio");
        // Banking
        FINANCE_PACKAGES.add("com.sbi.lotusintouch");                   // SBI YONO Lite
        FINANCE_PACKAGES.add("com.sbi.SBIFreedomPlus");                 // SBI YONO
        FINANCE_PACKAGES.add("com.csam.icici.bank.imobile");            // ICICI iMobile
        FINANCE_PACKAGES.add("com.msf.kbank.mobile");
        FINANCE_PACKAGES.add("com.hdfc.retail.banking");                // HDFC
        FINANCE_PACKAGES.add("com.axis.mobile");
        FINANCE_PACKAGES.add("com.kotak.mobile.banking");
        FINANCE_PACKAGES.add("com.bob.banking");
        FINANCE_PACKAGES.add("com.bankofbaroda.mconnect");
        FINANCE_PACKAGES.add("com.indiapost.banking");
        // Stock / Investment
        FINANCE_PACKAGES.add("com.zerodha.kite3");
        FINANCE_PACKAGES.add("net.5paisa");
        FINANCE_PACKAGES.add("com.upstox.pro");
        FINANCE_PACKAGES.add("com.groww.android");
    }

    /** Productivity / Dev Tools app package names. */
    private static final Set<String> PRODUCTIVITY_PACKAGES = new HashSet<>();
    static {
        // Microsoft Office
        PRODUCTIVITY_PACKAGES.add("com.microsoft.office.word");
        PRODUCTIVITY_PACKAGES.add("com.microsoft.office.excel");
        PRODUCTIVITY_PACKAGES.add("com.microsoft.office.powerpoint");
        PRODUCTIVITY_PACKAGES.add("com.microsoft.office.officehubrow");
        // Google Workspace
        PRODUCTIVITY_PACKAGES.add("com.google.android.apps.docs.editors.sheets");
        PRODUCTIVITY_PACKAGES.add("com.google.android.apps.docs.editors.slides");
        PRODUCTIVITY_PACKAGES.add("com.google.android.keep");
        PRODUCTIVITY_PACKAGES.add("com.google.android.calendar");
        PRODUCTIVITY_PACKAGES.add("com.google.android.apps.tasks");
        // Dev tools
        PRODUCTIVITY_PACKAGES.add("com.termux");
        PRODUCTIVITY_PACKAGES.add("io.spck");                           // Spck Code Editor
        PRODUCTIVITY_PACKAGES.add("com.foxdebug.acode");                // Acode
        PRODUCTIVITY_PACKAGES.add("com.github.android");
        // Task / Notes
        PRODUCTIVITY_PACKAGES.add("com.todoist");
        PRODUCTIVITY_PACKAGES.add("com.ticktick.task");
        PRODUCTIVITY_PACKAGES.add("com.evernote");
        PRODUCTIVITY_PACKAGES.add("com.google.android.apps.paidtasks");
        PRODUCTIVITY_PACKAGES.add("com.samsung.android.app.notes");
    }

    /**
     * System/Utility package prefixes — excluded from both per-app and aggregate tracking.
     * Matches Digital Wellbeing's exclusion list: launchers, keyboards, system UI,
     * settings, and always-running background components.
     * 
     * NOTE: Play Store (com.android.vending) is NOT excluded — Digital Wellbeing counts it.
     */
    private static final String[] SYSTEM_PREFIXES = {
        // Android core system (UI/framework only)
        "com.android.systemui",
        "com.android.launcher",
        "com.android.settings",
        "com.android.keyguard",
        "com.android.packageinstaller",
        "com.android.permissioncontroller",
        "com.android.inputmethod",
        // Google system components (UI/framework only)
        "com.google.android.inputmethod",
        "com.google.android.permissioncontroller",
        "com.google.android.setupwizard",
        "com.google.android.apps.nexuslauncher",
        "com.google.android.packageinstaller",
        "com.google.android.gms",           // Google Play Services (background)
        "com.google.android.gsf",           // Google Services Framework (background)
        "com.google.android.ext.services",
        // Samsung system components
        "com.samsung.android.app.routines",
        "com.samsung.android.incallui",
        "com.samsung.android.lool",         // Device Care
        "com.sec.android.app.launcher",
        "com.sec.android.systemui",
        "com.sec.android.inputmethod",
        // Xiaomi / MIUI
        "com.miui.home",
        "com.miui.securitycenter",
        // OnePlus
        "com.oneplus.launcher",
        // Our own app
        "com.mobileapp",
    };

    /** Night hours window: 22:00 (10 PM) to 06:00 (6 AM). */
    private static final int NIGHT_START_HOUR = 22;
    private static final int NIGHT_END_HOUR = 6;

    /**
     * Minimum idle gap (ms) between foreground events to count as a new "phone check".
     * 60 seconds approximates the user putting down the phone and picking it up again.
     */
    private static final long PHONE_CHECK_GAP_MS = 60_000L;

    /** 24 hours in milliseconds. */
    private static final long DAY_MS = 24L * 60 * 60 * 1000;

    public UsageStatsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "UsageStatsModule";
    }

    // ───────────────────────────────────────────────────────────
    // PUBLIC METHODS EXPOSED TO REACT NATIVE
    // ───────────────────────────────────────────────────────────

    /**
     * Checks if the app has been granted Usage Access permission.
     * Returns true/false to JS without throwing.
     */
    @ReactMethod
    public void hasPermission(Promise promise) {
        try {
            promise.resolve(checkUsagePermission());
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Opens the system Usage Access settings screen so the user can
     * manually grant permission to this app.
     */
    @ReactMethod
    public void openUsageAccessSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SETTINGS_OPEN_ERROR", "Could not open usage access settings", e);
        }
    }

    /**
     * Collects all 8 usage metrics.
     *
     * If permission is not granted, returns a structured error object
     * (does NOT reject the promise) so JS can handle it gracefully.
     *
     * Metrics computed:
     *   dailyUsageHours      — total foreground time (last 24h), in hours
     *   phoneChecksPerDay    — number of distinct usage sessions (last 24h)
     *   appsUsedDaily        — count of distinct apps used (last 24h)
     *   timeOnSocialMedia    — social media foreground time (last 24h), in hours
     *   timeOnGaming         — gaming foreground time (last 24h), in hours
     *   timeOnEducation      — education foreground time (last 24h), in hours
     *   screenTimeBeforeBed  — foreground time during 22:00–06:00 (last 24h), in hours
     *   weekendUsageHours    — foreground time on most recent Sat+Sun, in hours
     */
    @ReactMethod
    public void collectUsageStats(Promise promise) {
        try {
            // Guard: permission not granted → return structured error, don't crash
            if (!checkUsagePermission()) {
                WritableMap error = Arguments.createMap();
                error.putString("error", "PERMISSION_DENIED");
                error.putString("message",
                    "Usage access permission not granted. "
                    + "Call openUsageAccessSettings() to request it.");
                promise.resolve(error);
                return;
            }

            UsageStatsManager manager = (UsageStatsManager)
                getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

            if (manager == null) {
                promise.reject("SERVICE_ERROR",
                    "UsageStatsManager is not available on this device");
                return;
            }

            long now = System.currentTimeMillis();

            // Collect from midnight (start of today) instead of rolling 24h
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long queryStart = cal.getTimeInMillis();

            // Pre-compute night windows for today's period
            long[][] nightWindows = getNightWindows(queryStart, now);

            // Determine if any weekend time falls within the 24h window
            boolean[] weekendFlags = getWeekendDayFlags(queryStart, now);

            // Process all events in a single pass
            WritableMap result = processEvents(
                manager, queryStart, now, nightWindows, weekendFlags
            );

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("COLLECTION_ERROR",
                "Failed to collect usage stats: " + e.getMessage(), e);
        }
    }

    /**
     * Returns per-app usage data for today (since midnight).
     *
     * Each entry contains:
     *   packageName  — full package name
     *   appName      — user-visible app label
     *   usageMs      — foreground time in milliseconds
     *   category     — one of: Social Media, Gaming, Education, Entertainment,
     *                  Communication, Browser, Shopping, Other
     *
     * Only apps with > 1 second of usage are included.
     * System launcher, keyboard, and permission dialogs are excluded.
     */
    @ReactMethod
    public void getPerAppUsage(Promise promise) {
        try {
            if (!checkUsagePermission()) {
                WritableMap error = Arguments.createMap();
                error.putString("error", "PERMISSION_DENIED");
                promise.resolve(error);
                return;
            }

            UsageStatsManager manager = (UsageStatsManager)
                getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

            if (manager == null) {
                promise.reject("SERVICE_ERROR", "UsageStatsManager unavailable");
                return;
            }

            long now = System.currentTimeMillis();
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long queryStart = cal.getTimeInMillis();

            // Collect foreground time per package
            UsageEvents events = manager.queryEvents(queryStart, now);
            Map<String, Long> foregroundTime = new HashMap<>();
            Map<String, Long> foregroundStart = new HashMap<>();
            UsageEvents.Event event = new UsageEvents.Event();

            while (events.hasNextEvent()) {
                events.getNextEvent(event);
                String pkg = event.getPackageName();
                long ts = event.getTimeStamp();
                int type = event.getEventType();

                if (type == UsageEvents.Event.ACTIVITY_RESUMED) {
                    foregroundStart.put(pkg, ts);
                } else if (type == UsageEvents.Event.ACTIVITY_PAUSED) {
                    Long start = foregroundStart.remove(pkg);
                    if (start != null && start < ts) {
                        Long existing = foregroundTime.get(pkg);
                        foregroundTime.put(pkg, (existing != null ? existing : 0L) + (ts - start));
                    }
                }
            }

            // Close apps still in foreground
            for (Map.Entry<String, Long> entry : foregroundStart.entrySet()) {
                long start = entry.getValue();
                if (start < now) {
                    String pkg = entry.getKey();
                    Long existing = foregroundTime.get(pkg);
                    foregroundTime.put(pkg, (existing != null ? existing : 0L) + (now - start));
                }
            }

            // Build result array
            PackageManager pm = getReactApplicationContext().getPackageManager();
            WritableArray apps = Arguments.createArray();

            for (Map.Entry<String, Long> entry : foregroundTime.entrySet()) {
                String pkg = entry.getKey();
                long ms = entry.getValue();

                // Skip apps with negligible usage (< 1 second)
                if (ms < 1000) continue;

                // Skip system UI components
                if (isSystemUi(pkg)) continue;

                // Skip uninstalled / ghost apps (getAppLabel returns null)
                String appName = getAppLabel(pm, pkg);
                if (appName == null) continue;

                String category = getCategory(pkg);

                WritableMap appMap = Arguments.createMap();
                appMap.putString("packageName", pkg);
                appMap.putString("appName", appName);
                appMap.putDouble("usageMs", ms);
                appMap.putString("category", category);
                apps.pushMap(appMap);
            }

            promise.resolve(apps);

        } catch (Exception e) {
            promise.reject("COLLECTION_ERROR", "Failed to get per-app usage: " + e.getMessage(), e);
        }
    }

    // ───────────────────────────────────────────────────────────
    // APP LABEL & CATEGORY
    // ───────────────────────────────────────────────────────────

    /**
     * Gets the user-visible app name from the package name.
     * Returns null if the app is not currently installed (ghost usage data).
     */
    private String getAppLabel(PackageManager pm, String packageName) {
        try {
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            CharSequence label = pm.getApplicationLabel(info);
            return label != null ? label.toString() : null;
        } catch (PackageManager.NameNotFoundException e) {
            // App is not installed — ghost entry from uninstalled app
            return null;
        }
    }

    /** Returns the category string for a given package. */
    private String getCategory(String packageName) {
        if (isSocialMedia(packageName)) return "Social Media";
        if (isGaming(packageName)) return "Gaming";
        if (isEducation(packageName)) return "Education";
        if (ENTERTAINMENT_PACKAGES.contains(packageName)) return "Entertainment";
        if (COMMUNICATION_PACKAGES.contains(packageName)) return "Communication";
        if (BROWSER_PACKAGES.contains(packageName)) return "Browser";
        if (SHOPPING_PACKAGES.contains(packageName)) return "Shopping";
        if (FINANCE_PACKAGES.contains(packageName)) return "Finance";
        if (PRODUCTIVITY_PACKAGES.contains(packageName)) return "Productivity";
        return "Other";
    }

    /** Checks if a package is a system UI component to be excluded. */
    private boolean isSystemUi(String packageName) {
        for (String prefix : SYSTEM_PREFIXES) {
            if (packageName.startsWith(prefix)) return true;
        }
        return false;
    }

    // ───────────────────────────────────────────────────────────
    // PERMISSION CHECK
    // ───────────────────────────────────────────────────────────

    /**
     * Uses AppOpsManager to verify Usage Access permission.
     * unsafeCheckOpNoThrow is the non-deprecated API 29+ method.
     */
    private boolean checkUsagePermission() {
        Context context = getReactApplicationContext();
        AppOpsManager appOps = (AppOpsManager)
            context.getSystemService(Context.APP_OPS_SERVICE);

        int mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        );

        return mode == AppOpsManager.MODE_ALLOWED;
    }

    // ───────────────────────────────────────────────────────────
    // CORE EVENT PROCESSING
    // ───────────────────────────────────────────────────────────

    /**
     * Processes UsageEvents in a single chronological pass to compute all metrics.
     *
     * Why UsageEvents instead of queryUsageStats():
     *   queryUsageStats() returns pre-aggregated buckets with approximate totals.
     *   UsageEvents gives precise ACTIVITY_RESUMED / ACTIVITY_PAUSED transitions,
     *   enabling accurate per-session timing, night-hour overlap, and session counting.
     */
    private WritableMap processEvents(
        UsageStatsManager manager,
        long queryStart,
        long queryEnd,
        long[][] nightWindows,
        boolean[] weekendFlags
    ) {
        UsageEvents events = manager.queryEvents(queryStart, queryEnd);

        // Accumulated foreground time per package
        Map<String, Long> foregroundTime = new HashMap<>();

        // Currently-in-foreground package → timestamp when ACTIVITY_RESUMED fired
        Map<String, Long> foregroundStart = new HashMap<>();

        // All packages that appeared in foreground (for appsUsedDaily)
        Set<String> activePackages = new HashSet<>();

        // Session (phone check) tracking
        long lastPausedTime = 0;
        int phoneChecks = 0;
        boolean firstResume = true;

        // Night and weekend accumulators
        long nightUsageMs = 0;
        long weekendUsageMs = 0;

        UsageEvents.Event event = new UsageEvents.Event();

        while (events.hasNextEvent()) {
            events.getNextEvent(event);

            String packageName = event.getPackageName();
            long timestamp = event.getTimeStamp();
            int eventType = event.getEventType();

            // Skip system apps entirely — matches Digital Wellbeing behavior
            if (isSystemUi(packageName)) continue;

            // ACTIVITY_RESUMED (API 29+, value 1) — app moved to foreground
            if (eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                foregroundStart.put(packageName, timestamp);
                activePackages.add(packageName);

                // Count phone checks: a new session starts when there's been
                // an idle gap longer than PHONE_CHECK_GAP_MS since the last pause
                if (firstResume) {
                    phoneChecks = 1;
                    firstResume = false;
                } else if (lastPausedTime > 0
                        && (timestamp - lastPausedTime) > PHONE_CHECK_GAP_MS) {
                    phoneChecks++;
                }

            // ACTIVITY_PAUSED (API 29+, value 2) — app left foreground
            } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED) {
                Long start = foregroundStart.remove(packageName);
                if (start != null && start < timestamp) {
                    long duration = timestamp - start;

                    // Accumulate total foreground time for this package
                    Long existing = foregroundTime.get(packageName);
                    foregroundTime.put(packageName,
                        (existing != null ? existing : 0L) + duration);

                    // Accumulate night usage (22:00–06:00 overlap)
                    for (long[] window : nightWindows) {
                        nightUsageMs += computeOverlap(start, timestamp,
                            window[0], window[1]);
                    }

                    // Accumulate weekend usage (Sat/Sun overlap)
                    weekendUsageMs += computeWeekendOverlap(
                        start, timestamp, weekendFlags, queryStart);
                }

                lastPausedTime = timestamp;
            }
        }

        // Close any apps still in foreground at query end
        for (Map.Entry<String, Long> entry : foregroundStart.entrySet()) {
            long start = entry.getValue();
            if (start < queryEnd) {
                long duration = queryEnd - start;
                String pkg = entry.getKey();

                Long existing = foregroundTime.get(pkg);
                foregroundTime.put(pkg,
                    (existing != null ? existing : 0L) + duration);

                for (long[] window : nightWindows) {
                    nightUsageMs += computeOverlap(start, queryEnd,
                        window[0], window[1]);
                }

                weekendUsageMs += computeWeekendOverlap(
                    start, queryEnd, weekendFlags, queryStart);
            }
        }

        // ─── Aggregate by category ───
        long totalUsageMs = 0;
        long socialMediaMs = 0;
        long gamingMs = 0;
        long educationMs = 0;

        for (Map.Entry<String, Long> entry : foregroundTime.entrySet()) {
            String pkg = entry.getKey();
            long ms = entry.getValue();

            // Skip system apps to match Digital Wellbeing's totals
            if (isSystemUi(pkg)) continue;

            totalUsageMs += ms;

            if (isSocialMedia(pkg)) {
                socialMediaMs += ms;
            } else if (isGaming(pkg)) {
                gamingMs += ms;
            } else if (isEducation(pkg)) {
                educationMs += ms;
            }
        }

        // ─── Build result map ───
        WritableMap result = Arguments.createMap();
        result.putDouble("dailyUsageHours",     msToHours(totalUsageMs));
        result.putInt("phoneChecksPerDay",       phoneChecks);
        result.putInt("appsUsedDaily",           activePackages.size());
        result.putDouble("timeOnSocialMedia",    msToHours(socialMediaMs));
        result.putDouble("timeOnGaming",         msToHours(gamingMs));
        result.putDouble("timeOnEducation",      msToHours(educationMs));
        result.putDouble("screenTimeBeforeBed",  msToHours(nightUsageMs));
        result.putDouble("weekendUsageHours",    msToHours(weekendUsageMs));

        return result;
    }

    // ───────────────────────────────────────────────────────────
    // CATEGORY CLASSIFICATION
    // ───────────────────────────────────────────────────────────

    private boolean isSocialMedia(String packageName) {
        return SOCIAL_MEDIA_PACKAGES.contains(packageName);
    }

    private boolean isGaming(String packageName) {
        for (String prefix : GAMING_PREFIXES) {
            if (packageName.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private boolean isEducation(String packageName) {
        return EDUCATION_PACKAGES.contains(packageName);
    }

    // ───────────────────────────────────────────────────────────
    // NIGHT WINDOW COMPUTATION
    // ───────────────────────────────────────────────────────────

    /**
     * Pre-computes the night windows (22:00–06:00) that fall within [queryStart, queryEnd].
     * A 24-hour query spans at most 2 distinct night windows.
     *
     * Each night window is one contiguous block: e.g. Feb 10 22:00 → Feb 11 06:00.
     * We clip each window to the query range so overlap computation is simplified.
     */
    private long[][] getNightWindows(long queryStart, long queryEnd) {
        List<long[]> windows = new ArrayList<>();
        Calendar cal = Calendar.getInstance();

        // Start from the day before queryStart to catch an overnight window
        // that began the previous evening
        cal.setTimeInMillis(queryStart);
        cal.add(Calendar.DAY_OF_YEAR, -1);
        cal.set(Calendar.HOUR_OF_DAY, NIGHT_START_HOUR);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);

        // Enumerate possible night windows until we pass queryEnd
        for (int i = 0; i < 3; i++) {
            long nightStart = cal.getTimeInMillis();

            Calendar endCal = (Calendar) cal.clone();
            endCal.add(Calendar.DAY_OF_YEAR, 1);
            endCal.set(Calendar.HOUR_OF_DAY, NIGHT_END_HOUR);
            endCal.set(Calendar.MINUTE, 0);
            endCal.set(Calendar.SECOND, 0);
            endCal.set(Calendar.MILLISECOND, 0);
            long nightEnd = endCal.getTimeInMillis();

            // Clip to query range
            long clippedStart = Math.max(nightStart, queryStart);
            long clippedEnd = Math.min(nightEnd, queryEnd);

            if (clippedStart < clippedEnd) {
                windows.add(new long[]{clippedStart, clippedEnd});
            }

            // Advance to the next night (next day's 22:00)
            cal.add(Calendar.DAY_OF_YEAR, 1);

            if (nightStart > queryEnd) break;
        }

        return windows.toArray(new long[0][]);
    }

    // ───────────────────────────────────────────────────────────
    // WEEKEND COMPUTATION
    // ───────────────────────────────────────────────────────────

    /**
     * Builds an hour-level flag array marking which hours in the query range
     * fall on Saturday or Sunday. Each index represents one hour offset
     * from queryStart.
     *
     * This lets us compute weekend overlap without Calendar calls per session.
     */
    private boolean[] getWeekendDayFlags(long queryStart, long queryEnd) {
        int numHours = (int) Math.ceil((queryEnd - queryStart) / 3_600_000.0) + 1;
        boolean[] flags = new boolean[numHours];
        Calendar cal = Calendar.getInstance();

        for (int i = 0; i < numHours; i++) {
            cal.setTimeInMillis(queryStart + (long) i * 3_600_000L);
            int dow = cal.get(Calendar.DAY_OF_WEEK);
            flags[i] = (dow == Calendar.SATURDAY || dow == Calendar.SUNDAY);
        }

        return flags;
    }

    /**
     * Computes how many milliseconds of a session [sessionStart, sessionEnd)
     * fall on weekend hours, using the pre-computed flag array.
     */
    private long computeWeekendOverlap(
        long sessionStart, long sessionEnd,
        boolean[] weekendFlags, long queryStart
    ) {
        if (sessionStart >= sessionEnd) return 0;

        long overlap = 0;
        int startHour = (int) ((sessionStart - queryStart) / 3_600_000L);
        int endHour = (int) ((sessionEnd - queryStart) / 3_600_000L);

        // Clamp to valid indices
        startHour = Math.max(0, startHour);
        endHour = Math.min(weekendFlags.length - 1, endHour);

        for (int h = startHour; h <= endHour; h++) {
            if (!weekendFlags[h]) continue;

            // Compute the overlap between the session and this hour slot
            long hourSlotStart = queryStart + (long) h * 3_600_000L;
            long hourSlotEnd = hourSlotStart + 3_600_000L;

            overlap += computeOverlap(sessionStart, sessionEnd,
                hourSlotStart, hourSlotEnd);
        }

        return overlap;
    }

    // ───────────────────────────────────────────────────────────
    // UTILITY
    // ───────────────────────────────────────────────────────────

    /**
     * Computes the overlap in milliseconds between two intervals
     * [s1, e1) and [s2, e2).
     */
    private long computeOverlap(long s1, long e1, long s2, long e2) {
        long start = Math.max(s1, s2);
        long end = Math.min(e1, e2);
        return Math.max(0, end - start);
    }

    /**
     * Converts milliseconds to hours, rounded to 1 decimal place.
     * Example: 5_400_000 ms → 1.5 hours.
     */
    private double msToHours(long ms) {
        return Math.round(ms / 360_000.0) / 10.0;
    }
}
