import { Box, Divider, Typography } from '@mui/material';
import { memo, useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MovingAveragePoint, PricePoint } from '../types';

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const formattedDate = label
    ? new Date(label).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown date';

  // Separate price/SMA entries from the hidden volume entry
  const priceEntries = payload.filter(
    (entry: any) => entry?.value != null && entry.dataKey !== 'volume',
  );
  const volumeEntry = payload.find((entry: any) => entry.dataKey === 'volume');
  const volume: number | null = volumeEntry?.value ?? null;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 1,
        minWidth: 160,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {formattedDate}
      </Typography>

      {priceEntries.map((entry: any) => (
        <Typography key={entry.dataKey} variant="body2" sx={{ color: entry.color }}>
          {`${entry.name}: $${Number(entry.value).toFixed(2)}`}
        </Typography>
      ))}

      {volume != null && volume > 0 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Volume: {formatVolume(volume)}
          </Typography>
        </>
      )}
    </Box>
  );
}

interface StockChartProps {
  priceData: PricePoint[];
  movingAverages: Record<string, MovingAveragePoint[]>;
  activeSMAs: Array<{ id: '20' | '50' | 'custom'; enabled: boolean; color: string; label: string }>;
  symbol: string;
}

export const StockChart = memo(function StockChart({
  priceData,
  movingAverages,
  activeSMAs,
  symbol,
}: StockChartProps) {
  const enabledSMAs = useMemo(() => activeSMAs.filter((entry) => entry.enabled), [activeSMAs]);

  const chartData = useMemo(() => {
    return priceData.map((point) => {
      const row: Record<string, string | number | null> = {
        date: point.date,
        price: point.close,
        volume: point.volume ?? 0,
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Typography color="text.secondary">No data available for {symbol}</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={20} />

            {/* Primary Y axis — price scale only */}
            <YAxis yAxisId="price" />

            {/* Hidden Y axis for volume — keeps volume out of the price scale */}
            <YAxis yAxisId="volume" hide />

            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#4fc3f7"
              strokeWidth={2}
              dot={false}
              name="Price"
            />

            {/* Volume carried for tooltip only — invisible line on its own axis */}
            <Line
              yAxisId="volume"
              type="monotone"
              dataKey="volume"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              legendType="none"
              name="Volume"
              isAnimationActive={false}
            />

            {enabledSMAs.map((entry) => (
              <Line
                key={entry.id}
                yAxisId="price"
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
