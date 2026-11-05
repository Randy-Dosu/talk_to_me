import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayPoint } from '../engine/trends';

interface TooltipPayloadItem {
  payload?: DayPoint;
  value?: number | string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2 text-[0.75rem] shadow-lg">
      <p className="font-medium text-ink">{point.label}</p>
      {point.mood === null ? (
        <p className="text-ink-muted">No entry this day</p>
      ) : (
        <>
          <p className="text-ink-soft">
            mood <span className="font-semibold text-ink">{point.mood}</span> / 100
          </p>
          <p className="text-ink-muted">
            {point.entries} {point.entries === 1 ? 'entry' : 'entries'}
            {point.risk !== 'none' ? ` · ${point.risk} risk language` : ''}
          </p>
          {point.checkin && (
            <p className="text-ink-muted">
              {point.checkin.scale === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} {point.checkin.score}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function MoodChart({ points, height = 240 }: { points: DayPoint[]; height?: number }) {
  const data = useMemo(
    () => points.map((p) => ({ ...p, plot: p.mood })),
    [points],
  );
  const hasAny = points.some((p) => p.mood !== null);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F4B3F" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#1F4B3F" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="#DCD2C3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6B7A72' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10, fill: '#6B7A72' }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={52} stroke="#6F8F74" strokeOpacity={0.35} strokeDasharray="4 4" />
          <ReferenceLine y={30} stroke="#A8433F" strokeOpacity={0.28} strokeDasharray="4 4" />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#B9AA95', strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="plot"
            stroke="#1F4B3F"
            strokeWidth={2}
            fill="url(#moodFill)"
            connectNulls={false}
            dot={{ r: 2.4, fill: '#1F4B3F', strokeWidth: 0 }}
            activeDot={{ r: 4.5, fill: '#BD5A3C', strokeWidth: 0 }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
      {!hasAny && <p className="-mt-24 text-center text-[0.8rem] text-ink-muted">No readings yet in this window.</p>}
    </div>
  );
}
