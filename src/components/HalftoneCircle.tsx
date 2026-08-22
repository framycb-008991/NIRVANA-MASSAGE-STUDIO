import React, { useMemo } from 'react';

interface HalftoneCircleProps {
  size?: number;
  className?: string;
  color?: string; // Hex or CSS var
  opacity?: number;
  withAmbientGrid?: boolean;
}

/**
 * Signature Nirvana Halftone Circle
 * Accurately matches the brand book halftone wave-density circle:
 * - Circular bounding mask
 * - Sinusoidal S-curve wave distortion on vertical dot columns
 * - Smooth wave gradient dot scaling (peak density through the central S-curve)
 * - Optional ambient background dot grid
 */
export const HalftoneCircle: React.FC<HalftoneCircleProps> = ({
  size = 120,
  className = '',
  color = '#8A7A68',
  opacity = 1,
  withAmbientGrid = false
}) => {
  const { sphereDots, ambientDots } = useMemo(() => {
    const radius = size / 2;
    const center = radius;
    const sphereList: { cx: number; cy: number; r: number; key: string }[] = [];
    const ambientList: { cx: number; cy: number; r: number; key: string; op: number }[] = [];

    // Ambient background dot grid if requested
    if (withAmbientGrid) {
      const ambCols = 19;
      const ambRows = 11;
      const stepX = size / (ambCols - 1);
      const stepY = size / (ambRows - 1);

      for (let i = 0; i < ambCols; i++) {
        for (let j = 0; j < ambRows; j++) {
          const cx = i * stepX;
          const cy = j * stepY;
          const dist = Math.hypot(cx - center, cy - center);
          // Distance fade
          const fade = Math.max(0, 1 - dist / (radius * 1.3));
          if (fade > 0.05) {
            ambientList.push({
              cx: Number(cx.toFixed(1)),
              cy: Number(cy.toFixed(1)),
              r: Number((size * 0.024).toFixed(2)),
              key: `amb-${i}-${j}`,
              op: Number((fade * 0.22).toFixed(3))
            });
          }
        }
      }
    }

    // Main Sphere Halftone Dot Grid
    const numCols = 23;
    const numRows = 23;
    const step = size / (numCols + 1);

    for (let c = 0; c < numCols; c++) {
      for (let r = 0; r < numRows; r++) {
        // Base normalized coords in [-1, 1]
        const nx = ((c + 1) * step - center) / radius;
        const ny = ((r + 1) * step - center) / radius;

        // Check if inside circle
        const distFromCenter = Math.hypot(nx, ny);
        if (distFromCenter > 0.96) continue;

        // S-curve wave distortion on X based on Y (creates the iconic S-wave flow from the logo)
        const waveX = nx - 0.22 * Math.sin(ny * Math.PI * 1.35);
        const waveY = ny + 0.08 * Math.cos(nx * Math.PI);

        // Intensity calculation based on distance to the diagonal S-curve center
        // Diagonal line through center: waveX - waveY * 0.6
        const waveDist = Math.abs(waveX * 0.85 + waveY * 0.52);
        
        // Intensity envelope (highest in the central wave crest, tapering towards edges)
        const radialFade = Math.cos(distFromCenter * (Math.PI / 2));
        const waveIntensity = Math.exp(-Math.pow(waveDist / 0.55, 2));
        const combinedIntensity = Math.max(0.12, waveIntensity * radialFade);

        // Calculate dot radius
        const maxDotRadius = step * 0.44;
        const minDotRadius = step * 0.12;
        const dotR = minDotRadius + (maxDotRadius - minDotRadius) * combinedIntensity;

        const cx = center + nx * radius;
        const cy = center + ny * radius;

        sphereList.push({
          cx: Number(cx.toFixed(1)),
          cy: Number(cy.toFixed(1)),
          r: Number(dotR.toFixed(2)),
          key: `dot-${c}-${r}`
        });
      }
    }

    return { sphereDots: sphereList, ambientDots: ambientList };
  }, [size, withAmbientGrid]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`halftone-sphere ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Ambient background dots if active */}
      {ambientDots.length > 0 && (
        <g fill={color}>
          {ambientDots.map((d) => (
            <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} opacity={d.op} />
          ))}
        </g>
      )}

      {/* Main Halftone Wave Sphere */}
      <g fill={color}>
        {sphereDots.map((d) => (
          <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} />
        ))}
      </g>
    </svg>
  );
};
