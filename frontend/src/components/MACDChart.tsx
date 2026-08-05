/**
 * MACDChart — renders MACD line, signal line, and histogram
 * using Lightweight Charts in an isolated canvas.
 */
import { Box, Typography } from '@mui/material';
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  createChart,
} from 'lightweight-charts';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { MACDConfig, MACDPoint } from '../types';

interface MACDChartProps {
  data: MACDPoint[];
  config: MACDConfig;
}

function toTime(d: string): Time {
  return d as Time;
}

export function MACDChart({ data, config }: MACDChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#1e1e1e' }, textColor: '#d0d0d0' },
      grid: { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#444' },
      timeScale: { borderColor: '#444', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });

    const histSeries = chart.addHistogramSeries({
      color: config.histUpColor,
      priceScaleId: 'right',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const macdSeries = chart.addLineSeries({
      color: config.macdColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: `MACD(${config.fast},${config.slow},${config.signal})`,
    });

    const signalSeries = chart.addLineSeries({
      color: config.signalColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'Signal',
    });

    chartRef.current = chart;
    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    histSeriesRef.current = histSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update colours when config changes
  useEffect(() => {
    macdSeriesRef.current?.applyOptions({
      color: config.macdColor,
      title: `MACD(${config.fast},${config.slow},${config.signal})`,
    });
    signalSeriesRef.current?.applyOptions({ color: config.signalColor });
  }, [config.macdColor, config.signalColor, config.fast, config.slow, config.signal]);

  // Update data
  useEffect(() => {
    if (!macdSeriesRef.current || !signalSeriesRef.current || !histSeriesRef.current) return;

    const macdData: LineData[] = data.map((pt) => ({ time: toTime(pt.date), value: pt.macd }));
    const signalData: LineData[] = data.map((pt) => ({ time: toTime(pt.date), value: pt.signal_line }));
    const histData = data.map((pt) => ({
      time: toTime(pt.date),
      value: pt.histogram,
      color: pt.histogram >= 0 ? config.histUpColor : config.histDownColor,
    }));

    macdSeriesRef.current.setData(macdData);
    signalSeriesRef.current.setData(signalData);
    histSeriesRef.current.setData(histData);

    if (data.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, config.histUpColor, config.histDownColor]);

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
        MACD ({config.fast}, {config.slow}, {config.signal})
      </Typography>
      <Box ref={containerRef} sx={{ height: 160, width: '100%', borderRadius: 1, overflow: 'hidden' }} />
    </Box>
  );
}
