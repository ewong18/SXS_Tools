import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC_DIR))

from calc_xp import ExpCalc


class ExpCalcTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with patch("calc_xp.requests.get", side_effect=OSError):
            cls.calculator = ExpCalc(1, 0, 2, 180, 1, "UTC")

    def test_uses_local_exp_table(self):
        self.assertEqual(self.calculator.calc_required_exp(), 80)

    def test_required_exp_sums_current_levels_up_to_target(self):
        calculator = ExpCalc(1, 0, 3, 180, 1, "UTC")

        self.assertEqual(calculator.calc_required_exp(), 170)

    def test_eta_before_reset_within_two_hours_is_reset(self):
        current_ts = datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc)

        eta = self.calculator.calc_eta(current_ts)

        self.assertEqual(eta, datetime(2026, 9, 19, 13, 0, tzinfo=timezone.utc))

    def test_eta_more_than_two_hours_before_reset_is_not_clamped(self):
        current_ts = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)

        eta = self.calculator.calc_eta(current_ts)

        self.assertEqual(eta, datetime(2026, 9, 19, 8, 26, 40, tzinfo=timezone.utc))

    def test_eta_after_reset_is_not_clamped(self):
        current_ts = datetime(2026, 9, 19, 14, 0, tzinfo=timezone.utc)

        eta = self.calculator.calc_eta(current_ts)

        self.assertEqual(eta, datetime(2026, 9, 19, 14, 26, 40, tzinfo=timezone.utc))

    def test_eta_crossing_reset_uses_two_hour_speedup(self):
        calculator = ExpCalc(1, 0, 2, 30, 1, "UTC")
        current_ts = datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc)

        eta = calculator.calc_eta(current_ts)

        self.assertEqual(eta, datetime(2026, 9, 19, 12, 40, tzinfo=timezone.utc))

    def test_next_reset_at_reset_time_is_tomorrow(self):
        current_ts = datetime(2026, 9, 19, 13, 0, tzinfo=timezone.utc)

        next_reset = self.calculator.get_next_reset_time(current_ts)

        self.assertEqual(next_reset, datetime(2026, 9, 20, 13, 0, tzinfo=timezone.utc))


if __name__ == "__main__":
    unittest.main()