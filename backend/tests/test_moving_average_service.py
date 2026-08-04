import pandas as pd

from app.services.moving_average_service import MovingAverageService


def build_frame(values):
    return pd.DataFrame(
        {
            "date": pd.date_range("2024-01-01", periods=len(values), freq="D"),
            "close": values,
        }
    )


def test_calculates_multiple_window_sizes():
    service = MovingAverageService()
    frame = build_frame([10, 12, 14, 16, 18, 20])

    result = service.calculate(frame, window=3)

    assert len(result) == 4
    assert result["value"].tolist() == [12.0, 14.0, 16.0, 18.0]


def test_returns_empty_for_empty_dataset():
    service = MovingAverageService()
    frame = pd.DataFrame(columns=["date", "close"])

    result = service.calculate(frame, window=3)

    assert result.empty


def test_returns_empty_when_history_is_insufficient():
    service = MovingAverageService()
    frame = build_frame([10, 12, 14])

    result = service.calculate(frame, window=4)

    assert result.empty
