import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, ProgressBar, Text } from 'react-native-paper';
import { CustomSlider } from '../components/CustomSlider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppStore } from '../store/useAppStore';
import { Colors, Radius, Spacing } from '../theme';

const QUESTIONS = [
  {
    key: 'anxietyLevel',
    icon: 'head-snowflake-outline',
    emoji: '😰',
    label: 'Anxiety Level',
    description: 'How anxious do you generally feel?',
    lowLabel: 'Calm',
    highLabel: 'Very anxious',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}/10`,
  },
  {
    key: 'depressionLevel',
    icon: 'emoticon-sad-outline',
    emoji: '😔',
    label: 'Mood Rating',
    description: 'How would you rate your mood overall?',
    lowLabel: 'Great mood',
    highLabel: 'Very low',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}/10`,
  },
  {
    key: 'selfEsteem',
    icon: 'star-outline',
    emoji: '⭐',
    label: 'Self Esteem',
    description: 'How confident do you feel about yourself?',
    lowLabel: 'Not confident',
    highLabel: 'Very confident',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}/10`,
  },
  {
    key: 'academicPerformance',
    icon: 'school-outline',
    emoji: '📚',
    label: 'Academic Performance',
    description: 'How well are you doing in your studies?',
    lowLabel: 'Struggling',
    highLabel: 'Excellent',
    min: 0,
    max: 100,
    step: 5,
    format: (v) => `${v}%`,
  },
  {
    key: 'familyCommunication',
    icon: 'account-heart-outline',
    emoji: '👨‍👩‍👧',
    label: 'Family Communication',
    description: 'How often do you talk to your family?',
    lowLabel: 'Rarely',
    highLabel: 'Very often',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}/10`,
  },
  {
    key: 'socialInteractions',
    icon: 'account-group-outline',
    emoji: '🤝',
    label: 'Social Interactions',
    description: 'How many meaningful social interactions do you have daily?',
    lowLabel: 'None',
    highLabel: 'Many',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}`,
  },
  {
    key: 'parentalControl',
    icon: 'shield-account-outline',
    emoji: '🛡️',
    label: 'Parental Monitoring',
    description: 'How much do your parents monitor your phone usage?',
    lowLabel: 'No monitoring',
    highLabel: 'Strict monitoring',
    min: 0,
    max: 10,
    step: 1,
    format: (v) => `${v}/10`,
  },
];

const QuestionCard = ({ config, value, onValueChange, index, total }) => {
  const displayValue = value ?? Math.round((config.min + config.max) / 2);
  const isAnswered = value !== null;

  return (
    <Card style={[styles.questionCard, isAnswered && styles.questionCardAnswered]}>
      <Card.Content>
        {/* Question number + status */}
        <View style={styles.questionTopRow}>
          <View style={styles.questionNumber}>
            <Text variant="labelSmall" style={styles.questionNumberText}>
              {index + 1}/{total}
            </Text>
          </View>
          {isAnswered && (
            <View style={styles.answeredBadge}>
              <Icon name="check" size={12} color={Colors.riskLow} />
              <Text variant="labelSmall" style={styles.answeredText}>Answered</Text>
            </View>
          )}
        </View>

        {/* Emoji + Question */}
        <View style={styles.questionHeader}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <View style={styles.questionTitleWrap}>
            <Text variant="titleSmall" style={styles.questionLabel}>
              {config.label}
            </Text>
            <Text variant="bodySmall" style={styles.questionDesc}>
              {config.description}
            </Text>
          </View>
        </View>

        {/* Slider with low/high labels */}
        <View style={styles.sliderSection}>
          <CustomSlider
            value={displayValue}
            min={config.min}
            max={config.max}
            step={config.step}
            onValueChange={onValueChange}
          />
          <View style={styles.rangeLabels}>
            <Text variant="labelSmall" style={styles.rangeLabel}>{config.lowLabel}</Text>
            <Text variant="labelSmall" style={styles.rangeLabel}>{config.highLabel}</Text>
          </View>
        </View>

        {/* Current value display */}
        <View style={styles.valueRow}>
          <Icon name={config.icon} size={18} color={Colors.primary} />
          <Text variant="titleMedium" style={styles.valueText}>
            {config.format(displayValue)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

export const QuestionnaireScreen = () => {
  const questionnaire = useAppStore((s) => s.questionnaire);
  const setField = useAppStore((s) => s.setQuestionnaireField);
  const completeness = useAppStore((s) => s.dataCompleteness);

  const handleChange = useCallback(
    (key) => (value) => {
      setField(key, value);
    },
    [setField],
  );

  const handleReset = useCallback(() => {
    QUESTIONS.forEach((q) => setField(q.key, null));
  }, [setField]);

  const filled = Object.values(questionnaire).filter((v) => v !== null).length;
  const pct = Math.round(completeness * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Icon name="clipboard-check-outline" size={32} color={Colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Wellbeing Check-in
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          These questions are completely optional. They help improve{'\n'}
          prediction accuracy through the ML model.
        </Text>
      </View>

      {/* Progress card */}
      <Card style={styles.progressCard}>
        <Card.Content>
          <View style={styles.progressHeader}>
            <Text variant="titleSmall" style={styles.progressTitle}>
              Progress
            </Text>
            <Text
              variant="titleMedium"
              style={[
                styles.progressPct,
                { color: pct >= 80 ? Colors.riskLow : pct >= 40 ? Colors.riskModerate : Colors.textSecondary },
              ]}>
              {filled}/{QUESTIONS.length}
            </Text>
          </View>
          <ProgressBar
            progress={completeness}
            color={pct >= 80 ? Colors.riskLow : pct >= 40 ? Colors.riskModerate : Colors.disabled}
            style={styles.progressBar}
          />
          <Text variant="bodySmall" style={styles.progressHint}>
            {pct === 0
              ? 'Slide any question to start'
              : pct < 100
              ? `${QUESTIONS.length - filled} questions remaining`
              : 'All questions answered! Predictions are at full accuracy.'}
          </Text>
        </Card.Content>
      </Card>

      {/* Questions */}
      {QUESTIONS.map((q, i) => (
        <QuestionCard
          key={q.key}
          config={q}
          value={questionnaire[q.key]}
          onValueChange={handleChange(q.key)}
          index={i}
          total={QUESTIONS.length}
        />
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.autoSaveNote}>
          <Icon name="content-save-check-outline" size={16} color={Colors.riskLow} />
          <Text variant="bodySmall" style={styles.autoSaveText}>
            Responses are saved automatically
          </Text>
        </View>

        {filled > 0 && (
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.resetButton}
            labelStyle={styles.resetLabel}
            icon="restart">
            Reset All Answers
          </Button>
        )}
      </View>

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
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20 },

  // ── Progress card ──
  progressCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.lg,
    borderRadius: Radius.md, backgroundColor: Colors.surface, elevation: 1,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  progressTitle: { fontWeight: '600', color: Colors.textPrimary },
  progressPct: { fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: Colors.divider },
  progressHint: { color: Colors.textSecondary, marginTop: Spacing.sm },

  // ── Question card ──
  questionCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: Colors.surface,
    elevation: 1, borderLeftWidth: 3, borderLeftColor: Colors.divider,
  },
  questionCardAnswered: { borderLeftColor: Colors.riskLow },
  questionTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  questionNumber: {
    backgroundColor: Colors.surfaceTint,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full,
  },
  questionNumberText: { color: Colors.textSecondary, fontWeight: '600' },
  answeredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.riskLowBg,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full,
  },
  answeredText: { color: Colors.riskLow, fontWeight: '600' },
  questionHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.md, marginBottom: Spacing.xs,
  },
  emoji: { fontSize: 32, marginTop: 2 },
  questionTitleWrap: { flex: 1 },
  questionLabel: { fontWeight: '700', color: Colors.textPrimary, fontSize: 15 },
  questionDesc: { color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },

  // ── Slider section ──
  sliderSection: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
  rangeLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, marginTop: -4,
  },
  rangeLabel: { color: Colors.disabled, fontSize: 10 },

  // ── Value display ──
  valueRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginTop: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight + '12', borderRadius: Radius.sm,
  },
  valueText: { color: Colors.primary, fontWeight: '700' },

  // ── Footer ──
  footer: { alignItems: 'center', marginTop: Spacing.md, gap: Spacing.md },
  autoSaveNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  autoSaveText: { color: Colors.textSecondary },
  resetButton: { borderColor: Colors.riskHigh + '40', borderRadius: Radius.md },
  resetLabel: { color: Colors.riskHigh, fontSize: 13 },
  bottomSpacer: { height: Spacing.lg },
});
