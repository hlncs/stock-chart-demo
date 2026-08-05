# Prompt 10 - State Management
```text
Implement global state using Zustand (persisted to localStorage).

State includes
  selectedTicker     string
  selectedPeriod     string
  activeSMAs         SMAConfig[]   — id, label, enabled, color, window?
  customWindow       number
  priceData          Array<{ date, close, volume }>   ← volume required for tooltip
  movingAverageData  Record<string, Array<{ date, value }>>

Actions
  selectTicker(ticker)
  selectPeriod(period)
  toggleSMA(id, enabled)
  setColor(id, color)
  setCustomWindow(window)
  setPriceData(data)            — must include volume field
  setMovingAverageData(id, data)
  rsiConfig     RSIConfig   — period, color, obLevel, osLevel
  macdConfig    MACDConfig  — fast, slow, signal, macdColor, signalColor, histUpColor, histDownColor
  setRsiConfig(partial)
  setMacdConfig(partial)

Keep state normalized.
Avoid unnecessary rerenders.
Memoize selectors.
```
