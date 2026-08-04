import { Box, Typography } from '@mui/material';
import { memo, useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MovingAveragePoint, PricePoint } from '../types';

interface StockChartProps {
  priceData: PricePoint[];
  movingAverages: Record<string, MovingAveragePoint[]>;
  activeSMAs: Array<{ id: '20' | '50' | 'custom'; enabled: boolean; color: string; label: string }>;
  symbol: string;
}

export const StockChart = memo(function StockChart({ priceData, movingAverages, activeSMAs, symbol }: StockChartProps) {
  const chartData = useMemo(() => {
    return priceData.map((point) => {
      const row: Record<string, string | number | null> = {
        date: point.date,
        price: point.close,
      };
      for (const sma of activeSMAs.filter((entry) => entry.enabled)) {
        const series = movingAverages[sma.id] ?? [];
        const match = series.find((entry) => entry.date === point.date);
        row[sma.label] = match?.value ?? null;
      }
      return row;
    });
  }, [priceData, movingAverages, activeSMAs]);

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
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#4fc3f7" strokeWidth={2} dot={false} />
            {activeSMAs
              .filter((entry) => entry.enabled)
              .map((entry) => (
                <Line
                  key={entry.id}
                  type="monotone"
                  dataKey={entry.label}
                  stroke={entry.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
});
