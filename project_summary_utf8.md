# Intelligent Resume Analyzer - Complete Project Specification & Technical Report

This document compiles the complete architectural, database, backend, frontend, and AI integration details for the **Intelligent Resume Analyzer** (PSM Project). It is structured so that any AI model can immediately understand the project and write a comprehensive, highly accurate, and non-misleading report or documentation.

---

## 1. Executive Project Summary

### Core Objective
The **Intelligent Resume Analyzer** is an AI-powered web platform designed for IT students and professionals to analyze, score, and optimize their resumes to pass modern Applicant Tracking Systems (ATS) and satisfy human recruiters. 

### Key Features
1. **General Resume Analysis**: Parses PDF resumes, extracts text, performs structured parsing via Generative AI, and generates an overall ATS compatibility score.
2. **Multi-Column Coordinate Parsing**: Robust PDF parsing handling complex multi-column layouts by grouping and sorting text blocks horizontally and vertically.
3. **Targeted Scan**: Scores a resume's compatibility against a user-provided specific job title and job description, highlighting matched skills, missing critical keywords, and recommendations.
4. **Discovery Scan**: Scans the resume and automatically matches it against a database of 25 standard IT jobs to find the top 3 career paths with matched keywords and remaining skill gaps.
5. **Industry Benchmarking**: Compares the resume score against the standard industry benchmark (typically 70%+) to warn users if their resume is likely to be rejected.
6. **Formal Profile Image Checker**: Uses Multimodal Gemini Vision to evaluate user headshots against 9 professional corporate standards (attire, gaze, lighting, background, crop, resolution, etc.) and provides actionable tips.

---

## 2. Technical Stack

### Backend
* **Language & Framework**: Python 3 (Flask)
* **Database & ORM**: MySQL database connected via Flask-SQLAlchemy and PyMySQL.
* **AI & NLP Stack**:
  * `PyMuPDF` (`fitz`): Coordinate-based PDF text extraction.
  * `google-genai`: Google's latest Generative AI SDK using the `gemini-2.5-flash` model for structured JSON schema extraction.
  * `pydantic`: For defining strict response data schemas sent to Gemini.
  * `scikit-learn` & `spacy`: Reserved/listed for advanced local NLP and semantic similarity pipelines.
  * `opencv-python`: Image upload handling and processing utilities.
* **Environment Management**: `python-dotenv` for database URIs, API keys, and configurations.

### Frontend
* **Core & Build Tool**: React 19 (Vite)
* **Styling**: Modern, premium custom CSS (using dark mode, glassmorphism, floating shapes, and gradient animations).
* **Data Visualization**: `chart.js` & `react-chartjs-2` for historical improvement line charts, benchmarking bar charts, and semantic category breakdown doughnut charts.
* **State Management**: React State (`useState`, `useEffect`) persisting authentication token details and career preferences in LocalStorage.

---

## 3. Database Schema

The database model is defined in `backend/modules/database/models.py`. It comprises 5 relational tables:

```mermaid
erDiagram
    users ||--o{ resume_analyses : "has multiple"
    users ||--o{ targeted_scans : "has multiple"
    users ||--o{ user_images : "has multiple"
    users ||--o{ discovery_scans : "has multiple"

    users {
        int id PK
        string username UNIQUE "nullable"
        string email UNIQUE
        string password_hash
        datetime created_at
    }

    resume_analyses {
        int id PK
        int user_id FK
        string filename
        longtext raw_text
        json parsed_data
        string parsed_method
        int ats_score "nullable"
        datetime created_at
    }

    targeted_scans {
        int id PK
        int user_id FK
        string job_title
        text job_description
        int compatibility_score
        json feedback_data
        datetime created_at
    }

    user_images {
        int id PK
        int user_id FK
        string filename
        string image_path
        int score
        text reasoning
        json feedback_data
        datetime created_at
    }

    it_jobs {
        int id PK
        string job_title UNIQUE
        text job_description
        json keywords
    }

    discovery_scans {
        int id PK
        int user_id FK
        json results_data
        datetime created_at
    }
```

### Table Definitions & Attributes

1. **`User` (Table: `users`)**
   * Represents the registered user.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `username` (String(80), Unique, Nullable)
     * `email` (String(120), Unique, Non-nullable)
     * `password_hash` (String(255), Non-nullable)
     * `created_at` (DateTime, Default: current UTC)

2. **`ResumeAnalysis` (Table: `resume_analyses`)**
   * Stores the general parsing and scoring results of uploaded PDF resumes.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `user_id` (Integer, Foreign Key to `users.id`)
     * `filename` (String(255))
     * `raw_text` (LongText)
     * `parsed_data` (JSON) - Stores parsed resume sections: Summary, Education, Work Experience, Skills, Projects, Certifications, Languages, Keywords, Missing Information, Need Fixing, etc.
     * `parsed_method` (String(50)) - Tracks the parsing engine (e.g. `'ai'` or `'heuristic_fallback'`).
     * `ats_score` (Integer) - The core format and impact score (0 to 100).
     * `created_at` (DateTime, Default: current UTC)

3. **`TargetedScan` (Table: `targeted_scans`)**
   * Stores compatibility reports run against specific user-submitted job descriptions.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `user_id` (Integer, Foreign Key to `users.id`)
     * `job_title` (String(255))
     * `job_description` (Text)
     * `compatibility_score` (Integer) - Score (0 to 100) calculated by matching resume words to job descriptions.
     * `feedback_data` (JSON) - Detailed JSON mapping (matched skills, missing keywords, reasons, and recommendations).
     * `created_at` (DateTime)

4. **`UserImage` (Table: `user_images`)**
   * Stores professional rating details of candidate profile images.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `user_id` (Integer, Foreign Key to `users.id`)
     * `filename` (String(255))
     * `image_path` (String(255)) - File system upload path (`/static/uploads/images/user_{id}_{timestamp}.{ext}`).
     * `score` (Integer) - Formal score out of 100.
     * `reasoning` (Text) - Qualitative feedback explanation.
     * `feedback_data` (JSON) - Evaluation mapping for each of the 9 corporate standards.
     * `created_at` (DateTime)

5. **`ITJob` (Table: `it_jobs`)**
   * Standard IT jobs seed table used to calculate "Discovery Scan" job matches.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `job_title` (String(255), Unique)
     * `job_description` (Text)
     * `keywords` (JSON) - Critical skills required for the role.

6. **`DiscoveryScan` (Table: `discovery_scans`)**
   * Saves the history of discovery scans run for a user.
   * Attributes:
     * `id` (Integer, Primary Key)
     * `user_id` (Integer, Foreign Key to `users.id`)
     * `results_data` (JSON) - Details of the top 3 matched jobs.
     * `created_at` (DateTime)

---

## 4. Backend Implementation & API Routes

### A. Document Parsing Engine (`backend/modules/document/parser.py`)
PDF resumes often employ multi-column grids which standard text parsers read out of order (reading lines straight across columns, which scrambles sentences). The parser handles this using **coordinate-based text block sorting**:
1. Page blocks are extracted via PyMuPDF (`fitz`), ignoring images (`block_type == 0` for text only).
2. Blocks are grouped into columns by their horizontal start coordinates (`x0`) using a **150-pixel grouping tolerance** (handling labels and adjacent text blocks).
3. The columns are sorted horizontally from left to right.
4. Inside each column, text blocks are sorted from top to bottom (vertical coordinate `y0`) and then left to right (horizontal coordinate `x0`).
5. The parsed text undergoes header normalization (`format_resume_sections`) to find sections (e.g. Summary, Education, Skills, Projects, Awards) and format them with clean line breaks.

### B. NLP & Generative AI Parser (`backend/modules/nlp/ai_parser.py`)
Uses the `google-genai` SDK to interact with the `gemini-2.5-flash` model. Prompts are strongly typed using Pydantic schemas to ensure clean JSON responses:

* **Resume Parser (`parse_resume_with_ai`)**
  * **Input**: Raw scrambled resume text.
  * **Output Schema (`ResumeStructure`)**:
    * `summary`: String (Professional summary)
    * `education`: List of items (Title, organization, date range, bullet description)
    * `work_experience`: List of items (Title, organization, date range, bullet description)
    * `skills`: List of strings
    * `projects`: List of items (Title, organization, date range, bullet description)
    * `certifications`: List of strings
    * `languages`: List of strings
    * `keywords`: List of key professional terms found in the resume.
    * `missing_information`: Actions/sections missing (e.g. "No contact number").
    * `need_fixing`: Quality guides (e.g. "Use action verbs").
    * `ats_score`: Integer (0-100) representing general impact, format, and density.
    * `action_verbs_count`: Integer count of detected strong action verbs.

* **Targeted Scan (`analyze_targeted_compatibility`)**
  * **Input**: Resume text, Job Title, Job Description.
  * **Output Schema (`TargetedScanResult`)**:
    * `compatibility_score`: `(len(matched_skills) / (len(matched_skills) + len(missing_keywords))) * 100`
    * `match_status`: Rating string (`Excellent`, `Good`, `Fair`, `Low`).
    * `reasoning`: Plain-text rationale of the score.
    * `missing_keywords`: List of required keywords missing from the resume.
    * `matched_skills`: List of required keywords matched.
    * `recommendations`: Actionable improvements to enhance matching.

* **Image Evaluation (`analyze_profile_image`)**
  * **Input**: Raw image byte stream.
  * **Output Schema (`ImageCheckingResult`)**:
    * `score`: Overall score (0-100).
    * `status`: Professional rating (`Good`, `Needs Improvement`, `Poor`).
    * `reasoning`: Overall evaluation.
    * `feedback`: Array of objects containing:
      * `tip`: Name of the criteria (e.g., *Corporate Attire*, *Direct Gaze*, *Genuine Smile*, *Neutral Backdrop*, *Chest-Up Crop*, *High Resolution*, *Natural Lighting*, *Clean Grooming*, *No Filters*)
      * `passed`: Boolean (True/False)
      * `detail`: Bullet explanation.
    * `improvementTips`: Array of constructive changes.

### C. API Endpoint Summary (`backend/app.py`)

* **`GET /api/health`**
  * Health status check. Returns `{"status": "healthy"}`.
* **`POST /api/auth/register`**
  * Registers a user. On the first registration, seeds the database `it_jobs` table with **25 core IT careers** (Software Engineer, DevOps, Data Scientist, UI/UX, SRE, etc.) and lists their default descriptions and keywords.
* **`POST /api/auth/login`**
  * Verifies email & password (hashed via `werkzeug.security.check_password_hash`).
* **`POST /api/auth/verify-email`** & **`POST /api/auth/reset-password`**
  * Workflow for retrieving/updating passwords.
* **`GET /api/history/<user_id>`**
  * Retrieves list of all past resume analysis uploads for the user to plot their improvement history.
* **`GET /api/latest-analysis/<user_id>`**
  * Returns the parsed structures of the user's latest resume upload.
* **`POST /api/analyze`**
  * Multipart-file upload endpoint. Takes a PDF, extracts text, calls Gemini to structure the resume, calculates an initial score, and saves records.
* **`POST /api/analyze/targeted`**
  * Runs the targeted scan against a custom job description using Gemini.
* **`POST /api/analyze/discovery`**
  * Pulls the user's latest resume keywords and performs a comparison against all 25 jobs in the `it_jobs` database. Computes a matching percentage score, identifies matched/missing keywords, selects the top 3 highest-rated careers, and returns the result.
* **`POST /api/analyze/image`**
  * Uploads profile image, saves it locally under `backend/static/uploads/images/`, runs Gemini Multimodal analysis, and returns the score and feedback checklist.

---

## 5. Frontend Implementation & User Interface

The React application coordinates tab navigation and interfaces with the Flask REST API.

### Core Views & Tabs (`frontend/src/Dashboard.jsx`)

1. **USER HUB**
   * **Visuals**: Displays the **Resume Improvement Trend** (a line chart from `react-chartjs-2` plotting the user's `ats_score` over consecutive uploads).
   * **Actions**: A premium Drag-and-Drop / Browse upload box accepts PDF files. Clicking "Run General Analysis" submits the file to `/api/analyze`, triggering a loading spinner, then shows the extracted raw text for coordinate verification.

2. **DASHBOARD (Semantic Compatibility)**
   * **Visuals**: Displays a clean Doughnut Chart showing the parsed resume's rating breakdown. It lists active chips of extracted resume keywords.
   * **Breakdowns**: Lists key parameters: Format Score (out of 100), Keyword Density status, Action Verbs found, and specific warnings ("Needs summary section", "Missing contact information").
   * **Navigation**: Links directly to the "Targeted Scan" modal or triggers a "Discovery Scan".

3. **CAREER (Discovery / Targeted Results)**
   * **State 1 (Null)**: Interactive cards allowing users to choose either the "Targeted Scan" or "Discovery Scan".
   * **State 2 (Targeted Match)**: Shows job-specific compatibility score (Doughnut), list of matched skill chips, missing keyword chips (red color to contrast against successes), and a list of structural improvement advice.
   * **State 3 (Discovery Match)**: Displays the top 3 best matching IT jobs in a grid. Each card displays:
     * A badge indicating the match percentage.
     * A dynamic visual skill-gap meter (`100 - match_score` represented as a progress bar).
     * Missing keywords to be added to close the gap.
     * A "View more..." button that opens a detailed pop-up modal describing exactly why the match is suggested.

5. **BENCHMARK**
   * **Visuals**: A bar chart comparing the User's Latest Resume Score side-by-side with the standard **Industry Benchmark (70%)**.
   * **Warnings**: Dynamically warns the user: *“You are below the benchmark. Most likely ATS filters will reject this version.”* or congratulates them: *“Congratulations! You are above the benchmark. Your resume has a high chance of passing standard ATS filters.”*

6. **IMAGE (Formal Headshot Checking)**
   * **Visuals**: Upload page that shows examples of compliant photos (Man and Woman headshots) side-by-side with tips.
   * **Actions**: Uploads a profile image and displays a visual checklist of the 9 criteria. Items show checked (green `✅`) or warning (yellow `⚠️`) badges indicating exactly which standards were met or missed, accompanied by tips to fix them.

---

## 6. Project Architecture Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate (Browser)
    participant UI as React Frontend
    participant App as Flask Backend (app.py)
    participant Parser as PDF Parser (parser.py)
    participant AI as Gemini 2.5 API
    database DB as MySQL DB (psm_db)

    User->>UI: Uploads Resume.pdf
    UI->>App: POST /api/analyze (multipart-file + user_id)
    App->>Parser: extract_text_from_pdf(bytes)
    Note over Parser: Groups columns horizontally<br/>Sorts text left-to-right & top-to-bottom
    Parser-->>App: Return formatted raw_text
    App->>AI: parse_resume_with_ai(raw_text)
    Note over AI: Executes Gemini with<br/>ResumeStructure JSON schema
    AI-->>App: Return structured JSON (skills, score, etc.)
    App->>DB: INSERT INTO resume_analyses (raw, parsed, score, date)
    DB-->>App: Confirmation
    App-->>UI: Response with parsed data
    UI->>User: Renders General Dashboard & line charts
```

---

## 7. How to Setup and Run the Project

### Database Configuration
1. Ensure a MySQL instance is running.
2. In the `.env` file within the `backend` folder, configure your database connection string:
   ```env
   SQLALCHEMY_DATABASE_URI=mysql+pymysql://<user>:<password>@localhost/<db_name>
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. When the Flask server starts, it automatically creates all required tables if they do not exist and populates the jobs database with the 25 standard IT profiles.

### Launching the Backend
```bash
cd backend
python -m venv venv
# Activate virtual environment:
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
python app.py
```
*Backend runs on: `http://localhost:5000`*

### Launching the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on Vite dev server, typically: `http://localhost:5173`*

