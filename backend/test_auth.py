"""Isolated auth regression tests; no real Google account or resume data is used."""
import os
import unittest
from unittest.mock import patch
from flask import Flask, jsonify
from auth import configure_auth
from modules.database.models import db, User, GoogleIdentity, AuthSession

class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'GOOGLE_CLIENT_ID':'test-client.apps.googleusercontent.com','SECRET_KEY':'test-secret','COOKIE_SECURE':'false'})
        self.env.start()
        self.app=Flask(__name__, static_folder=None)
        self.app.config.update(TESTING=True,SQLALCHEMY_DATABASE_URI='sqlite:///:memory:')
        db.init_app(self.app)
        configure_auth(self.app)
        self.app.add_url_rule('/api/history/<int:user_id>',endpoint='history',view_func=lambda user_id:jsonify(user_id=user_id))
        self.app.add_url_rule('/api/analyze',endpoint='analyze',view_func=lambda:jsonify(ok=True),methods=['POST'])
        self.app.add_url_rule('/static/uploads/images/<path:filename>',endpoint='image',view_func=lambda filename:jsonify(ok=True))
        self.context=self.app.app_context();self.context.push();db.create_all()
        self.client=self.app.test_client()
        self.config=self.client.get('/api/auth/config').json

    def tearDown(self):
        db.session.remove();db.drop_all();self.context.pop();self.env.stop()

    def sign_in(self, **overrides):
        claims=dict(sub='google-subject',email='test@gmail.com',email_verified=True,given_name='Test',nonce=self.config['nonce'])
        claims.update(overrides)
        with patch('auth.id_token.verify_oauth2_token',return_value=claims) as verify:
            result=self.client.post('/api/auth/google',json={'credential':'signed-token'},headers={'X-CSRF-Token':self.config['csrf_token']})
            verify.assert_called_once()
            self.assertEqual(verify.call_args.args[2],'test-client.apps.googleusercontent.com')
        return result

    def test_no_client_id_fails_closed(self):
        with patch.dict(os.environ,{'GOOGLE_CLIENT_ID':''}):
            r=self.client.post('/api/auth/google',json={'credential':'token'},headers={'X-CSRF-Token':self.config['csrf_token']})
            self.assertEqual(r.status_code,503)

    def test_forged_token_rejected_without_decode_fallback(self):
        with patch('auth.id_token.verify_oauth2_token',side_effect=ValueError('bad signature')):
            r=self.client.post('/api/auth/google',json={'credential':'e30.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIn0.fake'},headers={'X-CSRF-Token':self.config['csrf_token']})
        self.assertEqual(r.status_code,401)
        self.assertEqual(User.query.count(),0)

    def test_google_outage_does_not_authenticate(self):
        with patch('auth.id_token.verify_oauth2_token',side_effect=RuntimeError('network')):
            r=self.client.post('/api/auth/google',json={'credential':'token'},headers={'X-CSRF-Token':self.config['csrf_token']})
        self.assertEqual(r.status_code,503)
        self.assertEqual(AuthSession.query.count(),0)

    def test_nonce_required(self):
        self.assertEqual(self.sign_in(nonce='different').status_code,401)

    def test_verified_email_required(self):
        self.assertEqual(self.sign_in(email_verified=False).status_code,401)

    def test_csrf_required(self):
        self.assertEqual(self.client.post('/api/auth/google',json={'credential':'token'}).status_code,403)

    def test_anonymous_history_blocked(self):
        self.assertEqual(self.client.get('/api/history/1').status_code,401)

    def test_session_restore_and_cookie_flags(self):
        r=self.sign_in();self.assertEqual(r.status_code,200)
        self.assertIn('HttpOnly',r.headers['Set-Cookie'])
        self.assertEqual(self.client.get('/api/auth/session').json['user_id'],r.json['user_id'])

    def test_other_user_resources_blocked(self):
        r=self.sign_in();uid=r.json['user_id']
        self.assertEqual(self.client.get(f'/api/history/{uid}').status_code,200)
        self.assertEqual(self.client.get(f'/api/history/{uid+1}').status_code,403)
        headers={'X-CSRF-Token':r.json['csrf_token']}
        self.assertEqual(self.client.post('/api/analyze',json={'user_id':uid+1},headers=headers).status_code,403)
        self.assertEqual(self.client.post('/api/analyze',data={'user_id':uid+1},headers=headers).status_code,403)
        self.assertEqual(self.client.get(f'/static/uploads/images/user_{uid+1}_photo.jpg').status_code,403)
        self.assertEqual(self.client.get(f'/static/uploads/images/user_{uid}_/../user_{uid+1}_photo.jpg').status_code,403)

    def test_logout_revokes_copied_cookie(self):
        r=self.sign_in();cookie=self.client.get_cookie('session').value
        self.assertEqual(self.client.post('/api/auth/logout',headers={'X-CSRF-Token':r.json['csrf_token']}).status_code,200)
        self.client.set_cookie('session',cookie)
        self.assertEqual(self.client.get('/api/auth/session').status_code,401)
        self.assertEqual(self.client.get('/api/history/1').status_code,401)

    def test_repeat_login_uses_google_subject(self):
        first=self.sign_in().json
        self.config=self.client.get('/api/auth/config').json
        second=self.sign_in().json
        self.assertEqual(first['user_id'],second['user_id'])
        self.assertEqual(GoogleIdentity.query.count(),1)
        self.assertEqual(AuthSession.query.count(),1)

    def test_password_routes_removed(self):
        r=self.sign_in()
        for route in ('login','register','verify-email','reset-password','guest'):
            response=self.client.post('/api/auth/'+route,json={},headers={'X-CSRF-Token':r.json['csrf_token']})
            self.assertEqual(response.status_code,404)

if __name__=='__main__': unittest.main()
