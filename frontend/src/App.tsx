import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIAnalysisPane } from './components/AIAnalysisPane';
import { MovingAverageToolbar } from './components/MovingAverageToolbar';
import { PortfolioPane } from './components/PortfolioPane';
import { StockChart } from './components/StockChart';
import { TickerList } from './components/TickerList';
import { fetchAIAnalysis, fetchMovingAverage, fetchPrices, fetchSymbols } from './services/api';
import { useAppStore } from './store/useAppStore';
import { AIAnalysis } from './types';

const periods = ['1M', 'YTD', '1Y', '3Y'];

export default function App() {
  const selectedTicker = useAppStore((state) => state.selectedTicker);
  const selectedPeriod = useAppStore((state) => state.selectedPeriod);
  const activeSMAs = useAppStore((state) => state.activeSMAs);
  const customWindow = useAppStore((state) => state.customWindow);
  const priceData = useAppStore((state) => state.priceData);
  const movingAverageData = useAppStore((state) => state.movingAverageData);
  const selectTicker = useAppStore((state) => state.selectTicker);
  const selectPeriod = useAppStore((state) => state.selectPeriod);
  const setPriceData = useAppStore((state) => state.setPriceData);
  const setMovingAverageData = useAppStore((state) => state.setMovingAverageData);

  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portfolio view state
  const [showPortfolio, setShowPortfolio] = useState(false);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const reloadSymbols = useCallback(async () => {
    try {
      const result = await fetchSymbols();
      setSymbols(result);
      if (!selectedTicker && result.length > 0) {
        selectTicker(result[0]);
      }
      // If the currently selected ticker was deleted, select the first remaining one
      if (selectedTicker && !result.includes(selectedTicker)) {
        selectTicker(result[0] ?? '');
      }
    } catch {
      setError('Unable to load symbols from the backend.');
    }
  }, [selectedTicker, selectTicker]);

  useEffect(() => {
    void reloadSymbols();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedTicker) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPrices(selectedTicker, selectedPeriod);
        if (!cancelled) {
          setPriceData(result.map((entry) => ({ date: entry.date, close: entry.close, volume: entry.volume ?? 0 })));
        }
      } catch {
        if (!cancelled) setError('Unable to load price history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTicker, selectedPeriod, setPriceData]);

  useEffect(() => {
    if (!selectedTicker) return;
    const active = activeSMAs.filter((entry) => entry.enabled);
    if (active.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const results = await Promise.all(
          active.map(async (entry) => {
            const window = entry.id === 'custom' ? customWindow : Number(entry.id);
            const data = await fetchMovingAverage(selectedTicker, window, selectedPeriod);
            return [entry.id, data] as const;
          }),
        );
        if (!cancelled) {
          results.forEach(([id, data]) => setMovingAverageData(id, data));
        }
      } catch {
        if (!cancelled) setError('Unable to load moving average data.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTicker, selectedPeriod, activeSMAs, customWindow, setMovingAverageData]);

  // Fetch AI analysis whenever ticker, period, or custom SMA window changes
  useEffect(() => {
    if (!selectedTicker) return;
    let cancelled = false;
    void (async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        // Use max(customWindow, 150) to respect the long-term rule
        const effectiveWindow = Math.max(customWindow, 150);
        const result = await fetchAIAnalysis(selectedTicker, selectedPeriod, effectiveWindow);
        if (!cancelled) setAiAnalysis(result);
      } catch {
        if (!cancelled) setAiError('Unable to load AI analysis.');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTicker, selectedPeriod, customWindow]);

  const chartSeries = useMemo(() => {
    return activeSMAs
      .filter((entry) => entry.enabled)
      .map((entry) => ({
        id: entry.id,
        label: entry.id === 'custom' ? `${customWindow} SMA` : entry.label,
        color: entry.color,
      }));
  }, [activeSMAs, customWindow]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Ticker list */}
          <TickerList
            symbols={symbols}
            selectedTicker={selectedTicker}
            showPortfolio={showPortfolio}
            onSelectTicker={(symbol) => { selectTicker(symbol); setShowPortfolio(false); }}
            onTogglePortfolio={() => setShowPortfolio((v) => !v)}
            onSymbolsChanged={() => void reloadSymbols()}
          />

          {/* Chart area / Portfolio */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {showPortfolio ? (
              <PortfolioPane symbols={symbols} />
            ) : (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <Typography variant="h4">Stock Chart Demo</Typography>
                <ToggleButtonGroup
                  color="primary"
                  value={selectedPeriod}
                  exclusive
                  onChange={(_, value) => value && selectPeriod(value)}
                >
                  {periods.map((period) => (
                    <ToggleButton key={period} value={period}>
                      {period}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
              <Divider />
              <MovingAverageToolbar />
              {error ? <Alert severity="error">{error}</Alert> : null}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <StockChart
                  priceData={priceData.map((entry) => ({
                    date: entry.date,
                    open: 0,
                    high: 0,
                    low: 0,
                    close: entry.close,
                    volume: entry.volume,
                  }))}
                  movingAverages={Object.fromEntries(
                    chartSeries.map((entry) => [entry.id, movingAverageData[entry.id] ?? []]),
                  )}
                  activeSMAs={chartSeries.map((entry) => ({
                    id: entry.id as '20' | '50' | 'custom',
                    enabled: true,
                    color: entry.color,
                    label: entry.label,
                  }))}
                  symbol={selectedTicker}
                />
              )}
            </Stack>
            )}
          </Box>

          {/* AI analysis pane */}
          {!showPortfolio && (
          <Box
            sx={{
              width: { xs: '100%', md: 'auto' },
              borderLeft: { md: 1 },
              borderColor: { md: 'divider' },
              pl: { md: 3 },
            }}
          >
            <AIAnalysisPane
              symbol={selectedTicker}
              analysis={aiAnalysis}
              loading={aiLoading}
              error={aiError}
            />
          </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
