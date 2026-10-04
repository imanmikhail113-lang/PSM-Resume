import os
import json
from typing import List, Optional
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types

class SectionItem(BaseModel):
    title: Optional[str] = Field(description="Title of the item, e.g., Job Title, Degree, Project Name")
    organization: Optional[str] = Field(description="Company, University, or Organization")
    date_range: Optional[str] = Field(description="Dates associated with this item")
    description: Optional[List[str]] = Field(description="Bullet points or description text")

class PersonalInfo(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Candidate's full name (e.g. John Doe, Iman Mikhail)")
    email: Optional[str] = Field(default=None, description="Candidate's email address")
    phone: Optional[str] = Field(default=None, description="Candidate's phone or mobile number")
    address: Optional[str] = Field(default=None, description="Candidate's residential address, city, state, or country")
    linkedin: Optional[str] = Field(default=None, description="Candidate's LinkedIn profile link or handle")
    portfolio: Optional[str] = Field(default=None, description="Portfolio website, GitHub URL, or personal link")

class ResumeStructure(BaseModel):
    personal_info: Optional[PersonalInfo] = Field(default=None, description="Candidate's personal and contact information")
    summary: Optional[str] = Field(description="Professional summary or objective")
    education: Optional[List[SectionItem]] = Field(description="Education history")
    work_experience: Optional[List[SectionItem]] = Field(description="Work experience or employment history")
    skills: Optional[List[str]] = Field(description="List of skills")
    projects: Optional[List[SectionItem]] = Field(description="Projects worked on")
    certifications: Optional[List[str]] = Field(description="List of certifications")
    languages: Optional[List[str]] = Field(description="Languages spoken")
    keywords: List[str] = Field(description="Key professional terms extracted from the entire resume")
    missing_information: Optional[List[str]] = Field(default=[], description="Important sections or details missing from the resume (e.g. 'Missing contact number', 'No education section', 'No work experience')")
    need_fixing: Optional[List[str]] = Field(default=[], description="Specific, actionable guides on what needs fixing (e.g. 'Use strong action verbs in work experience', 'Quantify achievements with metrics')")
    ats_score: int = Field(description="A calculated ATS score from 0 to 100 representing how well formatted and impactful this resume is.")
    action_verbs_count: int = Field(description="The number of strong action verbs found in the experience section.")

# Ranked by quota & throughput: 500 RPD models first, followed by 20 RPD fallbacks
FALLBACK_MODELS = [
    'gemini-3.5-flash-lite',  # Primary: 15 RPM / 500 RPD
    'gemini-3.1-flash-lite',  # Secondary: 15 RPM / 500 RPD
    'gemini-3.6-flash',       # Tertiary: 5 RPM / 20 RPD
    'gemini-3.7-flash',       # 5 RPM / 20 RPD
    'gemini-3.8-flash',       # 5 RPM / 20 RPD
    'gemini-3.5-flash',       # 5 RPM / 20 RPD
    'gemini-2.5-flash',       # 5 RPM / 20 RPD
]

def generate_with_gemini_cascade(client: genai.Client, contents, schema, temperature: float = 0.1) -> dict:
    """
    Executes a Gemini structured generation request with automatic model cascading.
    If a model hits 429 Rate Limit, 503 Overload, or 404, it immediately attempts the next model in the pool.
    """
    last_error = None
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=temperature,
                ),
            )
            parsed = json.loads(response.text)
            if isinstance(parsed, dict):
                parsed["_model_used"] = model_name
            print(f"[Gemini Cascade] Successfully processed with model: {model_name}")
            return parsed
        except Exception as e:
            last_error = e
            print(f"[Gemini Cascade] Model {model_name} failed or rate limited ({type(e).__name__}: {e}). Trying next model...")
            continue
            
    raise RuntimeError(f"All Gemini models in cascade failed. Last error: {last_error}")

def parse_resume_with_ai(raw_text: str) -> dict:
    """
    Parses raw resume text using Gemini and returns a structured dictionary with automatic model fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert resume parser and ATS (Applicant Tracking System) simulator. 
    I will provide you with the raw text extracted from a resume PDF.
    Because of the PDF layout, the text might be slightly scrambled or out of order (e.g., from multiple columns).
    
    Your task is to:
    1. Accurately extract all personal and contact information into `personal_info` (full name, email, phone number, address/location, LinkedIn, portfolio/GitHub).
    2. Read the text, understand the context, and extract all sections (summary, education, work experience, skills, projects, certifications, languages) into their respective structured fields.
    3. Do your best to infer the correct sections and classify the content precisely into distinct sections even if headers are missing or scrambled.
    4. Evaluate the resume and assign it a realistic `ats_score` out of 100 based on its impact, clarity, lack of typos, and keyword density.
    5. Count the number of strong action verbs used (e.g., Developed, Managed, Analyzed) and return it in `action_verbs_count`.
    
    Raw Resume Text:
    {raw_text}
    """
    
    parsed_dict = generate_with_gemini_cascade(
        client=client,
        contents=prompt,
        schema=ResumeStructure,
        temperature=0.1
    )
    
    # Ensure personal_info is always structured and backfilled if any field was missed by AI
    import re
    if not parsed_dict.get('personal_info'):
        parsed_dict['personal_info'] = {}
        
    pinfo = parsed_dict['personal_info']
    
    # Backfill Email if missing
    if not pinfo.get('email'):
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}', raw_text)
        if email_match:
            pinfo['email'] = email_match.group(0)
            
    # Backfill Phone if missing
    if not pinfo.get('phone'):
        phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}', raw_text)
        if phone_match:
            pinfo['phone'] = phone_match.group(0)
            
    # Backfill Name if missing
    if not pinfo.get('full_name'):
        for line in raw_text.split('\n'):
            line_str = line.strip()
            if line_str and len(line_str) < 50 and not any(k in line_str.lower() for k in ['summary', 'education', 'experience', 'skills', 'http', '@', 'resume', 'curriculum vitae']):
                pinfo['full_name'] = line_str
                break
                
    # Backfill LinkedIn if missing
    if not pinfo.get('linkedin'):
        linkedin_match = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-_]+', raw_text, re.IGNORECASE)
        if linkedin_match:
            pinfo['linkedin'] = linkedin_match.group(0)
            
    # Backfill Portfolio/GitHub if missing
    if not pinfo.get('portfolio'):
        github_match = re.search(r'(?:https?://)?(?:www\.)?github\.com/[\w\-_]+', raw_text, re.IGNORECASE)
        if github_match:
            pinfo['portfolio'] = github_match.group(0)

    return parsed_dict

class TargetedScanResult(BaseModel):
    compatibility_score: int = Field(description="Compatibility score from 0 to 100 between the resume and the job description.")
    match_status: str = Field(description="Match rating: e.g. Excellent, Good, Fair, Low")
    reasoning: str = Field(description="Brief explanation of why the score was given.")
    missing_keywords: List[str] = Field(description="Important keywords/skills found in the job description that are missing from the resume.")
    matched_skills: List[str] = Field(description="Keywords/skills present in both the resume and the job description.")
    recommendations: List[str] = Field(description="Actionable advice on how to improve the resume to match the job description better.")

class ImageCheckFeedbackItem(BaseModel):
    tip: str = Field(description="Name of the criteria, e.g. Corporate Attire, Direct Gaze, Genuine Smile, Neutral Backdrop, Chest-Up Crop, High Resolution, Natural Lighting, Clean Grooming, No Filters")
    passed: bool = Field(description="True if the image meets the criteria, False otherwise.")
    detail: str = Field(description="Specific feedback on this criteria.")

class ImageCheckingResult(BaseModel):
    score: int = Field(description="Overall professionalism score from 0 to 100.")
    status: str = Field(description="Status string, e.g. Good, Needs Improvement, Poor")
    reasoning: str = Field(description="Brief explanation of why the score was given.")
    feedback: List[ImageCheckFeedbackItem] = Field(description="Detailed feedback items for each of the 9 criteria.")
    improvementTips: List[str] = Field(description="Actionable suggestions to improve the photo.")

def analyze_targeted_compatibility(raw_resume_text: str, job_title: str, job_description: str) -> dict:
    """
    Compares the raw resume text with the job description using Gemini with cascading fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) recruiter and matching system.
    Evaluate the compatibility of the candidate's resume with the job description below.
    
    Instructions for Score Calculation:
    1. Identify all core technologies, skills, and professional keywords required in the Job Description.
    2. Identify which of those required skills/technologies are present in the candidate's resume (matched_skills).
    3. Identify which of those required skills/technologies are missing from the candidate's resume (missing_keywords).
    4. Calculate the compatibility_score precisely using this formula:
       compatibility_score = (len(matched_skills) / (len(matched_skills) + len(missing_keywords))) * 100
       Round this score to the nearest integer. If no keywords are found in the job description, set the score to 0.
    5. Determine match_status based on this compatibility_score:
       - Excellent (score >= 80)
       - Good (60 <= score < 80)
       - Fair (40 <= score < 60)
       - Low (score < 40)
    6. Provide a brief reasoning explaining your score calculation.
    7. List actionable recommendations.
    
    Job Title: {job_title}
    Job Description:
    {job_description}
    
    Candidate's Resume Text:
    {raw_resume_text}
    """
    
    return generate_with_gemini_cascade(
        client=client,
        contents=prompt,
        schema=TargetedScanResult,
        temperature=0.1
    )

def analyze_profile_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Analyzes a profile picture headshot using Gemini Vision capabilities with cascading fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = """
    You are a professional business headshot coach. 
    Analyze this candidate's profile headshot and evaluate it based on the 9 criteria:
    1. Corporate Attire: Clean, professional business clothing.
    2. Direct Gaze: Looking straight into the camera lens.
    3. Genuine Smile: Warm, pleasant, approachable expression.
    4. Neutral Backdrop: Solid white, light grey, or soft blue background.
    5. Chest-Up Crop: Framing from mid-chest to just above head.
    6. High Resolution: File is crisp, sharp, and focused.
    7. Natural Lighting: Even light, no harsh facial shadows.
    8. Clean Grooming: Neat hair, neat styling.
    9. No Filters: No obvious mobile filters or digital edits.
    
    Evaluate each criteria and calculate an overall score from 0 to 100.
    Provide feedback for each of the 9 items exactly, showing if they passed or failed, and actionable improvementTips.
    """
    
    contents = [
        types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        ),
        prompt
    ]
    
    return generate_with_gemini_cascade(
        client=client,
        contents=contents,
        schema=ImageCheckingResult,
        temperature=0.2
    )

