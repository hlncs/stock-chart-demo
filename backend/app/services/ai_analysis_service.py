"""AI analysis service.

Provides trading advice based on:
  - Short-term signal: SMA 50 crosses above SMA 20  → BUY (short-term)
  - Long-term signal : custom SMA (≥150) crosses above SMA 50 → BUY (long-term)
  - Document agent  : reads text/PDF files from a per-symbol folder and
                      surfaces relevant profit/loss insights.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import pandas as pd

from app.services.moving_average_service import MovingAverageService

# Folder that contains company report documents.
# Each sub-folder is named after the ticker symbol, e.g.  documents/AAPL/
DOCUMENTS_ROOT = Path(__file__).resolve().parents[3] / "documents"

SignalType = Literal["BUY", "SELL", "HOLD"]


@dataclass
class SMASignal:
    timeframe: str          # "Short-term" | "Long-term"
    signal: SignalType
    fast_sma: float | None  # most-recent fast SMA value
    slow_sma: float | None  # most-recent slow SMA value
    comment: str


@dataclass
class DocumentInsight:
    filename: str
    snippet: str            # first meaningful excerpt
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]


@dataclass
class AIAnalysisResult:
    symbol: str
    overall_signal: SignalType
    overall_comment: str
    short_term: SMASignal
    long_term: SMASignal
    document_insights: list[DocumentInsight] = field(default_factory=list)


class AIAnalysisService:
    def __init__(self) -> None:
        self._ma_service = MovingAverageService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyse(
        self,
        symbol: str,
        frame: pd.DataFrame,
        custom_window: int = 150,
    ) -> AIAnalysisResult:
        """Return a full AI analysis for *symbol* given its price *frame*."""
        short_signal = self._short_term_signal(frame)
        long_signal = self._long_term_signal(frame, custom_window)
        doc_insights = self._read_documents(symbol)
        overall, overall_comment = self._aggregate(
            short_signal, long_signal, doc_insights
        )
        return AIAnalysisResult(
            symbol=symbol,
            overall_signal=overall,
            overall_comment=overall_comment,
            short_term=short_signal,
            long_term=long_signal,
            document_insights=doc_insights,
        )

    # ------------------------------------------------------------------
    # SMA signals
    # ------------------------------------------------------------------

    def _get_sma_series(self, frame: pd.DataFrame, window: int) -> pd.Series:
        """Return a close-price rolling SMA series aligned by date."""
        sma_df = self._ma_service.calculate(frame, window=window)
        return sma_df.set_index("date")["value"]

    def _short_term_signal(self, frame: pd.DataFrame) -> SMASignal:
        """SMA50 crosses above SMA20 → BUY; opposite → SELL; else HOLD."""
        try:
            sma20 = self._get_sma_series(frame, 20)
            sma50 = self._get_sma_series(frame, 50)
        except (ValueError, KeyError):
            return SMASignal(
                timeframe="Short-term",
                signal="HOLD",
                fast_sma=None,
                slow_sma=None,
                comment="Insufficient data to compute SMA 20 / SMA 50.",
            )

        common = sma20.index.intersection(sma50.index)
        if len(common) < 2:
            return SMASignal(
                timeframe="Short-term",
                signal="HOLD",
                fast_sma=None,
                slow_sma=None,
                comment="Not enough overlapping SMA data points.",
            )

        sma20_aligned = sma20.loc[common]
        sma50_aligned = sma50.loc[common]

        latest_20 = float(sma20_aligned.iloc[-1])
        latest_50 = float(sma50_aligned.iloc[-1])
        prev_20 = float(sma20_aligned.iloc[-2])
        prev_50 = float(sma50_aligned.iloc[-2])

        # Golden cross: SMA50 just crossed above SMA20 (bullish for short-term)
        if prev_50 <= prev_20 and latest_50 > latest_20:
            signal: SignalType = "BUY"
            comment = (
                f"SMA 50 ({latest_50:.2f}) crossed above SMA 20 ({latest_20:.2f}) — "
                "short-term bullish crossover detected."
            )
        # Death cross: SMA50 just crossed below SMA20 (bearish)
        elif prev_50 >= prev_20 and latest_50 < latest_20:
            signal = "SELL"
            comment = (
                f"SMA 50 ({latest_50:.2f}) crossed below SMA 20 ({latest_20:.2f}) — "
                "short-term bearish crossover detected."
            )
        elif latest_50 > latest_20:
            signal = "BUY"
            comment = (
                f"SMA 50 ({latest_50:.2f}) is above SMA 20 ({latest_20:.2f}) — "
                "short-term uptrend in place."
            )
        elif latest_50 < latest_20:
            signal = "SELL"
            comment = (
                f"SMA 50 ({latest_50:.2f}) is below SMA 20 ({latest_20:.2f}) — "
                "short-term downtrend in place."
            )
        else:
            signal = "HOLD"
            comment = "SMA 50 and SMA 20 are equal — no clear short-term direction."

        return SMASignal(
            timeframe="Short-term",
            signal=signal,
            fast_sma=latest_20,
            slow_sma=latest_50,
            comment=comment,
        )

    def _long_term_signal(self, frame: pd.DataFrame, custom_window: int) -> SMASignal:
        """Custom SMA (≥150) crosses above SMA50 → BUY; else SELL/HOLD."""
        effective_window = max(custom_window, 150)

        try:
            sma50 = self._get_sma_series(frame, 50)
            sma_custom = self._get_sma_series(frame, effective_window)
        except (ValueError, KeyError):
            return SMASignal(
                timeframe="Long-term",
                signal="HOLD",
                fast_sma=None,
                slow_sma=None,
                comment=f"Insufficient data to compute SMA {effective_window} / SMA 50.",
            )

        common = sma50.index.intersection(sma_custom.index)
        if len(common) < 2:
            return SMASignal(
                timeframe="Long-term",
                signal="HOLD",
                fast_sma=None,
                slow_sma=None,
                comment="Not enough data for long-term SMA comparison.",
            )

        sma50_aligned = sma50.loc[common]
        sma_custom_aligned = sma_custom.loc[common]

        latest_50 = float(sma50_aligned.iloc[-1])
        latest_custom = float(sma_custom_aligned.iloc[-1])
        prev_50 = float(sma50_aligned.iloc[-2])
        prev_custom = float(sma_custom_aligned.iloc[-2])

        # Custom SMA crosses above SMA50 → long-term bullish
        if prev_custom <= prev_50 and latest_custom > latest_50:
            signal: SignalType = "BUY"
            comment = (
                f"SMA {effective_window} ({latest_custom:.2f}) crossed above SMA 50 ({latest_50:.2f}) — "
                "long-term bullish signal."
            )
        elif prev_custom >= prev_50 and latest_custom < latest_50:
            signal = "SELL"
            comment = (
                f"SMA {effective_window} ({latest_custom:.2f}) crossed below SMA 50 ({latest_50:.2f}) — "
                "long-term bearish signal."
            )
        elif latest_custom > latest_50:
            signal = "BUY"
            comment = (
                f"SMA {effective_window} ({latest_custom:.2f}) remains above SMA 50 ({latest_50:.2f}) — "
                "long-term uptrend sustained."
            )
        elif latest_custom < latest_50:
            signal = "SELL"
            comment = (
                f"SMA {effective_window} ({latest_custom:.2f}) is below SMA 50 ({latest_50:.2f}) — "
                "long-term downtrend in place."
            )
        else:
            signal = "HOLD"
            comment = f"SMA {effective_window} and SMA 50 are equal — no clear long-term direction."

        return SMASignal(
            timeframe="Long-term",
            signal=signal,
            fast_sma=latest_50,
            slow_sma=latest_custom,
            comment=comment,
        )

    # ------------------------------------------------------------------
    # Document agent
    # ------------------------------------------------------------------

    def _read_documents(self, symbol: str) -> list[DocumentInsight]:
        """Read .txt / .md / .pdf (text fallback) files from documents/<symbol>/."""
        folder = DOCUMENTS_ROOT / symbol.upper()
        if not folder.exists():
            return []

        insights: list[DocumentInsight] = []
        for path in sorted(folder.iterdir()):
            if path.suffix.lower() not in {".txt", ".md", ".pdf"}:
                continue
            try:
                text = self._extract_text(path)
                if not text.strip():
                    continue
                snippet = self._extract_snippet(text)
                sentiment = self._classify_sentiment(text)
                insights.append(
                    DocumentInsight(
                        filename=path.name,
                        snippet=snippet,
                        sentiment=sentiment,
                    )
                )
            except Exception:  # noqa: BLE001 — surface a partial result instead of crashing
                insights.append(
                    DocumentInsight(
                        filename=path.name,
                        snippet="Unable to read document.",
                        sentiment="NEUTRAL",
                    )
                )

        return insights

    def _extract_text(self, path: Path) -> str:
        if path.suffix.lower() == ".pdf":
            return self._extract_pdf_text(path)
        return path.read_text(encoding="utf-8", errors="replace")

    @staticmethod
    def _extract_pdf_text(path: Path) -> str:
        """Best-effort PDF text extraction without requiring a hard dependency."""
        try:
            import pypdf  # optional dependency

            reader = pypdf.PdfReader(str(path))
            return "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        except ImportError:
            pass
        try:
            import pdfminer.high_level as pdfminer  # type: ignore

            return pdfminer.extract_text(str(path))
        except ImportError:
            return ""

    @staticmethod
    def _extract_snippet(text: str, max_chars: int = 300) -> str:
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        combined = " ".join(lines)
        return combined[:max_chars] + ("…" if len(combined) > max_chars else "")

    @staticmethod
    def _classify_sentiment(text: str) -> Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]:
        """Lightweight keyword-based sentiment for the document summary."""
        text_lower = text.lower()
        positive_keywords = {
            "profit", "revenue growth", "beat expectations", "strong earnings",
            "record revenue", "increased dividend", "expansion", "acquisition",
            "market share", "positive outlook", "raised guidance", "buyback",
            "outperform", "upgrade",
        }
        negative_keywords = {
            "loss", "decline", "missed", "below expectations", "downgrade",
            "layoffs", "restructuring", "write-down", "impairment", "lawsuit",
            "investigation", "revenue decline", "lowered guidance", "bearish",
            "default", "debt", "recall",
        }

        pos_hits = sum(1 for kw in positive_keywords if kw in text_lower)
        neg_hits = sum(1 for kw in negative_keywords if kw in text_lower)

        if pos_hits > neg_hits:
            return "POSITIVE"
        if neg_hits > pos_hits:
            return "NEGATIVE"
        return "NEUTRAL"

    # ------------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------------

    def _aggregate(
        self,
        short: SMASignal,
        long: SMASignal,
        docs: list[DocumentInsight],
    ) -> tuple[SignalType, str]:
        """Combine signals into a single overall recommendation."""
        score = 0
        if short.signal == "BUY":
            score += 1
        elif short.signal == "SELL":
            score -= 1

        if long.signal == "BUY":
            score += 1
        elif long.signal == "SELL":
            score -= 1

        for doc in docs:
            if doc.sentiment == "POSITIVE":
                score += 1
            elif doc.sentiment == "NEGATIVE":
                score -= 1

        if score > 0:
            overall: SignalType = "BUY"
            comment = "Overall bullish: technical signals and/or document analysis favour buying."
        elif score < 0:
            overall = "SELL"
            comment = "Overall bearish: technical signals and/or document analysis suggest selling."
        else:
            overall = "HOLD"
            comment = "Mixed signals — holding the current position is advisable."

        return overall, comment
