"""Google-only identity and cookie session boundary for every private endpoint."""
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, session
from google.oauth2 import id_token
from google.auth.transport.requests import Request
from sqlalchemy.exc import IntegrityError
from modules.database.models import db, User, GoogleIdentity, AuthSession

auth = Blueprint('auth', __name__)


def profile(user):
    return dict(user_id=user.id, email=user.email, username=user.username)


def session_record():
    token = session.get('sid')
    if not token:
        return None
    record = db.session.get(AuthSession, hashlib.sha256(token.encode()).hexdigest())
    return record if record and record.expires_at > datetime.utcnow() else None


def configure_auth(app):
    secret = os.environ.get('SECRET_KEY')
    if os.environ.get('GOOGLE_CLIENT_ID') and not secret:
        raise RuntimeError('Set a persistent SECRET_KEY before enabling Google sign-in.')
    app.secret_key = secret or secrets.token_hex(32)
    app.config.update(SESSION_COOKIE_HTTPONLY=True,
                      SESSION_COOKIE_SECURE=os.environ.get('COOKIE_SECURE', 'false').lower() == 'true',
                      SESSION_COOKIE_SAMESITE=os.environ.get('COOKIE_SAMESITE', 'Lax'),
                      PERMANENT_SESSION_LIFETIME=timedelta(days=7))
    app.register_blueprint(auth)

    @app.after_request
    def private_cache_policy(response):
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.before_request
    def protect_requests():
        if request.method == 'OPTIONS':
            return None
        if request.method not in ('GET', 'HEAD'):
            supplied = request.headers.get('X-CSRF-Token', '')
            expected = session.get('csrf', '')
            if not expected or not secrets.compare_digest(supplied.encode(), expected.encode()):
                return jsonify(message='Session expired. Refresh and try again.'), 403
        public = ('/', '/api/health', '/api/auth/config', '/api/auth/google', '/api/auth/session')
        if request.path in public:
            return None
        record = session_record()
        uid = record.user_id if record else None
        if not uid:
            return jsonify(message='Sign in with Google to continue.'), 401
        # Legacy route signatures remain compatible, but never authorize a caller ID.
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return jsonify(message='Expected a JSON object.'), 400
        ids = [(request.view_args or {}).get('user_id'), request.form.get('user_id'), payload.get('user_id')]
        if any(value is not None and str(value) != str(uid) for value in ids):
            return jsonify(message='Access denied.'), 403
        if request.path.startswith('/static/uploads/images/'):
            filename = (request.view_args or {}).get('filename', '')
            if '/' in filename or '\\' in filename or not filename.startswith(f'user_{uid}_'):
                return jsonify(message='Access denied.'), 403


@auth.get('/api/auth/config')
def config():
    session.setdefault('csrf', secrets.token_urlsafe(32))
    session['nonce'] = secrets.token_urlsafe(32)
    return jsonify(client_id=os.environ.get('GOOGLE_CLIENT_ID', ''),
                   csrf_token=session['csrf'], nonce=session['nonce'])


@auth.post('/api/auth/google')
def google_login():
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not client_id:
        return jsonify(message='Google sign-in is not configured yet.'), 503
    payload = request.get_json(silent=True) or {}
    credential = payload.get('credential') if isinstance(payload, dict) else None
    if not isinstance(credential, str) or not credential:
        return jsonify(message='A Google credential is required.'), 400
    try:
        claims = id_token.verify_oauth2_token(credential, Request(), client_id)
        nonce = session.pop('nonce', None)
        if not nonce or claims.get('nonce') != nonce:
            raise ValueError('Invalid nonce')
        if not claims.get('sub') or claims.get('email_verified') is not True or not claims.get('email'):
            raise ValueError('Unverified identity')
    except ValueError:
        return jsonify(message='Google verification failed. Refresh and sign in again.'), 401
    except Exception:
        return jsonify(message='Google is temporarily unavailable. Please try again.'), 503
    identity = db.session.get(GoogleIdentity, claims['sub'])
    if identity:
        user = db.session.get(User, identity.user_id)
    else:
        email = claims['email'].strip().lower()
        # Only Google-authoritative addresses may claim a pre-existing email account.
        user = User.query.filter_by(email=email).first()
        if user and not (email.endswith('@gmail.com') or claims.get('hd')):
            return jsonify(message='This legacy account requires administrator migration.'), 409
        if user and GoogleIdentity.query.filter_by(user_id=user.id).first():
            return jsonify(message='This account is linked to a different Google identity.'), 409
        if not user:
            user = User(email=email, username=f"{claims.get('given_name', 'Member')[:50]}-{secrets.token_hex(5)}",
                        password_hash='!google-only')
            db.session.add(user)
            db.session.flush()
        db.session.add(GoogleIdentity(subject=claims['sub'], user_id=user.id))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify(message='Please try signing in again.'), 409
    previous = session_record()
    if previous:
        db.session.delete(previous)
    token = secrets.token_urlsafe(32)
    db.session.add(AuthSession(token_hash=hashlib.sha256(token.encode()).hexdigest(),
                              user_id=user.id, expires_at=datetime.utcnow() + timedelta(days=7)))
    db.session.commit()
    session.clear()
    session.permanent = True
    session['sid'] = token
    session['csrf'] = secrets.token_urlsafe(32)
    return jsonify(**profile(user), csrf_token=session['csrf'])


@auth.get('/api/auth/session')
def current_session():
    record = session_record()
    user = db.session.get(User, record.user_id) if record else None
    if not user:
        return jsonify(message='Not signed in.'), 401
    return jsonify(**profile(user), csrf_token=session['csrf'])


@auth.post('/api/auth/logout')
def logout():
    record = session_record()
    if record:
        db.session.delete(record)
        db.session.commit()
    session.clear()
    return jsonify(status='success')
