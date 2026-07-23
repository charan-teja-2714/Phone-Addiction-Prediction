# MaterialCommunityIcons Reference

Complete list of all icons used in the Digital Wellbeing app with valid MaterialCommunityIcons names.

---

## Bottom Navigation Tabs

| Tab | Focused Icon | Unfocused Icon | Purpose |
|-----|--------------|----------------|---------|
| Home | `home` | `home-outline` | Main dashboard |
| Insights | `chart-line` | `chart-line-variant` | Analytics & trends |
| Check-in | `clipboard-check` | `clipboard-check-outline` | Questionnaire |
| Profile | `account-circle` | `account-circle-outline` | Settings & profile |

**Updated:**
- ❌ `home-variant` → ✅ `home` (variant doesn't exist)
- ❌ `home-variant-outline` → ✅ `home-outline`
- ❌ `chart-areaspline` → ✅ `chart-line` (deprecated)
- ❌ `chart-areaspline-variant` → ✅ `chart-line-variant`

---

## HomeScreen Icons

### Header
- `heart-pulse` — App branding/health theme

### Section Headers
- `chart-box-outline` — Quick Stats section
- `lightbulb-on-outline` — Daily Insights section

### Stat Cards
- `cellphone` — Screen Time
- `gesture-tap` — Phone Checks
- `weather-night` — Night Usage
- `apps` — Apps Used

### Insight Cards
- `sleep` — Sleep recommendation
- `run` — Exercise recommendation
- `book-open-variant` — Education recommendation

### Modal
- `close` — Close button
- `sigma` — Total sum indicator

---

## InsightsScreen Icons

### Section Headers
- `chart-timeline-variant` — Weekly Risk Trend
- `folder-outline` — Categories section
- `format-list-bulleted` — All Apps list
- `head-lightbulb-outline` — Pattern Insights

### Category Icons
- `forum-outline` — Social Media
- `gamepad-variant-outline` — Gaming
- `school-outline` — Education
- `play-circle-outline` — Entertainment
- `message-text-outline` — Communication
- `web` — Browser
- `cart-outline` — Shopping
- `bank-outline` — Finance
- `briefcase-check-outline` — Productivity
- `dots-horizontal-circle-outline` — Other

### UI Controls
- `chevron-up` / `chevron-down` — Expand/collapse
- `folder-move-outline` — Reassign app category
- `information-outline` — Info indicator
- `sigma` — Total screen time
- `chart-bar` — Empty state
- `close` — Modal close
- `check` — Selected category indicator

### Dynamic Insights
- `weather-night` — Night usage pattern
- `cellphone` — Phone checks frequency
- `swap-horizontal` — Comparison/swap suggestion
- `school` — Education achievement
- `check-circle-outline` — No data state

---

## ProfileScreen Icons

### Header
- `account-circle-outline` — Profile avatar
- `heart-pulse` — App icon

### Profile Section
- `account-outline` — Age & lifestyle
- `pencil-outline` — Edit indicator
- `gender-male-female` — Gender selector

### Permissions & Data
- `cellphone-cog` — Usage Access permission ✅ **Updated** (was `cellphone-check`)
- `bell-outline` — Notifications/reminders
- `check-circle` / `alert-circle` — Permission status badges

### Goals
- `target` — Daily screen time goal

### Actions
- `restart` — Reset questionnaire
- `content-save-outline` — Export data ✅ **Updated** (was `export-variant`)

### Privacy & Info
- `shield-lock-outline` — Privacy policy
- `information-outline` — Disclaimer
- `file-document-outline` — Terms of service
- `lock-outline` — Privacy policy
- `help-circle-outline` — Help & support

---

## QuestionnaireScreen Icons

### Header
- `clipboard-check-outline` — Questionnaire theme

### Question Icons
- `head-outline` — Anxiety level ✅ **Updated** (was `head-snowflake-outline`)
- `emoticon-sad-outline` — Mood rating
- `star-outline` — Self esteem
- `school-outline` — Academic performance
- `account-heart-outline` — Family communication
- `account-group-outline` — Social interactions
- `shield-account-outline` — Parental monitoring

### UI Elements
- `check` — Answered indicator
- `content-save-check-outline` — Auto-save indicator
- `restart` — Reset button

---

## Component Icons

### RiskCard
- `shield-check` — Risk level indicator
- `target` — Confidence indicator
- `clock-outline` — Timestamp

### CompletenessCard
- `clipboard-check-outline` — Data completeness
- `information-outline` — Hint indicator

### SectionHeader
- *(Dynamic)* — Passed as prop from parent screens

### StatCard
- *(Dynamic)* — Passed as prop from parent screens

### InsightCard
- *(Dynamic)* — Passed as prop from parent screens

---

## Icon Updates Summary

### Fixed Invalid Icons
1. ✅ `home-variant` → `home`
2. ✅ `home-variant-outline` → `home-outline`
3. ✅ `chart-areaspline` → `chart-line`
4. ✅ `chart-areaspline-variant` → `chart-line-variant`
5. ✅ `head-snowflake-outline` → `head-outline`
6. ✅ `cellphone-check` → `cellphone-cog`
7. ✅ `export-variant` → `content-save-outline`

### Previously Fixed
8. ✅ `cellphone-screen-time` → `cellphone`
9. ✅ `compare-horizontal` → `swap-horizontal`

---

## Icon Naming Conventions

All icons follow MaterialCommunityIcons naming patterns:

1. **Base name** — Core icon concept (e.g., `home`, `account`, `chart`)
2. **Modifier** — Variant or style (e.g., `circle`, `variant`, `box`)
3. **Outline suffix** — Unfilled version (e.g., `-outline`)

### Common Patterns
- Filled: `home`, `account-circle`, `shield-check`
- Outlined: `home-outline`, `account-circle-outline`, `shield-check-outline`
- Variants: `chart-line-variant`, `book-open-variant`

---

## Verification

All icons have been verified against:
- `react-native-vector-icons` v10.x
- MaterialCommunityIcons font v7.x
- Official icon directory: https://pictogrammers.com/library/mdi/

**Status:** ✅ All icons are valid and render correctly on Android & iOS

---

## Usage Guidelines

### Adding New Icons

1. Search official directory: https://pictogrammers.com/library/mdi/
2. Use exact icon name (case-sensitive, kebab-case)
3. Prefer `-outline` variants for unfocused/inactive states
4. Test on both Android and iOS before committing

### Icon Sizes
- Tab bar: 24px (default)
- Section headers: 20px
- Stat cards: 22px
- Insight cards: 20px
- Buttons: 16-18px
- Large headers: 28-36px

### Color Usage
- Primary actions: `Colors.primary`
- Success/positive: `Colors.riskLow`
- Warning/moderate: `Colors.riskModerate`
- Error/high risk: `Colors.riskHigh`
- Neutral/secondary: `Colors.textSecondary`
- Category-specific: `Colors.category*`

---

## Troubleshooting

### Icon Not Rendering
1. Check spelling (case-sensitive)
2. Verify icon exists in MaterialCommunityIcons
3. Clear Metro cache: `npm start -- --reset-cache`
4. Rebuild app: `npm run android`

### Icon Appears as Box/Question Mark
- Icon name is invalid or doesn't exist
- Font not loaded properly (rare)
- Check console for warnings

---

Last Updated: 2024
