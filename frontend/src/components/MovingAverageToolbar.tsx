import { Box, Button, Stack, TextField } from '@mui/material';
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

interface MovingAverageToolbarProps {
  onWindowChange?: (window: number) => void;
}

const smaDefinitions = [
  { id: '20' as const, label: '20 SMA', defaultColor: '#2196f3' },
  { id: '50' as const, label: '50 SMA', defaultColor: '#4caf50' },
  { id: 'custom' as const, label: 'Custom SMA', defaultColor: '#ff9800' },
];

export function MovingAverageToolbar({ onWindowChange }: MovingAverageToolbarProps) {
  const activeSMAs = useAppStore((state) => state.activeSMAs);
  const toggleSMA = useAppStore((state) => state.toggleSMA);
  const setColor = useAppStore((state) => state.setColor);
  const customWindow = useAppStore((state) => state.customWindow);
  const setCustomWindow = useAppStore((state) => state.setCustomWindow);

  const customSMA = useMemo(() => activeSMAs.find((entry) => entry.id === 'custom'), [activeSMAs]);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      {smaDefinitions.map((sma) => {
        const config = activeSMAs.find((entry) => entry.id === sma.id);
        if (!config) return null;
        return (
          <Stack key={sma.id} direction="row" spacing={1} alignItems="center">
            <Button
              variant={config.enabled ? 'contained' : 'outlined'}
              color={config.enabled ? 'primary' : 'inherit'}
              onClick={() => toggleSMA(sma.id, !config.enabled)}
            >
              {sma.label}
            </Button>
            <input
              type="color"
              value={config.color}
              onChange={(event) => setColor(sma.id, event.target.value)}
              aria-label={`${sma.label} color`}
              style={{ width: 40, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
          </Stack>
        );
      })}
      {customSMA?.enabled ? (
        <TextField
          size="small"
          label="Window"
          type="number"
          value={customWindow}
          inputProps={{ min: 2, step: 1 }}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isNaN(value)) {
              setCustomWindow(value);
              onWindowChange?.(value);
            }
          }}
        />
      ) : null}
    </Box>
  );
}
