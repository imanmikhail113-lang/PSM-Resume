# Intelligent Resume Analyzer

An AI-powered web platform designed to analyze, score, and optimize resumes to pass Applicant Tracking Systems (ATS) and human screeners. 

## Tech Stack
- **Frontend**: React (Vite) + Custom CSS (Premium UI)
- **Backend**: Python (Flask)
- **AI Modules**: 
  - PyMuPDF (PDF Extraction)
  - Scikit-learn & SpaCy (NLP / Semantic Matching / NER)
  - OpenCV & TensorFlow (Computer Vision for Visual Professionalism)
  - LLM API (Generative Feedback)

## How to Run

### Backend
1. Navigate to the backend folder: `cd backend`
2. Activate the virtual environment: `.\venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `python app.py`

### Frontend
1. Navigate to the frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Google-only sign-in

Authentication uses Google Identity Services (OpenID Connect), Google's server-side token verification, and revocable database-backed sessions in HttpOnly cookies. Email/password registration, login, email lookup, and password reset endpoints have been removed. Browser-stored user IDs do not authorize access.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen and create an OAuth **Web application** client. Add your frontend origin to **Authorized JavaScript origins** (locally `http://localhost:5173`, or `http://127.0.0.1:5173` if you use that address). Add test users if your consent screen is in testing mode.
2. Copy `backend/.env.example` to `backend/.env`. Set `GOOGLE_CLIENT_ID` to that client ID. Set a persistent random `SECRET_KEY` (required when enabling Google sign-in) (generate one with `python -c "import secrets; print(secrets.token_hex(32))"`). The Google client secret is not needed for the GIS ID-token flow and must never go in frontend variables.
3. Copy `frontend/.env.example` to `frontend/.env` if your backend runs anywhere other than `http://localhost:5000`. Set `FRONTEND_ORIGIN` on the backend to the exact frontend origin (comma-separated for multiple origins).
4. Install backend requirements and frontend packages, then start both servers using the commands above. Restart the backend after changing its environment.

Use HTTPS in production, set `COOKIE_SECURE=true`, and always set a shared persistent `SECRET_KEY` across workers. Prefer same-site frontend/API domains. If genuinely cross-site hosting is required, use `COOKIE_SAMESITE=None` with secure HTTPS cookies; browser third-party cookie restrictions can still block them. Proxy the API through the frontend origin when possible. The public config endpoint supplies the single authoritative Google client ID and a per-session CSRF token and nonce.

Existing users/resume records are preserved. New `google_identities` and `auth_sessions` tables are created by the existing database initializer. Google `sub` identifies accounts; a verified Google-authoritative Gmail/Workspace address can link an existing legacy account. Legacy accounts using third-party email addresses require deliberate administrator migration. Logout revokes the server session; expired sessions cannot access histories, scans, or uploaded photos. Serve uploaded images through Flask's protected route, never as public static hosting.

The UI uses the red/near-black/warm-white palette from [seladevs.my](https://seladevs.my). The Three.js hero loads separately, caps pixel density, pauses in hidden tabs, respects reduced motion, and disposes GPU resources when unmounted. The dashboard retains resume, career, benchmarking, and image analysis tools.

### Verification

```powershell
npm --prefix frontend run build
npm --prefix frontend run lint
backend/venv/Scripts/python.exe -m unittest discover -s backend -p test_auth.py -v
```

The auth tests use an isolated in-memory database and a mocked Google verifier to exercise rejection paths, sessions, CSRF, ownership, and logout revocation. A real Google account round trip requires your configured client ID and allowed origin. Resume analysis also requires the existing AI provider configuration.
