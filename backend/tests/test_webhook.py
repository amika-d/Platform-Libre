import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

# IMPORTANT: Adjust this import to match your actual app structure.
# If your FastAPI instance and update_reply are in 'main.py', leave as is.
from src.main import app 

class TestEmailReplyWebhook(unittest.TestCase):

    def setUp(self):
        # Initialize the FastAPI TestClient
        self.client = TestClient(app)
        
        # Define the path to the function we want to mock
        self.mock_update_path = "src.routes.webhooks.update_reply"

    @patch("src.routes.webhooks.update_reply", new_callable=AsyncMock)
    def test_email_reply_success_with_uuid(self, mock_update_reply):
        """
        Test that a valid UUID tracking_id successfully calls the database update.
        Assumes the `int()` cast has been removed from the route.
        """
        payload = {
            "tracking_id": "b095af98-f509-45a3-9765-f15b97920efc",
            "from_email": "neo.techagent47@gmail.com",
            "subject": "Re: Bitz and Beyond",
            "to_email": "outreach@bitzandbeyond.com",
            "body": "This is a test reply."
        }

        response = self.client.post("/webhooks/email-reply", json=payload)
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True})
        
        # Verify the database function received the correct string UUID
        mock_update_reply.assert_called_once_with(
            tracking_id="b095af98-f509-45a3-9765-f15b97920efc",
            body="This is a test reply.",
            subject="Re: Bitz and Beyond"
        )

    def test_email_reply_missing_tracking_id(self):
        """
        Test that a payload with an empty or missing tracking_id is safely skipped.
        """
        payload = {
            "tracking_id": "",
            "from_email": "amika.g.d@gmail.com",
            "to_email": "outreach@bitzandbeyond.com",
            "subject": "Missing ID",
            "body": "No tracking ID here."
        }

        response = self.client.post("/webhooks/email-reply", json=payload)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "skipped": True})

    @patch("src.routes.webhooks.update_reply", new_callable=AsyncMock)
    def test_email_reply_db_failure(self, mock_update_reply):
        """
        Test that exceptions during the database update are caught and handled gracefully.
        """
        # Force the mock to raise an exception when called
        mock_update_reply.side_effect = Exception("Database connection lost")

        payload = {
            "tracking_id": "043ce084-231d-49b5-84a4-d9695ea959b8",
            "from_email": "amika.g.d@gmail.com",
            "to_email": "outreach@bitzandbeyond.com",
            "subject": "Failure Test",
            "body": "Testing exception handling."
        }

        response = self.client.post("/webhooks/email-reply", json=payload)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": False, "error": "Database update failed"})

if __name__ == '__main__':
    unittest.main()