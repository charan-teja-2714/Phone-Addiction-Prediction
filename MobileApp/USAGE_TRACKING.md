# Usage Tracking — Android Native Module

## What Is Tracked

The app collects **aggregate usage statistics** for the last 24 hours using Android's official `UsageStatsManager` API. The following metrics are computed:

| Metric | Description | Unit |
|--------|-------------|------|
| `dailyUsageHours` | Total foreground time across all apps | Hours |
| `phoneChecksPerDay` | Number of distinct usage sessions (>60s gap = new session) | Count |
| `appsUsedDaily` | Count of distinct apps that were in the foreground | Count |
| `timeOnSocialMedia` | Foreground time in social media apps (WhatsApp, Instagram, etc.) | Hours |
| `timeOnGaming` | Foreground time in gaming apps (matched by publisher prefix) | Hours |
| `timeOnEducation` | Foreground time in education apps (Coursera, Khan Academy, etc.) | Hours |
| `screenTimeBeforeBed` | Foreground time during 22:00-06:00 | Hours |
| `weekendUsageHours` | Foreground time falling on Saturday or Sunday | Hours |

## What Is NOT Tracked

- No message content, chat logs, or notification text
- No browsing history or URLs visited
- No keystrokes or typed text
- No photos, files, or media content
- No GPS location or movement data
- No contacts or call logs
- No individual app names exposed to JavaScript (only category totals)
- No data is uploaded or sent to any server by this module

## How Accuracy Is Ensured

1. **UsageEvents API (not queryUsageStats)**: We use `UsageEvents` which provides exact `ACTIVITY_RESUMED` and `ACTIVITY_PAUSED` transition timestamps, rather than `queryUsageStats()` which returns pre-aggregated approximations.

2. **Single-pass processing**: All events are processed in one chronological pass. Each foreground session's duration is computed as `ACTIVITY_PAUSED.timestamp - ACTIVITY_RESUMED.timestamp`.

3. **Still-in-foreground handling**: Apps that are still in the foreground at query time have their session closed at the query end time (`System.currentTimeMillis()`).

4. **Night hour overlap**: Screen-before-bed time is computed using precise interval overlap between each session and the 22:00-06:00 windows, not by checking start/end hour alone.

5. **Session counting**: Phone checks are counted by detecting idle gaps > 60 seconds between the last `ACTIVITY_PAUSED` and next `ACTIVITY_RESUMED`, which reliably approximates "user put phone down and picked it up again."

6. **Deterministic categorization**: Apps are classified using a static, hardcoded mapping (exact package names for social/education, prefix matching for gaming). No network calls or heuristics.

## Permission

The `PACKAGE_USAGE_STATS` permission is required. This is a **special permission** that cannot be granted via a runtime dialog. The user must manually enable it:

**Settings > Apps > Special app access > Usage access > [App Name]**

The module provides:
- `hasPermission()` — check if granted
- `openUsageAccessSettings()` — navigate user to the settings screen
- Structured error response (not a crash) when permission is missing

## App Category Mapping

### Social Media (exact package match)
WhatsApp, Instagram, Facebook, Messenger, Twitter/X, Snapchat, Telegram, TikTok, Reddit, LinkedIn, Pinterest, Discord, Viber, Skype

### Gaming (package prefix match)
Supercell, King, Rovio, Gameloft, EA Games, Mojang, Epic Games, Activision, Tencent (PUBG), Free Fire, Innersloth, Kiloo, Imangi, Halfbrick, Miniclip, Niantic, Roblox, Nekki, Outfit7

### Education (exact package match)
Google Classroom, Coursera, Udemy, Khan Academy, Duolingo, Quizlet, BYJU'S, Brainly, Photomath, SoloLearn, edX, Skillshare, Google Docs, Notion, OneNote

To add new apps: edit the static sets/arrays in `UsageStatsModule.java`.

## Architecture

```
[Android OS] UsageStatsManager
       |
       v
UsageStatsModule.java    (native module, processes events)
       |
       v
UsageStatsPackage.java   (registers module with React Native)
       |
       v
usageCollector.js         (JS bridge, normalizes output)
       |
       v
featureBuilder / Store    (ML pipeline integration)
```
