import React from 'react';

const SweepText = ({
  text,
  active = true,
  duration = 1500,
  dimColor = 'rgba(255,255,255,0.34)',
  brightColor = '#ffffff',
  sweepSpread = 0.2,
  style = {},
  containerStyle = {},
}) => {
  const safeText = typeof text === 'string' ? text : '';

  if (!safeText) return null;

  const spreadPercent = Math.max(6, Math.min(30, Math.round(sweepSpread * 60)));
  const gradientLeft = 50 - spreadPercent;
  const gradientRight = 50 + spreadPercent;
  const softEdgeLeft = Math.max(0, gradientLeft - 12);
  const softEdgeRight = Math.min(100, gradientRight + 12);
  const rootStyle = {
    '--sweep-duration': `${Math.max(300, duration)}ms`,
  };
  const sweepStyles = `
    @keyframes zupiq-sweep-overlay {
      from { background-position: 180% 0; }
      to { background-position: -180% 0; }
    }

    .zupiq-sweep-text-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      color: transparent;
      background-repeat: no-repeat;
      background-size: 220% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation-name: zupiq-sweep-overlay;
      animation-duration: var(--sweep-duration);
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      will-change: background-position;
    }
  `;

  if (!active) {
    return (
      <span
        className="inline-flex items-center justify-center whitespace-nowrap"
        style={{ ...containerStyle }}
      >
        <span style={style}>{safeText}</span>
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex items-center justify-center whitespace-nowrap"
      style={{ ...rootStyle, ...containerStyle }}
    >
      <style>{sweepStyles}</style>
      <span style={{ ...style, color: dimColor }}>{safeText}</span>
      <span
        className="zupiq-sweep-text-overlay"
        style={{
          ...style,
          backgroundImage: `linear-gradient(90deg, transparent 0%, transparent ${softEdgeLeft}%, ${brightColor} ${gradientLeft}%, ${brightColor} ${gradientRight}%, transparent ${softEdgeRight}%, transparent 100%)`,
        }}
      >
        {safeText}
      </span>
    </span>
  );
};

export default SweepText;
