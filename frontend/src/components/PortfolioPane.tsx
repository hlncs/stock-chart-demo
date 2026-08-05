import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { addTransaction, fetchPortfolio, fetchTransactions } from '../services/api';
import { AddTransactionRequest, PortfolioData, PortfolioHolding, Transaction } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usd(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProfitCell({ value, isPercent = false }: { value: number; isPercent?: boolean }) {
  const positive = value >= 0;
  const color = positive ? 'success.main' : 'error.main';
  const Icon = positive ? TrendingUpIcon : TrendingDownIcon;
  const display = isPercent
    ? `${positive ? '+' : ''}${value.toFixed(2)}%`
    : `${value < 0 ? '-' : '+'}$${Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
  return (
    <TableCell align="right" sx={{ color, fontWeight: 500 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
        <Icon fontSize="small" />
        {display}
      </Box>
    </TableCell>
  );
}

// ---------------------------------------------------------------------------
// Add Transaction Dialog
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);

interface AddTxnDialogProps {
  open: boolean;
  symbol: string;
  symbols: string[];
  maxSellShares: number;
  onClose: () => void;
  onSaved: () => void;
}

function AddTransactionDialog({
  open,
  symbol,
  symbols,
  maxSellShares,
  onClose,
  onSaved,
}: AddTxnDialogProps) {
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [date, setDate] = useState(today);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('9.95');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAction('BUY');
      setSelectedSymbol(symbol);
      setDate(today);
      setShares('');
      setPrice('');
      setCommission('9.95');
      setError(null);
    }
  }, [open, symbol]);

  const sharesNum = parseFloat(shares);
  const priceNum = parseFloat(price);
  const commNum = parseFloat(commission) || 0;
  const totalValue =
    !isNaN(sharesNum) && !isNaN(priceNum) ? sharesNum * priceNum + commNum : null;

  const isValid =
    selectedSymbol &&
    date &&
    !isNaN(sharesNum) &&
    sharesNum > 0 &&
    !isNaN(priceNum) &&
    priceNum > 0 &&
    (action === 'BUY' || sharesNum <= maxSellShares);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const req: AddTransactionRequest = {
        symbol: selectedSymbol,
        action,
        date,
        shares: sharesNum,
        price_per_share: priceNum,
        commission: commNum,
      };
      await addTransaction(req);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save transaction.';
      // Try to extract FastAPI detail message
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Transaction</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <ToggleButtonGroup
            color={action === 'BUY' ? 'success' : 'error'}
            value={action}
            exclusive
            fullWidth
            onChange={(_, v) => v && setAction(v)}
          >
            <ToggleButton value="BUY">Buy</ToggleButton>
            <ToggleButton value="SELL">Sell</ToggleButton>
          </ToggleButtonGroup>

          <FormControl fullWidth size="small">
            <InputLabel>Symbol</InputLabel>
            <Select
              value={selectedSymbol}
              label="Symbol"
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {symbols.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Date"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Number of Shares"
            type="number"
            size="small"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            inputProps={{ min: 0.001, step: 0.001 }}
            error={action === 'SELL' && !isNaN(sharesNum) && sharesNum > maxSellShares}
            helperText={
              action === 'SELL' && !isNaN(sharesNum) && sharesNum > maxSellShares
                ? `Max ${maxSellShares.toLocaleString()} shares available`
                : action === 'SELL'
                  ? `${maxSellShares.toLocaleString()} shares available`
                  : undefined
            }
            fullWidth
          />

          <TextField
            label="Price per Share"
            type="number"
            size="small"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputProps={{ min: 0.01, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth
          />

          <TextField
            label="Broker Commission"
            type="number"
            size="small"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth
          />

          {totalValue !== null && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: action === 'BUY' ? 'success.light' : 'error.light',
                borderRadius: 1,
                opacity: 0.85,
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {action === 'BUY' ? 'Total cost' : 'Gross proceeds'}:{' '}
                {usd(action === 'BUY' ? totalValue : sharesNum * priceNum - commNum)}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          variant="contained"
          color={action === 'BUY' ? 'success' : 'error'}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Transaction History Panel
// ---------------------------------------------------------------------------

interface TransactionPanelProps {
  symbol: string;
  holding: PortfolioHolding | undefined;
  symbols: string[];
  onBack: () => void;
  onTransactionAdded: () => void;
}

function TransactionPanel({
  symbol,
  holding,
  symbols,
  onBack,
  onTransactionAdded,
}: TransactionPanelProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const txns = await fetchTransactions(symbol);
      setTransactions(txns);
    } catch {
      setError('Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTransactionAdded = () => {
    void loadTransactions();
    onTransactionAdded();
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Tooltip title="Back to portfolio">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="h5">{symbol} — Transactions</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Transaction
        </Button>
      </Stack>

      {/* Current position summary */}
      {holding && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Outstanding Shares
            </Typography>
            <Typography variant="h6">{holding.shares.toLocaleString()}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Cost / Share
            </Typography>
            <Typography variant="h6">{usd(holding.avg_cost)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Current Price
            </Typography>
            <Typography variant="h6">{usd(holding.current_price)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Market Value
            </Typography>
            <Typography variant="h6">{usd(holding.market_value)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Profit / Loss
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: holding.profit_dollars >= 0 ? 'success.main' : 'error.main' }}
            >
              {holding.profit_dollars >= 0 ? '+' : ''}
              {usd(holding.profit_dollars)} ({holding.profit_percent >= 0 ? '+' : ''}
              {holding.profit_percent.toFixed(2)}%)
            </Typography>
          </Box>
        </Paper>
      )}

      <Divider sx={{ mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                <TableCell>#</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Shares</TableCell>
                <TableCell align="right">Price / Share</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell align="right">Total Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn, idx) => {
                  const isBuy = txn.action === 'BUY';
                  const totalValue = isBuy
                    ? txn.shares * txn.price_per_share + txn.commission
                    : txn.shares * txn.price_per_share - txn.commission;
                  return (
                    <TableRow key={txn.id ?? idx} hover>
                      <TableCell sx={{ color: 'text.secondary' }}>{txn.id ?? idx + 1}</TableCell>
                      <TableCell>
                        <Chip
                          label={txn.action}
                          size="small"
                          color={isBuy ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell align="right">{txn.shares.toLocaleString()}</TableCell>
                      <TableCell align="right">{usd(txn.price_per_share)}</TableCell>
                      <TableCell align="right">{usd(txn.commission)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: isBuy ? 'error.main' : 'success.main', fontWeight: 500 }}
                      >
                        {isBuy ? '-' : '+'}{usd(Math.abs(totalValue))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddTransactionDialog
        open={dialogOpen}
        symbol={symbol}
        symbols={symbols}
        maxSellShares={holding?.shares ?? 0}
        onClose={() => setDialogOpen(false)}
        onSaved={handleTransactionAdded}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Portfolio Summary Table
// ---------------------------------------------------------------------------

interface PortfolioSummaryProps {
  data: PortfolioData;
  symbols: string[];
  onSelectSymbol: (symbol: string) => void;
  onRefresh: () => void;
}

function PortfolioSummary({ data, symbols, onSelectSymbol, onRefresh }: PortfolioSummaryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const totalProfitPositive = data.total_profit_dollars >= 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Portfolio</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Transaction
        </Button>
      </Stack>
      <Divider sx={{ mb: 2 }} />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
              <TableCell>Symbol</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Avg Cost</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="right">Market Value</TableCell>
              <TableCell align="right">Profit ($)</TableCell>
              <TableCell align="right">Profit (%)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.holdings.map((h) => (
              <TableRow
                key={h.symbol}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onSelectSymbol(h.symbol)}
              >
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{h.symbol}</TableCell>
                <TableCell align="right">{h.shares.toLocaleString()}</TableCell>
                <TableCell align="right">{usd(h.avg_cost)}</TableCell>
                <TableCell align="right">{usd(h.current_price)}</TableCell>
                <TableCell align="right">{usd(h.total_cost)}</TableCell>
                <TableCell align="right">{usd(h.market_value)}</TableCell>
                <ProfitCell value={h.profit_dollars} />
                <ProfitCell value={h.profit_percent} isPercent />
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow
              sx={{
                '& td': { fontWeight: 700, fontSize: '0.875rem', borderTop: 2, borderColor: 'divider' },
              }}
            >
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell align="right">{usd(data.total_cost)}</TableCell>
              <TableCell align="right">{usd(data.total_market_value)}</TableCell>
              <TableCell
                align="right"
                sx={{ color: totalProfitPositive ? 'success.main' : 'error.main' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                  {totalProfitPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                  {`${data.total_profit_dollars < 0 ? '-' : '+'}$${Math.abs(data.total_profit_dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </Box>
              </TableCell>
              <TableCell
                align="right"
                sx={{ color: totalProfitPositive ? 'success.main' : 'error.main' }}
              >
                {`${data.total_profit_percent >= 0 ? '+' : ''}${data.total_profit_percent.toFixed(2)}%`}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Click a row to view transactions for that symbol.
      </Typography>

      <AddTransactionDialog
        open={dialogOpen}
        symbol={symbols[0] ?? ''}
        symbols={symbols}
        maxSellShares={0}
        onClose={() => setDialogOpen(false)}
        onSaved={onRefresh}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// PortfolioPane — root component
// ---------------------------------------------------------------------------

export function PortfolioPane({ symbols }: { symbols: string[] }) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const loadPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPortfolio();
      setData(result);
    } catch {
      setError('Unable to load portfolio data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPortfolio();
  }, []);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  if (selectedSymbol) {
    const holding = data.holdings.find((h) => h.symbol === selectedSymbol);
    return (
      <TransactionPanel
        symbol={selectedSymbol}
        holding={holding}
        symbols={symbols}
        onBack={() => setSelectedSymbol(null)}
        onTransactionAdded={loadPortfolio}
      />
    );
  }

  return (
    <PortfolioSummary
      data={data}
      symbols={symbols}
      onSelectSymbol={setSelectedSymbol}
      onRefresh={loadPortfolio}
    />
  );
}
