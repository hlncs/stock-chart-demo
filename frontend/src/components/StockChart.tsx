import { Box, Typography } from '@mui/material';
import { memo, useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MovingAveragePoint, PricePoint } from '../types';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const formattedDate = label ? new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date';

  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {formattedDate}
      </Typography>
      {payload
        .filter((entry: any) => entry?.value != null)
        .map((entry: any) => (
          <Typography key={entry.dataKey} variant="body2" sx={{ color: entry.color }}>
            {`${entry.name}: ${Number(entry.value).toFixed(2)}`}
          </Typography>
        ))}
    </Box>
  );
}

interface StockChartProps {
  priceData: PricePoint[];
  movingAverages: Record<string, MovingAveragePoint[]>;
  activeSMAs: Array<{ id: '20' | '50' | 'custom'; enabled: boolean; color: string; label: string }>;
  symbol: string;
}

export const StockChart = memo(function StockChart({ priceData, movingAverages, activeSMAs, symbol }: StockChartProps) {
  const enabledSMAs = useMemo(() => activeSMAs.filter((entry) => entry.enabled), [activeSMAs]);

  const chartData = useMemo(() => {
    return priceData.map((point) => {
      const row: Record<string, string | number | null> = {
        date: point.date,
        price: point.close,
      };

      for (const sma of enabledSMAs) {
        const seriesKey = `sma-${sma.id}`;
        const series = movingAverages[sma.id] ?? [];
        const match = series.find((entry) => entry.date === point.date);
        row[seriesKey] = match?.value ?? null;
      }

      return row;
    });
  }, [priceData, movingAverages, enabledSMAs]);

  return (
    <Box sx={{ height: 420, width: '100%' }}>
      {priceData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography color="text.secondary">No data available for {symbol}</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={20} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#4fc3f7" strokeWidth={2} dot={false} name="Price" />
            {enabledSMAs.map((entry) => (
              <Line
                key={entry.id}
                type="monotone"
                dataKey={`sma-${entry.id}`}
                stroke={entry.color}
                strokeWidth={2}
                dot={false}
                name={entry.label}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
});
