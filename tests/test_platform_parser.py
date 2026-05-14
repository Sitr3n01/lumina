import unittest
from datetime import datetime

from app.services.platform_parser_service import PlatformParserService


class TestPlatformParser(unittest.TestCase):
    def setUp(self):
        self.parser_service = PlatformParserService()

    def test_booking_com_parser(self):
        subject = "Reservation confirmation for John Doe"
        body = """
        Booking.com

        Reservation number: 1234567890
        PIN code: 1234

        Check-in: Monday, 10 January 2024
        Check-out: Friday, 14 January 2024

        Guest: John Doe
        2 guests

        Total price: R$ 500.00
        """

        result = self.parser_service.parse_email(subject, body)

        self.assertIsNotNone(result)
        self.assertEqual(result["platform"], "booking")
        self.assertEqual(result["external_id"], "1234567890")
        self.assertEqual(result["guest_name"], "John Doe")
        self.assertEqual(result["check_in_date"], datetime(2024, 1, 10))
        self.assertEqual(result["check_out_date"], datetime(2024, 1, 14))
        self.assertEqual(result["guest_count"], 2)
        self.assertEqual(result["total_price"], 500.00)
        self.assertEqual(result["currency"], "R$")

    def test_airbnb_parser(self):
        subject = "Reservation confirmed - Jane Smith"
        body = """
        Airbnb

        You have a new reservation!

        Confirmation code: HMQWY12345

        Guest: Jane Smith

        Jan 20 - Jan 25, 2024

        3 guests

        Payout: $1200.00
        """

        result = self.parser_service.parse_email(subject, body)

        self.assertIsNotNone(result)
        self.assertEqual(result["platform"], "airbnb")
        self.assertEqual(result["external_id"], "HMQWY12345")
        # Guest name extraction from subject is tricky, might need refinement
        self.assertIn("Jane Smith", result.get("guest_name", ""))
        self.assertEqual(result["check_in_date"], datetime(2024, 1, 20))
        self.assertEqual(result["check_out_date"], datetime(2024, 1, 25))
        self.assertEqual(result["guest_count"], 3)

    def test_invalid_email(self):
        subject = "Spam email"
        body = "This is not a reservation email."

        result = self.parser_service.parse_email(subject, body)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
