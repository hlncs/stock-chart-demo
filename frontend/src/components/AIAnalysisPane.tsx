import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { AIAnalysis, DocumentInsight, SMASignal, SignalType, SentimentType } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalColor(signal: SignalType): 'success' | 'error' | 'warning' {
  if (signal === 'BUY') return 'success';
  if (signal === 'SELL') return 'error';
  return 'warning';
}

function signalIcon(signal: SignalType) {
  if (signal === 'BUY') return <TrendingUpIcon fontSize="small" />;
  if (signal === 'SELL') return <TrendingDownIcon fontSize="small" />;
  return <TrendingFlatIcon fontSize="small" />;
}

function sentimentColor(sentiment: SentimentType): 'success' | 'error' | 'default' {
  if (sentiment === 'POSITIVE') return 'success';
  if (sentiment === 'NEGATIVE') return 'error';
  return 'default';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SignalBadge({ signal }: { signal: SignalType }) {
  return (
    <Chip
      icon={signalIcon(signal)}
      label={signal}
      color={signalColor(signal)}
      size="small"
      sx={{ fontWeight: 700, fontSize: '0.8rem', px: 0.5 }}
    />
  );
}

function SMACard({ data }: { data: SMASignal }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        bgcolor: 'background.default',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="subtitle2" fontWeight={600}>
          {data.timeframe}
        </Typography>
        <SignalBadge signal={data.signal} />
      </Stack>
      {data.fast_sma != null && data.slow_sma != null && (
        <Stack direction="row" spacing={2} mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            Fast SMA: <strong>{data.fast_sma.toFixed(2)}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Slow SMA: <strong>{data.slow_sma.toFixed(2)}</strong>
          </Typography>
        </Stack>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {data.comment}
      </Typography>
    </Box>
  );
}

function DocInsightCard({ doc }: { doc: DocumentInsight }) {
  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: '8px !important', mb: 1, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', pr: 1 }}>
          <DescriptionIcon fontSize="small" color="action" />
          <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 500 }}>
            {doc.filename}
          </Typography>
          <Chip
            label={doc.sentiment}
            color={sentimentColor(doc.sentiment)}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block' }}>
          {doc.snippet}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Main pane
// ---------------------------------------------------------------------------

interface AIAnalysisPaneProps {
  symbol: string;
  analysis: AIAnalysis | null;
  loading: boolean;
  error: string | null;
}

export function AIAnalysisPane({ symbol, analysis, loading, error }: AIAnalysisPaneProps) {
  return (
    <Box
      sx={{
        width: { xs: '100%', md: 300 },
        minWidth: { md: 260 },
        maxWidth: { md: 340 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center">
        <AutoAwesomeIcon color="primary" fontSize="small" />
        <Typography variant="h6" fontWeight={700}>
          AI Analysis
        </Typography>
      </Stack>

      {symbol ? (
        <Typography variant="body2" color="text.secondary">
          {symbol}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Select a ticker to see AI advice.
        </Typography>
      )}

      <Divider />

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Error */}
      {!loading && error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      {/* Content */}
      {!loading && !error && analysis && (
        <Stack spacing={2}>
          {/* Overall verdict */}
          <Box
            sx={{
              borderRadius: 2,
              p: 2,
              bgcolor:
                analysis.overall_signal === 'BUY'
                  ? 'success.main'
                  : analysis.overall_signal === 'SELL'
                    ? 'error.main'
                    : 'warning.main',
              color: 'white',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              {signalIcon(analysis.overall_signal)}
              <Typography variant="h6" fontWeight={700}>
                {analysis.overall_signal}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.92, lineHeight: 1.4 }}>
              {analysis.overall_comment}
            </Typography>
          </Box>

          {/* Technical signals */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Technical Signals
            </Typography>
            <Stack spacing={1}>
              <SMACard data={analysis.short_term} />
              <SMACard data={analysis.long_term} />
            </Stack>
          </Box>

          {/* Document insights */}
          {analysis.document_insights.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Company Reports
              </Typography>
              {analysis.document_insights.map((doc) => (
                <DocInsightCard key={doc.filename} doc={doc} />
              ))}
            </Box>
          )}

          {analysis.document_insights.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No company documents found. Drop .txt or .pdf files into{' '}
              <code>documents/{analysis.symbol}/</code> to enable document analysis.
            </Typography>
          )}
        </Stack>
      )}

      {/* Empty state */}
      {!loading && !error && !analysis && symbol && (
        <Typography variant="body2" color="text.secondary">
          Loading analysis…
        </Typography>
      )}
    </Box>
  );
}
