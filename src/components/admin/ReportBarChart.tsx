'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type ReportChartStyle = 'bars' | 'line';

type ChartSeries = {
  key: string;
  value: number;
  colorClass: string;
  title?: string;
};

type ChartColumn = {
  label: string;
  subLabel?: string;
  valueLabel?: string;
  isTop?: boolean;
  series: ChartSeries[];
};

const PLOT_PAD_Y = 10;

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

function lineStroke(colorClass: string): string {
  if (colorClass.includes('amber') || colorClass.includes('yellow')) return '#fbbf24';
  if (colorClass.includes('emerald') || colorClass.includes('teal')) return '#34d399';
  if (colorClass.includes('rose') || colorClass.includes('pink')) return '#fb7185';
  if (colorClass.includes('violet') || colorClass.includes('purple')) return '#a78bfa';
  if (colorClass.includes('cyan')) return '#22d3ee';
  if (colorClass.includes('indigo') || colorClass.includes('sky')) return '#38bdf8';
  return '#34d399';
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const cp1y = Math.min(hi, Math.max(lo, p1.y + (p2.y - p0.y) / 6));
    const cp2y = Math.min(hi, Math.max(lo, p2.y - (p3.y - p1.y) / 6));
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** First day on the right, same RTL direction as the bars. */
function pointXPct(idx: number, count: number): number {
  if (count <= 1) return 50;
  return 1.5 + ((count - 1 - idx) / (count - 1)) * 97;
}

function gradientId(key: string): string {
  return `area-${key.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function TooltipSeriesList({ series }: { series: ChartSeries[] }) {
  return (
    <>
      {series.map((item) => {
        const color = lineStroke(item.colorClass);
        return (
          <div key={item.key} className="flex items-center gap-1.5 font-sans" style={{ color }}>
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span>{item.title || item.key}: {item.value.toLocaleString()} ج.م</span>
          </div>
        );
      })}
    </>
  );
}

export function ReportBarChart({
  columns,
  maxValue,
  style = 'bars',
}: {
  columns: ChartColumn[];
  maxValue: number;
  style?: ReportChartStyle;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });
  const peak = Math.max(maxValue, 1);
  const ticks = [peak, peak * 0.75, peak * 0.5, peak * 0.25, 0];
  const seriesKeys = Array.from(new Set(columns.flatMap((column) => column.series.map((item) => item.key))));
  const isLine = style === 'line';

  useEffect(() => {
    if (!isLine) return;
    const el = plotRef.current;
    if (!el) return;
    const update = () => {
      setPlotSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLine]);

  const lineSeries = useMemo(() => {
    const { w, h } = plotSize;
    if (!isLine || w <= 0 || h <= 0) return [];
    const plotH = h - PLOT_PAD_Y * 2;

    return seriesKeys.map((seriesKey) => {
      const points = columns.map((column, idx) => {
        const match = column.series.find((item) => item.key === seriesKey);
        const value = match?.value || 0;
        return {
          x: (pointXPct(idx, columns.length) / 100) * w,
          y: PLOT_PAD_Y + (1 - value / peak) * plotH,
          value,
          title: match?.title || seriesKey,
          colorClass: match?.colorClass || '',
        };
      });
      const colorClass = points.find((point) => point.colorClass)?.colorClass || '';
      const stroke = lineStroke(colorClass);
      const line = smoothPath(points);
      const baseline = PLOT_PAD_Y + plotH;
      const area = `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
      return { key: seriesKey, stroke, line, area, points };
    });
  }, [columns, isLine, peak, plotSize, seriesKeys]);

  const activeIdx = hoverIdx ?? (isLine
    ? columns.reduce((best, column, idx) => {
        const value = column.series.reduce((sum, item) => sum + item.value, 0);
        const bestValue = columns[best]?.series.reduce((sum, item) => sum + item.value, 0) || 0;
        return value > bestValue ? idx : best;
      }, 0)
    : null);

  const plotXPct = activeIdx === null ? 50 : pointXPct(activeIdx, columns.length);

  return (
    <div className="pt-4 pb-2 px-2 sm:px-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-x-auto">
      <div className="min-w-[520px] flex gap-2">
        <div className="relative flex-1 h-80">
          <div className="absolute inset-x-0 top-0 bottom-12 flex flex-col justify-between pointer-events-none">
            {ticks.map((tick, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 border-t border-slate-800/70" />
                <span className="w-10 shrink-0 text-[10px] font-bold text-slate-500 font-sans text-left">
                  {formatAxisValue(tick)}
                </span>
              </div>
            ))}
          </div>

          {isLine && (
            <div
              ref={plotRef}
              className="absolute inset-x-0 top-0 bottom-12"
              onMouseLeave={() => setHoverIdx(null)}
            >
              {plotSize.w > 0 && plotSize.h > 0 && (
                <svg
                  viewBox={`0 0 ${plotSize.w} ${plotSize.h}`}
                  className="absolute inset-0 h-full w-full pointer-events-none overflow-visible"
                >
                  <defs>
                    {lineSeries.map((series) => (
                      <linearGradient key={series.key} id={gradientId(series.key)} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={series.stroke} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={series.stroke} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>
                  {lineSeries.map((series) => (
                    <path
                      key={`${series.key}-area`}
                      d={series.area}
                      fill={`url(#${gradientId(series.key)})`}
                    />
                  ))}
                  {lineSeries.map((series) => (
                    <path
                      key={`${series.key}-line`}
                      d={series.line}
                      fill="none"
                      stroke={series.stroke}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                  {lineSeries.map((series) =>
                    series.points.map((point, idx) => (
                      <g key={`${series.key}-dot-${idx}`}>
                        {idx === activeIdx && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="10"
                            fill={series.stroke}
                            fillOpacity="0.2"
                          />
                        )}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={idx === activeIdx ? 6 : 5}
                          fill={series.stroke}
                          stroke="#020617"
                          strokeWidth="2"
                        />
                      </g>
                    ))
                  )}
                </svg>
              )}

              {columns.map((column, idx) => (
                <button
                  key={`${column.label}-hit-${idx}`}
                  type="button"
                  className="absolute top-0 bottom-0 z-10 cursor-pointer border-0 bg-transparent p-0"
                  style={{
                    left: `${pointXPct(idx, columns.length)}%`,
                    width: `${100 / Math.max(columns.length, 1)}%`,
                    transform: 'translateX(-50%)',
                  }}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onFocus={() => setHoverIdx(idx)}
                  aria-label={column.label}
                />
              ))}

              {activeIdx !== null && columns[activeIdx] && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-slate-400/70 pointer-events-none z-20"
                  style={{ left: `${plotXPct}%` }}
                />
              )}

              {activeIdx !== null && columns[activeIdx] && (
                <div
                  className="absolute z-40 pointer-events-none bg-slate-800 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 shadow-2xl border border-slate-700 whitespace-nowrap"
                  style={{
                    left: `${plotXPct}%`,
                    top: 8,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div>{columns[activeIdx].label}</div>
                  <TooltipSeriesList series={columns[activeIdx].series} />
                </div>
              )}
            </div>
          )}

          {!isLine && (
            <div className="absolute inset-x-0 top-0 bottom-12 flex items-end justify-between gap-2 px-1">
              {columns.map((column, idx) => (
                <div
                  key={`${column.label}-${idx}`}
                  className="flex-1 h-full flex items-end justify-center gap-0.5 min-w-[28px] group relative"
                >
                  <div className="absolute -top-8 z-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-none bg-slate-800 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 shadow-2xl border border-slate-700 whitespace-nowrap">
                    <div>{column.label}</div>
                    <TooltipSeriesList series={column.series} />
                  </div>

                  {column.series.map((bar) => {
                    const heightPct = bar.value > 0 ? Math.max((bar.value / peak) * 100, 8) : 0;
                    return (
                      <div
                        key={bar.key}
                        className="h-full w-full max-w-[42px] flex items-end"
                        title={bar.title || column.label}
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-xl border border-white/10 shadow-lg transition-all duration-500 ${bar.colorClass} ${
                            column.isTop ? 'ring-2 ring-amber-300/70' : ''
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-12 pt-1.5">
            {isLine ? (
              columns.map((column, idx) => {
                const showLabel = columns.length <= 16 || idx === 0 || idx === columns.length - 1 || idx % Math.ceil(columns.length / 8) === 0;
                if (!showLabel) return null;
                return (
                  <div
                    key={`${column.label}-label-${idx}`}
                    className="absolute text-center"
                    style={{
                      left: `${pointXPct(idx, columns.length)}%`,
                      transform: 'translateX(-50%)',
                      width: '4.5rem',
                    }}
                  >
                    {column.isTop && (
                      <span className="text-amber-400 text-[9px] font-black block">الأعلى</span>
                    )}
                    <span className="text-[10px] font-black text-slate-300 block truncate" title={column.label}>
                      {column.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-start justify-between gap-1 px-1">
                {columns.map((column, idx) => {
                  const showLabel = columns.length <= 16 || idx === 0 || idx === columns.length - 1 || idx % Math.ceil(columns.length / 8) === 0;
                  return (
                    <div key={`${column.label}-label-${idx}`} className="flex-1 text-center min-w-[20px]">
                      {showLabel && (
                        <>
                          {column.isTop && (
                            <span className="text-amber-400 text-[9px] font-black block">الأعلى</span>
                          )}
                          <span className="text-[10px] font-black text-slate-300 block truncate" title={column.label}>
                            {column.label}
                          </span>
                          {column.subLabel && (
                            <span className="text-[9px] text-slate-500 font-bold block font-sans">{column.subLabel}</span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
