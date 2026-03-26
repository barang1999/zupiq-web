import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const SweepText = ({
  text,
  active = true,
  duration = 1500,
  dimColor = 'rgba(255,255,255,0.34)',
  brightColor = '#ffffff',
  sweepSpread = 0.2,
  style,
  containerStyle,
}) => {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const safeText = typeof text === 'string' ? text : '';
  const chars = useMemo(() => safeText.split(''), [safeText]);

  // Complex scripts (Khmer, Thai, Devanagari, Arabic, etc.) require the entire
  // string to be in a single text node for the font shaper to correctly form
  // ligatures and position combining marks. Per-character splitting breaks them.
  const isComplexScript = useMemo(
    () => /[\u0600-\u06FF\u0900-\u09FF\u0E00-\u0E7F\u1780-\u17FF\uAA60-\uAA7F]/.test(safeText),
    [safeText]
  );

  useEffect(() => {
    if (!active) {
      sweepAnim.stopAnimation();
      sweepAnim.setValue(0);
      return;
    }
    sweepAnim.setValue(0);
    const sweep = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    sweep.start();
    return () => {
      sweep.stop();
      sweepAnim.setValue(0);
    };
  }, [active, duration, sweepAnim, safeText]);

  if (!safeText) return null;

  if (!active) {
    return (
      <View style={[styles.row, containerStyle]}>
        <Text style={style}>{safeText}</Text>
      </View>
    );
  }

  if (isComplexScript) {
    return (
      <View style={[styles.row, containerStyle]}>
        <Animated.Text
          style={[
            style,
            {
              color: sweepAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [dimColor, brightColor, dimColor],
                extrapolate: 'clamp',
              }),
              textShadowRadius: sweepAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 2, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          {safeText}
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, containerStyle]}>
      {chars.map((char, index) => {
        const maxIndex = Math.max(chars.length - 1, 1);
        const stop = index / maxIndex;
        const left = Math.max(0, stop - sweepSpread);
        const right = Math.min(1, stop + sweepSpread);
        return (
          <Animated.Text
            key={`${char}-${index}`}
            style={[
              style,
              {
                color: sweepAnim.interpolate({
                  inputRange: [left, stop, right],
                  outputRange: [dimColor, brightColor, dimColor],
                  extrapolate: 'clamp',
                }),
                textShadowRadius: sweepAnim.interpolate({
                  inputRange: [left, stop, right],
                  outputRange: [0, 2, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {char === ' ' ? '\u00A0' : char}
          </Animated.Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    alignSelf: 'center',
  },
});

export default SweepText;
