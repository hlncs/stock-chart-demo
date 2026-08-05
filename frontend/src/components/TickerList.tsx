import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { addSymbol, deleteSymbol } from '../services/api';

const PERIODS = [
  { value: 'max', label: 'Max history' },
  { value: '5y',  label: '5 years' },
  { value: '3y',  label: '3 years' },
  { value: '2y',  label: '2 years' },
  { value: '1y',  label: '1 year' },
];

interface TickerListProps {
  symbols: string[];
  selectedTicker: string;
  showPortfolio: boolean;
  onSelectTicker: (symbol: string) => void;
  onTogglePortfolio: () => void;
  onSymbolsChanged: () => void;
}

export function TickerList({
  symbols,
  selectedTicker,
  showPortfolio,
  onSelectTicker,
  onTogglePortfolio,
  onSymbolsChanged,
}: TickerListProps) {
  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [period, setPeriod] = useState('max');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Add symbol
  // -----------------------------------------------------------------------

  function openAdd() {
    setNewSymbol('');
    setPeriod('max');
    setAddError(null);
    setAddSuccess(null);
    setAddOpen(true);
  }

  async function handleAdd() {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const result = await addSymbol(sym, period);
      setAddSuccess(`${result.symbol} added — ${result.rows_loaded.toLocaleString()} rows loaded.`);
      onSymbolsChanged();
      // Keep dialog open briefly so user sees the success message
      setTimeout(() => setAddOpen(false), 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setAddError(axiosErr?.response?.data?.detail ?? 'Failed to add symbol.');
    } finally {
      setAdding(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete symbol
  // -----------------------------------------------------------------------

  function openDelete(symbol: string, e: React.MouseEvent) {
    e.stopPropagation(); // don't also select the ticker
    setDeleteTarget(symbol);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSymbol(deleteTarget);
      onSymbolsChanged();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setDeleteError(axiosErr?.response?.data?.detail ?? 'Failed to delete symbol.');
    } finally {
      setDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box sx={{ width: { xs: '100%', md: '16%' }, maxHeight: 600, overflow: 'auto' }}>
      {/* Header row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="h6">Ticker List</Typography>
        <Typography
          component="button"
          onClick={onTogglePortfolio}
          sx={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: showPortfolio ? 'primary.main' : 'text.secondary',
            fontWeight: showPortfolio ? 700 : 400,
            fontSize: '0.8rem',
            textDecoration: showPortfolio ? 'underline' : 'none',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
            p: 0,
          }}
        >
          Portfolio
        </Typography>
      </Stack>

      {/* Ticker list */}
      <List dense disablePadding>
        {symbols.map((symbol) => (
          <ListItemButton
            key={symbol}
            selected={symbol === selectedTicker && !showPortfolio}
            onClick={() => onSelectTicker(symbol)}
            sx={{ pr: 5 }} // room for the delete icon
          >
            <ListItemText primary={symbol} />
            <ListItemSecondaryAction>
              <Tooltip title={`Remove ${symbol}`}>
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => openDelete(symbol, e)}
                  sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItemButton>
        ))}
      </List>

      {/* Add button */}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={openAdd}
        sx={{ mt: 1, width: '100%' }}
        variant="outlined"
      >
        Add Symbol
      </Button>

      {/* ---------------------------------------------------------------- */}
      {/* Add symbol dialog                                                 */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={addOpen} onClose={() => !adding && setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Symbol</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            {addSuccess && <Alert severity="success">{addSuccess}</Alert>}

            <TextField
              label="Ticker symbol"
              size="small"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. TSLA"
              inputProps={{ maxLength: 10 }}
              autoFocus
              fullWidth
              disabled={adding}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>History to load</InputLabel>
              <Select
                value={period}
                label="History to load"
                onChange={(e) => setPeriod(e.target.value)}
                disabled={adding}
              >
                {PERIODS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={adding}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!newSymbol.trim() || adding}
            startIcon={adding ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {adding ? 'Loading…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Confirm delete dialog                                             */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Remove {deleteTarget}?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            This will delete the local price data for <strong>{deleteTarget}</strong>. You can
            re-add it at any time. Any portfolio transactions for this symbol will be kept.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />}
          >
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
