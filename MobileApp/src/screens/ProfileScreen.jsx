import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { hasUsagePermission, openUsageAccessSettings } from '../services/usageCollector';
import { useAppStore } from '../store/useAppStore';
import { formatHours } from '../utils/formatTime';
import { Colors, Radius, Spacing } from '../theme';

// ── Setting row variants ──

const SettingRow = ({ icon, label, subtitle, color = Colors.textPrimary, onPress, right }) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress}>
    <View style={[styles.settingIcon, { backgroundColor: color + '12' }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <View style={styles.settingText}>
      <Text variant="bodyLarge" style={styles.settingLabel}>{label}</Text>
      {subtitle && (
        <Text variant="bodySmall" style={styles.settingSubtitle}>{subtitle}</Text>
      )}
    </View>
    {right || <Icon name="chevron-right" size={20} color={Colors.disabled} />}
  </TouchableOpacity>
);

const SwitchRow = ({ icon, label, subtitle, color, value, onToggle }) => (
  <SettingRow
    icon={icon}
    label={label}
    subtitle={subtitle}
    color={color}
    onPress={onToggle}
    right={
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.divider, true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : Colors.disabled}
      />
    }
  />
);

const StatusBadge = ({ granted }) => (
  <View style={[styles.statusBadge, granted ? styles.statusGranted : styles.statusDenied]}>
    <Icon
      name={granted ? 'check-circle' : 'alert-circle'}
      size={14}
      color={granted ? Colors.riskLow : Colors.riskHigh}
    />
    <Text variant="labelSmall" style={{ color: granted ? Colors.riskLow : Colors.riskHigh, fontWeight: '600' }}>
      {granted ? 'Granted' : 'Not Granted'}
    </Text>
  </View>
);

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export const ProfileScreen = () => {
  const usageStats = useAppStore((s) => s.usageStats);
  const questionnaire = useAppStore((s) => s.questionnaire);
  const prediction = useAppStore((s) => s.prediction);
  const setQuestionnaireField = useAppStore((s) => s.setQuestionnaireField);
  const dataCompleteness = useAppStore((s) => s.dataCompleteness);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const dailyGoalHoursNum = useAppStore((s) => s.dailyGoalHours);
  const setDailyGoalStore = useAppStore((s) => s.setDailyGoalHours);

  // ── Local state ──
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [dailyGoalHours, setDailyGoalHours] = useState(String(dailyGoalHoursNum));
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [ageInput, setAgeInput] = useState(String(userProfile.age));
  const [sleepInput, setSleepInput] = useState(String(userProfile.sleepHours));
  const [exerciseInput, setExerciseInput] = useState(String(userProfile.exerciseHours));

  // Check permission on mount
  useEffect(() => {
    hasUsagePermission().then(setPermissionGranted);
  }, []);

  // ── Handlers ──

  const handlePermissionToggle = useCallback(async () => {
    if (permissionGranted) {
      Alert.alert(
        'Usage Permission',
        'Permission is currently granted. To revoke, go to Settings > Apps > Digital Wellbeing > Permissions.',
        [{ text: 'OK' }],
      );
    } else {
      const opened = await openUsageAccessSettings();
      if (!opened) {
        Alert.alert('Error', 'Could not open system settings. Please grant Usage Access permission manually.');
      }
    }
  }, [permissionGranted]);

  const handleNotificationToggle = useCallback(() => {
    setNotificationsOn((prev) => !prev);
  }, []);

  const handleSetGoal = useCallback(() => {
    setShowGoalEditor(true);
  }, []);

  const handleSaveGoal = useCallback(() => {
    const hours = parseFloat(dailyGoalHours);
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      Alert.alert('Invalid Goal', 'Please enter a value between 0.5 and 24 hours.');
      return;
    }
    setDailyGoalStore(hours);
    setShowGoalEditor(false);
    Alert.alert('Goal Saved', `Daily screen time goal set to ${hours}h.`);
  }, [dailyGoalHours, setDailyGoalStore]);

  const handleSaveProfile = useCallback(() => {
    const age = parseInt(ageInput, 10);
    const sleep = parseFloat(sleepInput);
    const exercise = parseFloat(exerciseInput);

    if (isNaN(age) || age < 5 || age > 100) {
      Alert.alert('Invalid Age', 'Please enter an age between 5 and 100.');
      return;
    }
    if (isNaN(sleep) || sleep < 0 || sleep > 24) {
      Alert.alert('Invalid Sleep', 'Please enter sleep hours between 0 and 24.');
      return;
    }
    if (isNaN(exercise) || exercise < 0 || exercise > 24) {
      Alert.alert('Invalid Exercise', 'Please enter exercise hours between 0 and 24.');
      return;
    }

    setUserProfile({ age, sleepHours: sleep, exerciseHours: exercise });
    setShowProfileEditor(false);
    Alert.alert('Profile Saved', 'Your profile has been updated.');
  }, [ageInput, sleepInput, exerciseInput, setUserProfile]);

  const handleGenderSelect = useCallback(
    (gender) => {
      setUserProfile({ gender });
    },
    [setUserProfile],
  );

  const handleResetQuestionnaire = useCallback(() => {
    Alert.alert(
      'Reset Questionnaire',
      'This will clear all your wellbeing check-in answers. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Object.keys(questionnaire).forEach((key) => setQuestionnaireField(key, null));
            Alert.alert('Done', 'All questionnaire answers have been reset.');
          },
        },
      ],
    );
  }, [questionnaire, setQuestionnaireField]);

  const handleExportData = useCallback(async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      usageStats,
      questionnaire,
      prediction,
      dataCompleteness: Math.round(dataCompleteness * 100) + '%',
    };

    try {
      await Share.share({
        title: 'Digital Wellbeing Data Export',
        message: JSON.stringify(exportData, null, 2),
      });
    } catch {
      Alert.alert('Export Failed', 'Could not share your data. Please try again.');
    }
  }, [usageStats, questionnaire, prediction, dataCompleteness]);

  const handleTerms = useCallback(() => {
    Alert.alert(
      'Terms of Service',
      'This application is a university final-year project for educational and research purposes.\n\n' +
      '• The app collects anonymized usage statistics only.\n' +
      '• No data is transmitted to external servers.\n' +
      '• All processing happens on your device.\n' +
      '• The ML model provides predictions, not medical diagnoses.\n\n' +
      'By using this app, you agree to these terms.',
      [{ text: 'OK' }],
    );
  }, []);

  const handlePrivacy = useCallback(() => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us.\n\n' +
      '• Data Collection: We collect aggregate app usage statistics (screen time, app categories). No personal data, messages, or browsing history is accessed.\n\n' +
      '• Storage: All data is stored locally on your device only.\n\n' +
      '• Sharing: No data is shared with third parties.\n\n' +
      '• Permissions: Usage Access permission is required to read app usage stats. This can be revoked at any time from system settings.\n\n' +
      '• Deletion: Uninstalling the app removes all stored data.',
      [{ text: 'OK' }],
    );
  }, []);

  const handleHelp = useCallback(() => {
    Alert.alert(
      'Help & Support',
      'How to use Digital Wellbeing:\n\n' +
      '1. Home — View your daily usage overview and risk assessment.\n\n' +
      '2. Insights — See detailed breakdowns and weekly trends.\n\n' +
      '3. Check-in — Optional wellbeing questionnaire to improve prediction accuracy.\n\n' +
      '4. Profile — Manage settings and permissions.\n\n' +
      'Need help?\n' +
      '• Pull down on Home or Insights to refresh data.\n' +
      '• Grant Usage Access permission for accurate tracking.\n' +
      '• The wellbeing check-in is optional but improves predictions.',
      [{ text: 'OK' }],
    );
  }, []);

  const filledCount = Object.values(questionnaire).filter((v) => v !== null).length;
  const totalQuestions = Object.keys(questionnaire).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Icon name="account-circle-outline" size={32} color={Colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>Profile</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Settings & information</Text>
      </View>

      {/* App Info Card */}
      <Card style={styles.appCard}>
        <Card.Content style={styles.appContent}>
          <View style={styles.appIconWrap}>
            <Icon name="heart-pulse" size={36} color={Colors.primary} />
          </View>
          <Text variant="titleMedium" style={styles.appName}>Digital Wellbeing</Text>
          <Text variant="bodySmall" style={styles.appVersion}>Version 1.0.0</Text>
          <Text variant="bodySmall" style={styles.appDesc}>
            Smartphone addiction prediction powered by machine learning.
            Helping you build healthier digital habits.
          </Text>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <Card style={styles.quickStatsCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>Your Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {formatHours(usageStats.dailyUsageHours)}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Screen Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {filledCount}/{totalQuestions}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Check-in</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: prediction ? Colors.riskModerate : Colors.textSecondary }]}>
                {prediction ? prediction.label.split(' ')[0] : '—'}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Risk Level</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Your Profile */}
      <Card style={styles.settingsCard}>
        <Card.Content style={styles.settingsList}>
          <Text variant="labelLarge" style={styles.cardSectionTitle}>Your Profile</Text>

          <SettingRow
            icon="account-outline"
            label="Age & Lifestyle"
            subtitle={`Age ${userProfile.age} · Sleep ${userProfile.sleepHours}h · Exercise ${userProfile.exerciseHours}h`}
            color={Colors.primary}
            onPress={() => setShowProfileEditor(!showProfileEditor)}
            right={
              <Icon
                name={showProfileEditor ? 'chevron-up' : 'pencil-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            }
          />

          {showProfileEditor && (
            <View style={styles.goalEditor}>
              <Text variant="bodySmall" style={styles.goalEditorLabel}>Age:</Text>
              <TextInput
                mode="outlined"
                value={ageInput}
                onChangeText={setAgeInput}
                keyboardType="number-pad"
                style={styles.goalInput}
                dense
                outlineColor={Colors.divider}
                activeOutlineColor={Colors.primary}
              />
              <Text variant="bodySmall" style={[styles.goalEditorLabel, { marginTop: Spacing.sm }]}>
                Sleep hours per night:
              </Text>
              <TextInput
                mode="outlined"
                value={sleepInput}
                onChangeText={setSleepInput}
                keyboardType="decimal-pad"
                style={styles.goalInput}
                dense
                outlineColor={Colors.divider}
                activeOutlineColor={Colors.primary}
              />
              <Text variant="bodySmall" style={[styles.goalEditorLabel, { marginTop: Spacing.sm }]}>
                Exercise hours per day:
              </Text>
              <TextInput
                mode="outlined"
                value={exerciseInput}
                onChangeText={setExerciseInput}
                keyboardType="decimal-pad"
                style={styles.goalInput}
                dense
                outlineColor={Colors.divider}
                activeOutlineColor={Colors.primary}
              />
              <View style={[styles.goalEditorRow, { marginTop: Spacing.sm }]}>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  style={styles.goalSaveBtn}
                  labelStyle={styles.goalSaveBtnLabel}
                  compact>
                  Save
                </Button>
                <Button
                  mode="text"
                  onPress={() => setShowProfileEditor(false)}
                  labelStyle={styles.goalCancelLabel}
                  compact>
                  Cancel
                </Button>
              </View>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.genderRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.categorySocial + '12' }]}>
              <Icon name="gender-male-female" size={20} color={Colors.categorySocial} />
            </View>
            <Text variant="bodyLarge" style={[styles.settingLabel, { flex: 1 }]}>Gender</Text>
            <View style={styles.genderChips}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderChip,
                    userProfile.gender === g && styles.genderChipActive,
                  ]}
                  onPress={() => handleGenderSelect(g)}>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.genderChipText,
                      userProfile.gender === g && styles.genderChipTextActive,
                    ]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Permissions & Data */}
      <Card style={styles.settingsCard}>
        <Card.Content style={styles.settingsList}>
          <Text variant="labelLarge" style={styles.cardSectionTitle}>Permissions & Data</Text>

          <SettingRow
            icon="cellphone-check"
            label="Usage Access"
            subtitle={permissionGranted ? 'Permission granted' : 'Tap to grant permission'}
            color={permissionGranted ? Colors.riskLow : Colors.riskHigh}
            onPress={handlePermissionToggle}
            right={<StatusBadge granted={permissionGranted} />}
          />
          <Divider style={styles.divider} />
          <SwitchRow
            icon="bell-outline"
            label="Reminders"
            subtitle="Daily wellbeing check-in reminders"
            color={Colors.primary}
            value={notificationsOn}
            onToggle={handleNotificationToggle}
          />
        </Card.Content>
      </Card>

      {/* Usage Goals */}
      <Card style={styles.settingsCard}>
        <Card.Content style={styles.settingsList}>
          <Text variant="labelLarge" style={styles.cardSectionTitle}>Goals</Text>

          <SettingRow
            icon="target"
            label="Daily Screen Time Goal"
            subtitle={`Current goal: ${dailyGoalHours}h per day`}
            color={Colors.riskLow}
            onPress={handleSetGoal}
            right={
              <View style={styles.goalBadge}>
                <Text variant="labelMedium" style={styles.goalBadgeText}>{dailyGoalHours}h</Text>
              </View>
            }
          />

          {showGoalEditor && (
            <View style={styles.goalEditor}>
              <Text variant="bodySmall" style={styles.goalEditorLabel}>
                Set your daily screen time goal (hours):
              </Text>
              <View style={styles.goalEditorRow}>
                <TextInput
                  mode="outlined"
                  value={dailyGoalHours}
                  onChangeText={setDailyGoalHours}
                  keyboardType="decimal-pad"
                  style={styles.goalInput}
                  dense
                  outlineColor={Colors.divider}
                  activeOutlineColor={Colors.primary}
                />
                <Button
                  mode="contained"
                  onPress={handleSaveGoal}
                  style={styles.goalSaveBtn}
                  labelStyle={styles.goalSaveBtnLabel}
                  compact>
                  Save
                </Button>
                <Button
                  mode="text"
                  onPress={() => setShowGoalEditor(false)}
                  labelStyle={styles.goalCancelLabel}
                  compact>
                  Cancel
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.settingsCard}>
        <Card.Content style={styles.settingsList}>
          <Text variant="labelLarge" style={styles.cardSectionTitle}>Actions</Text>

          <SettingRow
            icon="restart"
            label="Reset Questionnaire"
            subtitle={filledCount > 0 ? `${filledCount} answers will be cleared` : 'No answers to reset'}
            color={Colors.riskModerate}
            onPress={filledCount > 0 ? handleResetQuestionnaire : undefined}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="export-variant"
            label="Export My Data"
            subtitle="Share usage and questionnaire data"
            color={Colors.info}
            onPress={handleExportData}
          />
        </Card.Content>
      </Card>

      {/* Privacy & Data Card */}
      <Card style={styles.privacyCard}>
        <Card.Content>
          <View style={styles.privacyHeader}>
            <Icon name="shield-lock-outline" size={22} color={Colors.primary} />
            <Text variant="titleSmall" style={styles.privacyTitle}>Privacy & Data</Text>
          </View>
          <Text variant="bodySmall" style={styles.privacyText}>
            Your usage data stays on your device. Predictions are processed
            by sending anonymized usage metrics to the prediction server.
            No personal information or app names are shared. Only aggregate
            statistics are used for the ML model.
          </Text>
        </Card.Content>
      </Card>

      {/* Disclaimer */}
      <Card style={[styles.privacyCard, { backgroundColor: Colors.riskModerateBg }]}>
        <Card.Content>
          <View style={styles.privacyHeader}>
            <Icon name="information-outline" size={22} color={Colors.riskModerate} />
            <Text variant="titleSmall" style={styles.privacyTitle}>Disclaimer</Text>
          </View>
          <Text variant="bodySmall" style={styles.privacyText}>
            This app provides informational insights only and is not a medical
            diagnostic tool. If you are experiencing mental health concerns,
            please consult a qualified healthcare professional.
          </Text>
        </Card.Content>
      </Card>

      {/* About links */}
      <Card style={styles.settingsCard}>
        <Card.Content style={styles.settingsList}>
          <SettingRow
            icon="file-document-outline"
            label="Terms of Service"
            color={Colors.textSecondary}
            onPress={handleTerms}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="lock-outline"
            label="Privacy Policy"
            color={Colors.textSecondary}
            onPress={handlePrivacy}
          />
          <Divider style={styles.divider} />
          <SettingRow
            icon="help-circle-outline"
            label="Help & Support"
            color={Colors.textSecondary}
            onPress={handleHelp}
          />
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },

  // ── App card ──
  appCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: Colors.surface, elevation: 1,
  },
  appContent: { alignItems: 'center', paddingVertical: Spacing.lg },
  appIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: { fontWeight: '700', color: Colors.textPrimary },
  appVersion: { color: Colors.textSecondary, marginTop: 2 },
  appDesc: {
    color: Colors.textSecondary, textAlign: 'center',
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, lineHeight: 18,
  },

  // ── Quick Stats ──
  quickStatsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.surface, elevation: 1,
  },
  sectionTitle: { fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '700', color: Colors.primary },
  statLabel: { color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.divider },

  // ── Settings cards ──
  settingsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.surface, elevation: 1,
  },
  settingsList: { paddingVertical: Spacing.xs },
  cardSectionTitle: {
    fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.sm, marginTop: Spacing.xs,
    textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, gap: Spacing.md,
  },
  settingIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  settingText: { flex: 1 },
  settingLabel: { color: Colors.textPrimary },
  settingSubtitle: { color: Colors.textSecondary, marginTop: 1 },
  divider: { backgroundColor: Colors.divider },

  // ── Status badge ──
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full,
  },
  statusGranted: { backgroundColor: Colors.riskLowBg },
  statusDenied: { backgroundColor: Colors.riskHighBg },

  // ── Goal editor ──
  goalBadge: {
    backgroundColor: Colors.riskLowBg, paddingHorizontal: Spacing.md,
    paddingVertical: 4, borderRadius: Radius.full,
  },
  goalBadgeText: { color: Colors.riskLow, fontWeight: '700' },
  goalEditor: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.surfaceTint, borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  goalEditorLabel: { color: Colors.textSecondary, marginBottom: Spacing.sm },
  goalEditorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalInput: { width: 80, backgroundColor: Colors.surface },
  goalSaveBtn: { borderRadius: Radius.sm },
  goalSaveBtnLabel: { fontSize: 13 },
  goalCancelLabel: { fontSize: 13, color: Colors.textSecondary },

  // ── Privacy cards ──
  privacyCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.infoBg, elevation: 0,
  },
  privacyHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  privacyTitle: { fontWeight: '600', color: Colors.textPrimary },
  privacyText: { color: Colors.textSecondary, lineHeight: 18 },

  // ── Gender selector ──
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  genderChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  genderChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceTint,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  genderChipActive: {
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary,
  },
  genderChipText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  genderChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  bottomSpacer: { height: Spacing.lg },
});
