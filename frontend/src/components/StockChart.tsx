import { Box, Paper, Typography } from '@mui/material';
import {
  CandlestickData,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  createChart,
} from 'lightweight-charts';
import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { MovingAveragePoint, PricePoint } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveSMA {
  id: '20' | '50' | 'custom';
  enabled: boolean;
  color: string;
  label: string;
}

interface StockChartProps {
  priceData: PricePoint[];
  movingAverages: Record<string, MovingAveragePoint[]>;
  activeSMAs: ActiveSMA[];
  symbol: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTime(dateStr: string): Time {
  // Lightweight Charts expects 'YYYY-MM-DD' strings for daily data
  return dateStr as Time;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

// ---------------------------------------------------------------------------
// Custom crosshair tooltip
// ---------------------------------------------------------------------------

function createTooltip(container: HTMLElement): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    display: none;
    z-index: 100;
    pointer-events: none;
    background: rgba(30,30,30,0.92);
    border: 1px solid #444;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: #e0e0e0;
    min-width: 150px;
    line-height: 1.6;
    font-family: monospace;
  `;
  container.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// StockChart component
// ---------------------------------------------------------------------------

export const StockChart = memo(function StockChart({
  priceData,
  movingAverages,
  activeSMAs,
  symbol,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  // Keep refs to props for the crosshair handler closure
  const priceDataRef = useRef<PricePoint[]>(priceData);
  priceDataRef.current = priceData;
  const activeSMAsRef = useRef<ActiveSMA[]>(activeSMAs);
  activeSMAsRef.current = activeSMAs;

  // -------------------------------------------------------------------------
  // Create chart once
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e1e1e' },
        textColor: '#d0d0d0',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#444',
      },
      timeScale: {
        borderColor: '#444',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series — main price pane
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Volume histogram — separate pane via priceScaleId
    const volumeSeries = chart.addHistogramSeries({
      color: '#4fc3f744',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Tooltip overlay
    tooltipRef.current = createTooltip(containerRef.current);

    // Crosshair subscription
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !containerRef.current) return;

      if (
        !param.time ||
        param.point === undefined ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        tooltip.style.display = 'none';
        return;
      }

      // Find matching price row
      const dateStr = param.time as string;
      const row = priceDataRef.current.find((p) => p.date === dateStr);

      // Collect SMA values — look up label from activeSMAs ref
      const smaLines = Array.from(smaSeriesRef.current.entries())
        .map(([id, series]) => {
          const val = param.seriesData.get(series) as LineData | undefined;
          if (val?.value == null) return null;
          const smaDef = activeSMAsRef.current.find((s) => s.id === id);
          return smaDef ? { label: smaDef.label, color: smaDef.color, value: val.value } : null;
        })
        .filter(Boolean) as Array<{ label: string; color: string; value: number }>;

      // Build tooltip HTML
      let html = `<div style="color:#aaa;margin-bottom:4px">${dateStr}</div>`;
      if (row) {
        html += `<div>O: <b>$${row.open.toFixed(2)}</b></div>`;
        html += `<div>H: <b style="color:#26a69a">$${row.high.toFixed(2)}</b></div>`;
        html += `<div>L: <b style="color:#ef5350">$${row.low.toFixed(2)}</b></div>`;
        html += `<div>C: <b>$${row.close.toFixed(2)}</b></div>`;
      }
      for (const sma of smaLines) {
        html += `<div style="color:${sma.color}">${sma.label}: <b>$${sma.value.toFixed(2)}</b></div>`;
      }
      if (row && row.volume > 0) {
        html += `<hr style="border-color:#444;margin:4px 0">`;
        html += `<div style="color:#aaa">Vol: <b>${formatVolume(row.volume)}</b></div>`;
      }
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';

      // Position tooltip — flip to left side if too close to right edge
      const containerWidth = containerRef.current.clientWidth;
      const tooltipWidth = 160;
      const left =
        param.point.x + tooltipWidth + 20 > containerWidth
          ? param.point.x - tooltipWidth - 10
          : param.point.x + 15;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(param.point.y - 60, 8)}px`;
    });

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current.clear();
      tooltipRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Update candlestick + volume data when priceData changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candles: CandlestickData[] = priceData
      .filter((p) => p.open > 0 && p.high > 0 && p.low > 0 && p.close > 0)
      .map((p) => ({
        time: toTime(p.date),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }));

    const volumes = priceData.map((p) => ({
      time: toTime(p.date),
      value: p.volume ?? 0,
      color: p.close >= p.open ? '#26a69a44' : '#ef535044',
    }));

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);

    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [priceData]);

  // -------------------------------------------------------------------------
  // Update SMA series when moving averages or activeSMAs change
  // -------------------------------------------------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const existing = smaSeriesRef.current;
    const activeIds = new Set(activeSMAs.map((s) => s.id));

    // Remove series for SMAs no longer in the active list
    for (const [id, series] of existing.entries()) {
      if (!activeIds.has(id as ActiveSMA['id'])) {
        chart.removeSeries(series);
        existing.delete(id);
      }
    }

    for (const sma of activeSMAs) {
      const data: LineData[] = (movingAverages[sma.id] ?? []).map((pt) => ({
        time: toTime(pt.date),
        value: pt.value,
      }));

      if (!existing.has(sma.id)) {
        // Create new line series keyed by sma.id
        const series = chart.addLineSeries({
          color: sma.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          title: sma.label,
        });
        series.setData(data);
        existing.set(sma.id, series);
      } else {
        // Update color, label, and data on existing series
        const series = existing.get(sma.id)!;
        series.applyOptions({ color: sma.color, title: sma.label });
        series.setData(data);
      }
    }
  }, [activeSMAs, movingAverages]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (priceData.length === 0) {
    return (
      <Box sx={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No data available for {symbol}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={containerRef}
        sx={{ height: 480, width: '100%', borderRadius: 1, overflow: 'hidden' }}
      />
      {/* Legend */}
      <Paper
        variant="outlined"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          px: 1.5,
          py: 0.5,
          bgcolor: 'rgba(30,30,30,0.85)',
          border: '1px solid #444',
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ color: '#26a69a' }}>▲ Bull</Typography>
        <Typography variant="caption" sx={{ color: '#ef5350' }}>▼ Bear</Typography>
        {activeSMAs.map((sma) => (
          <Typography key={sma.id} variant="caption" sx={{ color: sma.color }}>
            — {sma.label}
          </Typography>
        ))}
      </Paper>
    </Box>
  );
});
