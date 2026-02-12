import React from 'react';
import { View } from 'react-native';
import { Colors } from '../theme';

/**
 * Pure-View donut chart using thin rotated slices.
 *
 * 72 thin rectangles (5° each) extend from the outer edge to the center,
 * each colored according to the segment it belongs to. A white inner circle
 * creates the donut hole and hosts the center content.
 *
 * Props:
 *  - size           Outer diameter (default 200)
 *  - strokeWidth    Donut ring thickness (default 28)
 *  - segments       Array of { value: number, color: string }
 *  - centerContent  React node rendered inside the hole
 */

const STEP = 5; // degrees per slice
const NUM_SLICES = 360 / STEP; // 72

export const DonutChart = ({ size = 200, strokeWidth = 28, segments = [], centerContent }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const innerSize = size - strokeWidth * 2;

  // Wider than the 5° arc to ensure no gaps between slices
  const sliceWidth = Math.ceil(2 * Math.PI * (size / 2) * (STEP / 360)) + 6;

  // Map each degree to a segment colour
  const getColorAt = (degree) => {
    if (total <= 0) return Colors.divider;
    let cum = 0;
    for (const seg of segments) {
      if (seg.value <= 0) continue;
      cum += (seg.value / total) * 360;
      if (degree < cum) return seg.color;
    }
    return segments[segments.length - 1]?.color || Colors.divider;
  };

  // Pre-build slice data
  const slices = [];
  for (let d = 0; d < 360; d += STEP) {
    slices.push({ d, color: getColorAt(d) });
  }

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* Track circle (background ring) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.divider,
        }}
      />

      {/* Pie slices — each is a coloured rect from outer edge to center, rotated */}
      {slices.map(({ d, color }) => (
        <View
          key={d}
          style={{
            position: 'absolute',
            width: sliceWidth,
            height: size / 2,
            backgroundColor: color,
            left: (size - sliceWidth) / 2,
            top: 0,
            transformOrigin: '50% 100%', // bottom-center = donut center
            transform: [{ rotate: `${d}deg` }],
          }}
        />
      ))}

      {/* Inner hole (donut centre) */}
      <View
        style={{
          position: 'absolute',
          top: strokeWidth,
          left: strokeWidth,
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: Colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {centerContent}
      </View>
    </View>
  );
};
