import {
  Box,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Tooltip title={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
      />
    </Tooltip>
  );
}

function NumInput({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={value}
      inputProps={{ min, max, step: 1, style: { width: 52 } }}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
      sx={{ width: 80 }}
    />
  );
}

export function IndicatorToolbar() {
  const rsiConfig = useAppStore((s) => s.rsiConfig);
  const macdConfig = useAppStore((s) => s.macdConfig);
  const setRsiConfig = useAppStore((s) => s.setRsiConfig);
  const setMacdConfig = useAppStore((s) => s.setMacdConfig);

  const [rsiOpen, setRsiOpen] = useState(false);
  const [macdOpen, setMacdOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>

      {/* RSI section */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600} sx={{ color: rsiConfig.color }}>RSI</Typography>
          <Tooltip title="Configure RSI">
            <IconButton size="small" onClick={() => setRsiOpen((v) => !v)}>
              {rsiOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Collapse in={rsiOpen}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            <NumInput label="Period" value={rsiConfig.period} min={2} max={100}
              onChange={(v) => setRsiConfig({ period: v })} />
            <NumInput label="OB" value={rsiConfig.obLevel} min={50} max={99}
              onChange={(v) => setRsiConfig({ obLevel: v })} />
            <NumInput label="OS" value={rsiConfig.osLevel} min={1} max={49}
              onChange={(v) => setRsiConfig({ osLevel: v })} />
            <ColorSwatch value={rsiConfig.color} onChange={(v) => setRsiConfig({ color: v })} label="RSI line colour" />
          </Stack>
        </Collapse>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* MACD section */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>MACD</Typography>
          <Typography variant="caption" color="text.secondary">
            {macdConfig.fast}/{macdConfig.slow}/{macdConfig.signal}
          </Typography>
          <Tooltip title="Configure MACD">
            <IconButton size="small" onClick={() => setMacdOpen((v) => !v)}>
              {macdOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Collapse in={macdOpen}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            <NumInput label="Fast" value={macdConfig.fast} min={2} max={macdConfig.slow - 1}
              onChange={(v) => setMacdConfig({ fast: v })} />
            <NumInput label="Slow" value={macdConfig.slow} min={macdConfig.fast + 1} max={200}
              onChange={(v) => setMacdConfig({ slow: v })} />
            <NumInput label="Signal" value={macdConfig.signal} min={1} max={50}
              onChange={(v) => setMacdConfig({ signal: v })} />
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ColorSwatch value={macdConfig.macdColor} onChange={(v) => setMacdConfig({ macdColor: v })} label="MACD line" />
              <ColorSwatch value={macdConfig.signalColor} onChange={(v) => setMacdConfig({ signalColor: v })} label="Signal line" />
              <ColorSwatch value={macdConfig.histUpColor} onChange={(v) => setMacdConfig({ histUpColor: v })} label="Histogram up" />
              <ColorSwatch value={macdConfig.histDownColor} onChange={(v) => setMacdConfig({ histDownColor: v })} label="Histogram down" />
            </Stack>
          </Stack>
        </Collapse>
      </Box>

    </Box>
  );
}
