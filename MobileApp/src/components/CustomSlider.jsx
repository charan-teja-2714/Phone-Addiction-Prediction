import React, { useCallback, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Radius, Spacing } from '../theme';

export const CustomSlider = ({
  value,
  min,
  max,
  step,
  onValueChange,
}) => {
  const trackWidth = useRef(0);
  const fraction = (value - min) / (max - min);

  const snapToStep = useCallback(
    (rawValue) => {
      const clamped = Math.max(min, Math.min(max, rawValue));
      return Math.round(clamped / step) * step;
    },
    [min, max, step],
  );

  const onLayout = useCallback((e) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const pct = x / trackWidth.current;
        const raw = min + pct * (max - min);
        onValueChange(snapToStep(raw));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(1, x / trackWidth.current));
        const raw = min + pct * (max - min);
        onValueChange(snapToStep(raw));
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={styles.label}>{min}</Text>
      <View
        style={styles.track}
        onLayout={onLayout}
        {...panResponder.panHandlers}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        <View style={[styles.thumb, { left: `${fraction * 100}%` }]} />
      </View>
      <Text variant="bodySmall" style={styles.label}>{max}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    width: 28,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
    top: 11,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    marginLeft: -11,
    top: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
