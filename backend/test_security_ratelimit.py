import unittest
import os
import re
from unittest.mock import patch
from flask import Flask, jsonify
from rate_limiter import limiter, rate_limit, get_client_ip
from app import sanitize_error_message
from auth import configure_auth
from modules.database.models import db, User, AuthSession

class SecurityAndRateLimitingTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            'GOOGLE_CLIENT_ID': 'test-client.apps.googleusercontent.com',
            'SECRET_KEY': 'test-secret',
            'COOKIE_SECURE': 'false',
            'LOGIN_RATE_LIMIT': '3',
            'LOGIN_RATE_WINDOW': '60'
        })
        self.env.start()
        limiter.reset()

        self.app = Flask(__name__, static_folder=None)
        self.app.config.update(
            TESTING=True,
            RATELIMIT_ENABLED=True,  # Explicitly test rate limiting
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:'
        )
        db.init_app(self.app)
        configure_auth(self.app)

        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.config = self.client.get('/api/auth/config').json

    def tearDown(self):
        limiter.reset()
        db.session.remove()
        db.drop_all()
        self.context.pop()
        self.env.stop()

    def test_api_key_and_password_sanitization(self):
        """Verify that Gemini API keys and DB passwords are redacted from errors."""
        raw_key = "AIzaSyDR8r7LIIkqUMDYLvpp2wPe5Pa5CI3u3yo"
        error_with_key = f"Google API error at https://generativelanguage.googleapis.com?key={raw_key}"
        sanitized = sanitize_error_message(error_with_key)
        self.assertNotIn(raw_key, sanitized)
        self.assertIn('[REDACTED_API_KEY]', sanitized)

        db_uri_error = "Could not connect to postgresql://postgres.user:SecretPassword123@db.supabase.com:5432/postgres"
        sanitized_db = sanitize_error_message(db_uri_error)
        self.assertNotIn("SecretPassword123", sanitized_db)
        self.assertIn("****", sanitized_db)

    def test_login_rate_limiting_blocks_spam(self):
        """Verify that more than 3 login attempts within 60s return HTTP 429."""
        claims = dict(
            sub='google-subject-ratelimit',
            email='user@gmail.com',
            email_verified=True,
            given_name='RateLimitUser',
            nonce=self.config['nonce']
        )
        
        # Attempt 1
        with patch('auth.id_token.verify_oauth2_token', return_value=claims):
            r1 = self.client.post('/api/auth/google', json={'credential': 't1'}, headers={'X-CSRF-Token': self.config['csrf_token']})
            self.assertEqual(r1.status_code, 200)

        # Attempt 2
        cfg2 = self.client.get('/api/auth/config').json
        claims['nonce'] = cfg2['nonce']
        with patch('auth.id_token.verify_oauth2_token', return_value=claims):
            r2 = self.client.post('/api/auth/google', json={'credential': 't2'}, headers={'X-CSRF-Token': cfg2['csrf_token']})
            self.assertEqual(r2.status_code, 200)

        # Attempt 3
        cfg3 = self.client.get('/api/auth/config').json
        claims['nonce'] = cfg3['nonce']
        with patch('auth.id_token.verify_oauth2_token', return_value=claims):
            r3 = self.client.post('/api/auth/google', json={'credential': 't3'}, headers={'X-CSRF-Token': cfg3['csrf_token']})
            self.assertEqual(r3.status_code, 200)

        # Attempt 4: Should be RATE LIMITED (HTTP 429)
        cfg4 = self.client.get('/api/auth/config').json
        claims['nonce'] = cfg4['nonce']
        with patch('auth.id_token.verify_oauth2_token', return_value=claims):
            r4 = self.client.post('/api/auth/google', json={'credential': 't4'}, headers={'X-CSRF-Token': cfg4['csrf_token']})
            self.assertEqual(r4.status_code, 429)
            self.assertEqual(r4.json.get('status'), 'rate_limited')
            self.assertIn('Retry-After', r4.headers)
            self.assertIn('Too many login attempts', r4.json.get('message'))

if __name__ == '__main__':
    unittest.main()
