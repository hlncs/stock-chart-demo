/**
 * RSIChart — renders an RSI line with configurable overbought/oversold levels
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
import { RSIConfig, RSIPoint } from '../types';

interface RSIChartProps {
  data: RSIPoint[];
  config: RSIConfig;
}

function toTime(d: string): Time {
  return d as Time;
}

export function RSIChart({ data, config }: RSIChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const obSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const osSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // keep config in a ref so the crosshair closure always sees the latest
  const configRef = useRef(config);
  configRef.current = config;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#1e1e1e' }, textColor: '#d0d0d0' },
      grid: { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#444', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: '#444', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });

    const rsiSeries = chart.addLineSeries({
      color: config.color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: `RSI(${config.period})`,
    });

    // Overbought / oversold reference lines
    const obSeries = chart.addLineSeries({
      color: '#ef535066',
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
      title: '',
    });
    const osSeries = chart.addLineSeries({
      color: '#26a69a66',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: '',
    });

    chartRef.current = chart;
    rsiSeriesRef.current = rsiSeries;
    obSeriesRef.current = obSeries;
    osSeriesRef.current = osSeries;

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

  // Update RSI line colour / title when config changes
  useEffect(() => {
    rsiSeriesRef.current?.applyOptions({
      color: config.color,
      title: `RSI(${config.period})`,
    });
  }, [config.color, config.period]);

  // Update data + OB/OS reference lines
  useEffect(() => {
    if (!rsiSeriesRef.current || !obSeriesRef.current || !osSeriesRef.current) return;
    const rsiData: LineData[] = data.map((pt) => ({ time: toTime(pt.date), value: pt.value }));
    rsiSeriesRef.current.setData(rsiData);

    if (data.length > 0) {
      const first = toTime(data[0].date);
      const last = toTime(data[data.length - 1].date);
      obSeriesRef.current.setData([
        { time: first, value: config.obLevel },
        { time: last, value: config.obLevel },
      ]);
      osSeriesRef.current.setData([
        { time: first, value: config.osLevel },
        { time: last, value: config.osLevel },
      ]);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, config.obLevel, config.osLevel]);

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
        RSI ({config.period}) — OB {config.obLevel} / OS {config.osLevel}
      </Typography>
      <Box ref={containerRef} sx={{ height: 160, width: '100%', borderRadius: 1, overflow: 'hidden' }} />
    </Box>
  );
}
