from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from modules.document.parser import extract_text_from_pdf
from modules.database.models import db, ResumeAnalysis, User, TargetedScan, UserImage, ITJob, DiscoveryScan
from modules.nlp.ai_parser import analyze_targeted_compatibility, analyze_profile_image
from werkzeug.utils import secure_filename
from auth import configure_auth

load_dotenv()

app = Flask(__name__, static_folder=None)
CORS(app, origins=os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173').split(','), supports_credentials=True)
configure_auth(app)

# Configure Uploads
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads', 'images')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/static/uploads/images/<path:filename>')
def serve_uploaded_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# Database configuration
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///psm.db')
connect_args = {}

# Normalize standard postgres prefix for SQLAlchemy
if db_uri.startswith('postgres://'):
    db_uri = db_uri.replace('postgres://', 'postgresql://', 1)

# Ensure compatibility with whichever driver is installed (psycopg v3 or psycopg2)
try:
    import psycopg
except ImportError:
    try:
        import psycopg2
        if db_uri.startswith('postgresql://'):
            db_uri = db_uri.replace('postgresql://', 'postgresql+psycopg2://', 1)
    except ImportError:
        pass

if 'postgresql' in db_uri:
    # On Windows local machines, handle Supabase IPv6-only DNS quirks by resolving to IPv4
    if os.name == 'nt':
        import urllib.parse
        import socket
        try:
            parsed = urllib.parse.urlparse(db_uri)
            if parsed.hostname and 'supabase' in parsed.hostname:
                ipv4 = socket.gethostbyname(parsed.hostname)
                new_netloc = parsed.netloc.replace(parsed.hostname, ipv4)
                db_uri = parsed._replace(netloc=new_netloc).geturl()
        except Exception as e:
            print(f"Hostname resolution note: {e}")

    connect_args = {
        'connect_timeout': 10,
        'sslmode': 'require',
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5
    }

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'max_overflow': 20,
    'connect_args': connect_args
}
db.init_app(app)

# Asynchronous background database initialization so app startup is instantaneous
import threading

def seed_it_jobs():
    try:
        if not ITJob.query.first():
            it_jobs_data = [
                {
                    "title": "Software Engineer",
                    "description": "Develop, test, and maintain software applications using various programming languages. Collaborate with cross-functional teams to design systems and solve complex problems.",
                    "keywords": ["Python", "Java", "C++", "Software Engineering", "Algorithms", "Data Structures", "Git", "Testing", "OOP"]
                },
                {
                    "title": "Data Scientist",
                    "description": "Analyze complex data sets to extract actionable insights. Build predictive models, machine learning algorithms, and data visualizations to solve business problems.",
                    "keywords": ["Python", "R", "Machine Learning", "SQL", "Data Analysis", "Statistics", "Pandas", "NumPy", "TensorFlow", "Scikit-Learn"]
                },
                {
                    "title": "DevOps Engineer",
                    "description": "Bridge the gap between development and operations. Build and maintain CI/CD pipelines, automate infrastructure deployment, and monitor system performance.",
                    "keywords": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Git", "Jenkins", "Terraform", "Ansible", "Cloud"]
                },
                {
                    "title": "Frontend Developer",
                    "description": "Create user-facing web applications. Implement responsive designs, interactive elements, and optimize web performance using modern frontend technologies.",
                    "keywords": ["HTML", "CSS", "JavaScript", "React", "Vue", "Angular", "TypeScript", "Responsive Design", "Sass", "Webpack"]
                },
                {
                    "title": "Backend Developer",
                    "description": "Design and build server-side logic, database integrations, and APIs. Ensure high performance, security, and scalability of backend systems.",
                    "keywords": ["Node.js", "Python", "Java", "Go", "SQL", "NoSQL", "APIs", "Express", "Django", "Spring Boot", "Databases"]
                },
                {
                    "title": "Full-Stack Developer",
                    "description": "Develop both client-side and server-side software. Work on frontend user interfaces, backend APIs, and database integrations.",
                    "keywords": ["React", "Node.js", "JavaScript", "SQL", "Git", "APIs", "HTML", "CSS", "Docker", "Express"]
                },
                {
                    "title": "Cloud Architect",
                    "description": "Design and implement cloud computing strategies and architectures. Oversee cloud systems configuration, deployment, and cloud security.",
                    "keywords": ["AWS", "Azure", "GCP", "Cloud", "Terraform", "Networking", "Security", "Solutions Architecture", "Kubernetes"]
                },
                {
                    "title": "Cybersecurity Analyst",
                    "description": "Protect computer systems and networks from cyber attacks. Monitor for security breaches, conduct vulnerability assessments, and implement security controls.",
                    "keywords": ["Security", "Firewalls", "Information Security", "Network Security", "Linux", "Penetration Testing", "Vulnerability", "Cryptography"]
                },
                {
                    "title": "Database Administrator",
                    "description": "Manage, secure, and maintain database management systems. Optimize query performance, perform backups, and ensure data integrity.",
                    "keywords": ["SQL", "MySQL", "PostgreSQL", "Oracle", "MongoDB", "Database", "Performance Tuning", "Backup", "Security"]
                },
                {
                    "title": "Systems Administrator",
                    "description": "Install, configure, and maintain computer systems and servers. Troubleshoot hardware and software issues, manage user accounts, and ensure system uptime.",
                    "keywords": ["Linux", "Windows Server", "Active Directory", "Scripting", "Bash", "Powershell", "Networking", "Virtualization", "VMware"]
                },
                {
                    "title": "IT Support Specialist",
                    "description": "Provide technical assistance and support to users. Troubleshoot computer hardware, software, and network issues.",
                    "keywords": ["Troubleshooting", "Windows", "MacOS", "Customer Support", "Hardware", "Active Directory", "Help Desk"]
                },
                {
                    "title": "Network Engineer",
                    "description": "Design, implement, and support computer networks. Configure routers, switches, firewalls, and monitor network traffic.",
                    "keywords": ["Cisco", "Routing", "Switching", "TCP/IP", "Firewalls", "VPN", "DNS", "Networking", "Network Security"]
                },
                {
                    "title": "Product Manager (IT)",
                    "description": "Define product strategy and roadmap. Translate business goals into product requirements and collaborate with engineering teams to deliver IT products.",
                    "keywords": ["Product Management", "Agile", "Scrum", "Roadmap", "User Stories", "Market Research", "Product Strategy"]
                },
                {
                    "title": "QA Engineer",
                    "description": "Design and execute test cases to ensure software quality. Conduct manual testing, write automated test scripts, and report defects.",
                    "keywords": ["Testing", "Selenium", "QA", "Automation", "Python", "Java", "Git", "Jira", "Test Cases"]
                },
                {
                    "title": "UI/UX Designer",
                    "description": "Design intuitive user interfaces and user experiences. Create wireframes, mockups, prototypes, and conduct user research.",
                    "keywords": ["Figma", "UI/UX", "Adobe XD", "Wireframing", "Prototyping", "User Research", "Visual Design"]
                },
                {
                    "title": "Mobile App Developer",
                    "description": "Design and build mobile applications for iOS and Android platforms. Implement responsive layouts and consume backend APIs.",
                    "keywords": ["Swift", "Kotlin", "React Native", "Flutter", "iOS", "Android", "Mobile Development", "Git", "APIs"]
                },
                {
                    "title": "Machine Learning Engineer",
                    "description": "Design and deploy machine learning systems and pipelines. Train models on large datasets and integrate them into production applications.",
                    "keywords": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "Scikit-Learn", "MLOps", "NLP"]
                },
                {
                    "title": "Business Analyst (IT)",
                    "description": "Analyze business processes and requirements. Translate business needs into technical specifications and collaborate with IT teams.",
                    "keywords": ["Business Analysis", "Requirements Gathering", "SQL", "Agile", "UML", "Data Analysis", "Jira"]
                },
                {
                    "title": "Data Analyst",
                    "description": "Collect, process, and perform statistical analyses on data. Create dashboards and reports to help business decision-making.",
                    "keywords": ["SQL", "Excel", "Tableau", "Power BI", "Python", "Data Analysis", "Statistics", "Data Visualization", "ETL"]
                },
                {
                    "title": "IT Project Manager",
                    "description": "Plan, execute, and deliver IT projects on time and budget. Manage project scopes, resources, risk management, and stakeholder communications.",
                    "keywords": ["Project Management", "Agile", "Scrum", "Jira", "Risk Management", "Budgeting", "PMP", "Scheduling"]
                },
                {
                    "title": "Solutions Architect",
                    "description": "Design end-to-end technical solutions to address complex business needs. Guide engineering teams and select appropriate technology stacks.",
                    "keywords": ["Solutions Architecture", "System Design", "Cloud", "Integration", "APIs", "Security", "Microservices"]
                },
                {
                    "title": "Scrum Master",
                    "description": "Facilitate Agile processes and Scrum framework. Help development teams collaborate, remove blockers, and improve delivery velocity.",
                    "keywords": ["Scrum", "Agile", "Kanban", "Facilitation", "Jira", "Sprint Planning", "Coaching"]
                },
                {
                    "title": "Site Reliability Engineer (SRE)",
                    "description": "Apply software engineering practices to infrastructure and operations problems. Ensure system reliability, uptime, scalability, and performance.",
                    "keywords": ["Python", "Go", "Docker", "Kubernetes", "Linux", "Monitoring", "Prometheus", "CI/CD", "Automation"]
                },
                {
                    "title": "Information Security Manager",
                    "description": "Establish and enforce information security policies. Lead incident response, conduct compliance audits, and manage security risks.",
                    "keywords": ["Information Security", "Security Policies", "Risk Assessment", "Compliance", "CISSP", "Audit", "Incident Response"]
                },
                {
                    "title": "Systems Analyst",
                    "description": "Analyze and design information systems to align technology with business goals. Troubleshoot system issues and configure software integrations.",
                    "keywords": ["Systems Analysis", "SQL", "System Design", "UML", "Requirements Gathering", "Integration", "Testing"]
                },
                {
                    "title": "Cloud Engineer",
                    "description": "Implement, migrate, and maintain cloud infrastructure and services. Work closely with Cloud Architects to implement design patterns and optimize resource utilization.",
                    "keywords": ["AWS", "Azure", "GCP", "Cloud Infrastructure", "Terraform", "CI/CD", "Linux", "SysOps"]
                },
                {
                    "title": "Data Engineer",
                    "description": "Design, build, and maintain data pipelines and architectures. Integrate data sources, manage data warehouses, and optimize ETL processes for downstream analysis.",
                    "keywords": ["SQL", "ETL", "Spark", "Hadoop", "Python", "Data Warehousing", "Kafka", "Data Pipeline", "Airflow"]
                },
                {
                    "title": "Application Security Engineer",
                    "description": "Focus on securing software applications throughout the development lifecycle. Perform threat modeling, code reviews, and penetration testing to identify vulnerabilities.",
                    "keywords": ["Application Security", "SAST", "DAST", "Threat Modeling", "OWASP", "Vulnerability Assessment", "Git", "DevSecOps"]
                },
                {
                    "title": "IT Director",
                    "description": "Provide strategic leadership for the IT department. Manage IT infrastructure, define tech strategies, oversee budgets, and align technology initiatives with business goals.",
                    "keywords": ["IT Strategy", "Leadership", "Budgeting", "IT Governance", "Project Management", "Vendor Management", "Team Management"]
                },
                {
                    "title": "Network Administrator",
                    "description": "Install, configure, and support an organization's local area network (LAN), wide area network (WAN), and internet systems. Monitor network availability and performance.",
                    "keywords": ["LAN", "WAN", "Cisco", "Switching", "Routing", "Firewalls", "Network Administration", "TCP/IP", "DNS"]
                },
                {
                    "title": "IT Auditor",
                    "description": "Evaluate IT systems, infrastructure, and policies to ensure security, compliance, and efficiency. Identify control gaps and recommend risk mitigation strategies.",
                    "keywords": ["IT Audit", "Compliance", "SOX", "COBIT", "CISA", "Internal Audit", "Risk Management", "Information Security"]
                },
                {
                    "title": "Help Desk Manager",
                    "description": "Oversee the IT support team and help desk operations. Manage escalation processes, define service level agreements (SLAs), and ensure high user satisfaction.",
                    "keywords": ["ITIL", "SLA", "Help Desk", "Technical Support", "Incident Management", "Team Leadership", "Service Desk"]
                },
                {
                    "title": "Computer Systems Analyst",
                    "description": "Analyze science, engineering, business, and other data processing problems to implement and improve computer systems. Analyze user requirements and workflows.",
                    "keywords": ["Systems Analysis", "UML", "SQL", "Requirements Gathering", "Workflow Analysis", "SDLC", "Software Design"]
                },
                {
                    "title": "Database Developer",
                    "description": "Design, develop, and optimize database schemas, stored procedures, and triggers. Collaborate with backend developers to integrate databases with applications.",
                    "keywords": ["SQL", "PL/SQL", "T-SQL", "Stored Procedures", "Query Optimization", "Database Design", "Performance Tuning"]
                },
                {
                    "title": "Release Manager",
                    "description": "Manage the software release lifecycle, including scheduling, coordinating, and managing code deployments. Oversee release environments and rollbacks.",
                    "keywords": ["Release Management", "CI/CD", "Git", "Jenkins", "Jira", "Agile", "Change Management", "Deployment"]
                },
                {
                    "title": "Security Architect",
                    "description": "Design, build, and oversee the implementation of network and computer security systems. Develop security policies, standards, and security architectures.",
                    "keywords": ["Security Architecture", "Network Security", "Cryptography", "Identity Access Management", "IAM", "Risk Assessment", "CISSP"]
                },
                {
                    "title": "Technical Support Engineer",
                    "description": "Provide high-level technical assistance to customers troubleshooting complex software and hardware issues. Work closely with product developers on bug fixes.",
                    "keywords": ["Technical Support", "Troubleshooting", "SQL", "Linux", "APIs", "Customer Service", "Log Analysis", "Debugging"]
                },
                {
                    "title": "Computer Network Architect",
                    "description": "Design and build data communication networks, including local area networks (LANs), wide area networks (WANs), and intranets. Create high-level network topology plans.",
                    "keywords": ["Network Design", "LAN/WAN", "BGP", "OSPF", "Cisco", "Cloud Networking", "SDN", "Network Security"]
                },
                {
                    "title": "Embedded Systems Engineer",
                    "description": "Develop software and firmware for hardware devices. Write low-level code, perform hardware-software integration, and debug using logic analyzers.",
                    "keywords": ["C", "C++", "RTOS", "Microcontrollers", "Firmware", "Embedded Systems", "Debugging", "IoT"]
                },
                {
                    "title": "IT Consultant",
                    "description": "Advise organizations on how to use information technology to meet their business objectives. Lead IT transformations, system upgrades, and process optimizations.",
                    "keywords": ["IT Strategy", "Business Analysis", "Change Management", "Project Management", "Vendor Selection", "Consulting", "System Integration"]
                },
                {
                    "title": "Game Developer",
                    "description": "Design and program video games for consoles, PC, or mobile devices. Implement game mechanics, physics engines, and graphics using game engines.",
                    "keywords": ["C#", "C++", "Unity", "Unreal Engine", "Game Design", "3D Graphics", "Physics Engines", "Shaders"]
                },
                {
                    "title": "Search Engine Optimization (SEO) Specialist",
                    "description": "Optimize website pages, content, and structure to improve organic search engine rankings. Analyze web traffic metrics and conduct keyword research.",
                    "keywords": ["SEO", "Google Analytics", "Keyword Research", "Link Building", "HTML", "CSS", "Content Strategy", "A/B Testing"]
                },
                {
                    "title": "CRM Administrator",
                    "description": "Configure, customize, and maintain the organization's CRM platform (e.g., Salesforce). Manage user roles, custom objects, workflows, and data integrity.",
                    "keywords": ["Salesforce", "CRM", "Workflows", "Data Management", "User Administration", "Reports", "Dashboards"]
                },
                {
                    "title": "Hardware Engineer",
                    "description": "Design, test, and analyze computer hardware components including circuit boards, processors, and memory devices. Create schematics and supervise prototypes.",
                    "keywords": ["Circuit Design", "PCB Design", "FPGA", "VHDL", "Verilog", "Hardware Testing", "CAD"]
                },
                {
                    "title": "ERP Consultant",
                    "description": "Implement, configure, and customize Enterprise Resource Planning systems (e.g., SAP, Oracle ERP). Analyze business processes and align them with ERP modules.",
                    "keywords": ["SAP", "Oracle ERP", "Business Processes", "ERP Implementation", "SQL", "Configuration", "Data Migration"]
                },
                {
                    "title": "Technical Writer",
                    "description": "Produce high-quality documentation that contributes to the overall success of products. Write API documentation, user guides, and integration tutorials.",
                    "keywords": ["Technical Writing", "Documentation", "Markdown", "API Documentation", "Git", "Software Documentation", "Jira"]
                },
                {
                    "title": "Webmaster",
                    "description": "Maintain and update websites. Monitor website performance, handle server configuration, troubleshoot broken links, and update web content.",
                    "keywords": ["HTML", "CSS", "JavaScript", "Apache", "Nginx", "Web Analytics", "Domain Management", "SEO"]
                },
                {
                    "title": "Data Architect",
                    "description": "Define how data is stored, consumed, integrated, and managed by different entities and IT systems. Design enterprise-level database models and data flows.",
                    "keywords": ["Data Modeling", "Enterprise Data Architecture", "Data Warehousing", "Metadata Management", "SQL", "NoSQL", "ETL"]
                },
                {
                    "title": "Computer Vision Engineer",
                    "description": "Develop algorithms and models that enable computers to understand digital images or videos. Implement object detection, image segmentation, and facial recognition.",
                    "keywords": ["Python", "OpenCV", "PyTorch", "TensorFlow", "Deep Learning", "Machine Learning", "Image Processing", "CNN"]
                },
                {
                    "title": "Natural Language Processing (NLP) Engineer",
                    "description": "Design and build NLP systems and models that process and understand human language. Train text classifiers, translation models, and speech-to-text algorithms.",
                    "keywords": ["Python", "NLP", "PyTorch", "Transformers", "BERT", "NLTK", "SpaCy", "Deep Learning", "Machine Learning"]
                },
                {
                    "title": "DevSecOps Engineer",
                    "description": "Integrate security practices into the DevOps pipeline. Automate security checks, monitor runtime security, and promote security-as-code principles.",
                    "keywords": ["DevSecOps", "CI/CD", "Docker", "Kubernetes", "AWS", "SAST/DAST", "Terraform", "Security Automation", "Linux"]
                },
                {
                    "title": "GIS Specialist",
                    "description": "Design, develop, and maintain geographic information systems (GIS). Capture, analyze, and display spatial and geographic data on maps.",
                    "keywords": ["GIS", "ArcGIS", "QGIS", "Python", "Spatial Analysis", "PostGIS", "Cartography", "SQL"]
                }
            ]
            for job_info in it_jobs_data:
                job_rec = ITJob(
                    job_title=job_info["title"],
                    job_description=job_info["description"],
                    keywords=job_info["keywords"]
                )
                db.session.add(job_rec)
            db.session.commit()
            print("Successfully seeded 52 IT jobs.")
    except Exception as seed_err:
        print(f"Error seeding IT jobs: {seed_err}")

def init_db_background(flask_app):
    with flask_app.app_context():
        try:
            db.create_all()
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            if inspector.has_table('users'):
                columns = [c['name'] for c in inspector.get_columns('users')]
                if 'username' not in columns:
                    with db.engine.begin() as conn:
                        conn.execute(db.text("ALTER TABLE users ADD COLUMN username VARCHAR(80) UNIQUE"))
                    print("Successfully added column 'username' to 'users' table.")
        except Exception as e:
            print(f"Schema verification note: {e}")
        
        seed_it_jobs()

# Create authentication tables before accepting requests; seed jobs in background.
with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        print(f"Warning: Initial db.create_all deferred or encountered note: {e}")

# Background legacy-schema verification and job seeding
threading.Thread(target=init_db_background, args=(app,), daemon=True).start()



@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "online",
        "message": "Intelligent Resume Analyzer API is running. Use /api/health to check health or POST to /api/analyze to parse a resume."
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Intelligent Resume Analyzer API is running."})

@app.route('/api/db-status', methods=['GET'])
def db_status():
    try:
        db.session.execute(db.text('SELECT 1'))
        is_supabase = "supabase" in app.config['SQLALCHEMY_DATABASE_URI']
        return jsonify({
            "status": "success",
            "connected": True,
            "provider": "Supabase" if is_supabase else "Local DB",
            "message": "Database connected successfully."
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "connected": False,
            "provider": "Unknown",
            "message": str(e)
        }), 500

@app.route('/api/history/<int:user_id>', methods=['GET'])
def get_history(user_id):
    analyses = ResumeAnalysis.query.filter_by(user_id=user_id).order_by(ResumeAnalysis.created_at.desc()).all()
    return jsonify({
        "status": "success",
        "data": [a.to_dict() for a in analyses]
    })

@app.route('/api/history/images/<int:user_id>', methods=['GET'])
def get_image_history(user_id):
    try:
        images = UserImage.query.filter_by(user_id=user_id).order_by(UserImage.score.desc()).all()
        return jsonify({
            "status": "success",
            "data": [img.to_dict() for img in images]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/latest-analysis/<int:user_id>', methods=['GET'])
def get_latest_analysis(user_id):
    latest = ResumeAnalysis.query.filter_by(user_id=user_id).order_by(ResumeAnalysis.created_at.desc()).first()
    if not latest:
        return jsonify({
            "status": "success",
            "data": None
        })
    return jsonify({
        "status": "success",
        "data": {
            "id": latest.id,
            "filename": latest.filename,
            "parsed_content": latest.parsed_data,
            "parsed_method": latest.parsed_method,
            "extracted_text": latest.raw_text,
            "semantic_score": 0,
            "ats_parseability": len(latest.raw_text or "") > 0,
            "missing_keywords": [],
            "visual_professionalism": "pending",
            "thumbnail": latest.parsed_data.get('thumbnail') if isinstance(latest.parsed_data, dict) else None
        }
    })


@app.route('/api/latest-targeted-scan/<int:user_id>', methods=['GET'])
def get_latest_targeted_scan(user_id):
    latest = TargetedScan.query.filter_by(user_id=user_id).order_by(TargetedScan.created_at.desc()).first()
    if not latest:
        return jsonify({
            "status": "success",
            "data": None
        })
    return jsonify({
        "status": "success",
        "data": latest.to_dict()
    })


@app.route('/api/latest-discovery-scan/<int:user_id>', methods=['GET'])
def get_latest_discovery_scan(user_id):
    latest = DiscoveryScan.query.filter_by(user_id=user_id).order_by(DiscoveryScan.created_at.desc()).first()
    if not latest:
        return jsonify({
            "status": "success",
            "data": None
        })
    return jsonify({
        "status": "success",
        "data": latest.to_dict()
    })

@app.route('/api/analyze/discovery', methods=['POST'])
def analyze_discovery():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"status": "error", "message": "User ID is required."}), 400
        
    latest_resume = ResumeAnalysis.query.filter_by(user_id=int(user_id)).order_by(ResumeAnalysis.created_at.desc()).first()
    if not latest_resume:
        return jsonify({"status": "error", "message": "No resume found. Please upload a resume first."}), 400
        
    # Get all IT jobs
    all_jobs = ITJob.query.all()
    if not all_jobs:
        return jsonify({"status": "error", "message": "No jobs found in database."}), 500
        
    # Extract resume keywords
    resume_keywords = []
    if latest_resume.parsed_data and isinstance(latest_resume.parsed_data, dict):
        resume_keywords = latest_resume.parsed_data.get('keywords', [])
        # Fallback to skills if keywords are empty
        if not resume_keywords:
            resume_keywords = latest_resume.parsed_data.get('skills', [])
            
    # Normalize resume keywords to lowercase for comparison
    resume_keywords_lower = [k.lower() for k in resume_keywords]
    
    job_scores = []
    for job in all_jobs:
        job_keywords = job.keywords or []
        if not job_keywords:
            continue
        
        # Calculate matched and missing
        matched = []
        missing = []
        for kw in job_keywords:
            if kw.lower() in resume_keywords_lower:
                matched.append(kw)
            else:
                missing.append(kw)
                
        # Match score calculation
        total_kw = len(job_keywords)
        score = int((len(matched) / total_kw) * 100) if total_kw > 0 else 0
        
        job_scores.append({
            "job_title": job.job_title,
            "job_description": job.job_description,
            "match_score": score,
            "matched_skills": matched,
            "missing_keywords": missing
        })
        
    # Sort by match score desc and select top 3
    job_scores.sort(key=lambda x: x['match_score'], reverse=True)
    top_3 = job_scores[:3]
    
    # Save to database
    try:
        scan_record = DiscoveryScan(
            user_id=int(user_id),
            results_data=top_3
        )
        db.session.add(scan_record)
        db.session.commit()
        record_id = scan_record.id
    except Exception as e:
        print(f"Database error saving discovery scan: {e}")
        db.session.rollback()
        record_id = None
        
    return jsonify({
        "status": "success",
        "data": {
            "id": record_id,
            "results_data": top_3
        }
    })




@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part in the request."}), 400
        
    file = request.files['file']
    user_id = request.form.get('user_id')
    
    if not user_id:
        return jsonify({"status": "error", "message": "User ID is required."}), 400
    
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file."}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"status": "error", "message": "Only PDF files are allowed."}), 400

    try:
        # Read the file stream into memory
        file_bytes = file.read()
        
        # 1. Document Processing Module
        raw_text = extract_text_from_pdf(file_bytes)
        
        if not raw_text:
            return jsonify({"status": "error", "message": "Failed to extract text from the PDF."}), 500

        # Try AI Parsing first
        try:
            from modules.nlp.ai_parser import parse_resume_with_ai
            structured_data = parse_resume_with_ai(raw_text)
            parsed_method = "ai"
        except Exception as e:
            print(f"AI parsing failed, falling back to raw text. Error: {e}")
            import re
            inferred_skills = []
            common_skills = ["python", "java", "javascript", "react", "html", "css", "sql", "git", "docker", "kubernetes", "aws", "gcp", "c++", "c#", "php", "ruby", "rust", "go", "linux", "jira"]
            for skill in common_skills:
                if re.search(r'\b' + re.escape(skill) + r'\b', raw_text.lower()):
                    inferred_skills.append(skill.capitalize() if skill != "sql" and skill != "aws" and skill != "gcp" and skill != "css" and skill != "html" else skill.upper())
            
            # Extract basic personal info heuristics
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_text)
            phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}', raw_text)
            lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
            inferred_name = lines[0] if lines else None

            structured_data = {
                "personal_info": {
                    "full_name": inferred_name,
                    "email": email_match.group(0) if email_match else None,
                    "phone": phone_match.group(0) if phone_match else None,
                    "address": None,
                    "linkedin": None,
                    "portfolio": None
                },
                "summary": "Professional resume text extracted (AI Parser Offline).",
                "education": [{"title": "Degree / Qualification Details", "organization": "Refer to extracted text below", "date_range": "", "description": []}],
                "work_experience": [],
                "skills": inferred_skills if inferred_skills else ["Professional"],
                "projects": [],
                "certifications": [],
                "languages": [],
                "keywords": inferred_skills if inferred_skills else ["Resume"],
                "missing_information": ["AI parser offline - fallback mode active"],
                "need_fixing": ["Provide high quality layout in PDF for better local parsing"],
                "ats_score": 60, # Standard fallback score
                "action_verbs_count": 0
            }
        # Generate thumbnail of first page if PDF
        try:
            import fitz
            import base64
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            if len(doc) > 0:
                page = doc[0]
                pix = page.get_pixmap(dpi=110)
                thumb_bytes = pix.tobytes("png")
                thumb_b64 = "data:image/png;base64," + base64.b64encode(thumb_bytes).decode('utf-8')
                if isinstance(structured_data, dict):
                    structured_data['thumbnail'] = thumb_b64
        except Exception as thumb_err:
            print(f"Thumbnail generation note: {thumb_err}")

        # Save to database
        try:
            ats_score = structured_data.get('ats_score') if isinstance(structured_data, dict) else None
            analysis_record = ResumeAnalysis(
                user_id=int(user_id),
                filename=file.filename,
                raw_text=raw_text,
                parsed_data=structured_data,
                parsed_method=parsed_method,
                ats_score=ats_score
            )
            db.session.add(analysis_record)
            db.session.commit()
            record_id = analysis_record.id
        except Exception as db_err:
            print(f"Database error: {db_err}")
            db.session.rollback()
            record_id = None

        return jsonify({
            "status": "success",
            "message": "PDF successfully parsed and saved.",
            "data": {
                "id": record_id,
                "parsed_content": structured_data,
                "parsed_method": parsed_method,
                "extracted_text": raw_text,  # Keep raw text for verification
                "semantic_score": 0,
                "ats_parseability": len(raw_text) > 0, # Basic check
                "missing_keywords": [],
                "visual_professionalism": "pending"
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/analyze/targeted', methods=['POST'])
def targeted_scan():
    data = request.get_json()
    user_id = data.get('user_id')
    job_title = data.get('job_title')
    job_description = data.get('job_description')

    if not user_id or not job_title or not job_description:
        return jsonify({"status": "error", "message": "User ID, Job Title, and Job Description are required."}), 400

    # Get the user's latest resume
    latest_resume = ResumeAnalysis.query.filter_by(user_id=int(user_id)).order_by(ResumeAnalysis.created_at.desc()).first()
    if not latest_resume:
        return jsonify({"status": "error", "message": "No resume found. Please upload a resume first."}), 400

    try:
        # Call Gemini matching
        result = analyze_targeted_compatibility(latest_resume.raw_text, job_title, job_description)
        
        # Save to database
        scan_record = TargetedScan(
            user_id=int(user_id),
            job_title=job_title,
            job_description=job_description,
            compatibility_score=result.get('compatibility_score', 0),
            feedback_data=result
        )
        db.session.add(scan_record)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Targeted analysis completed and saved.",
            "data": scan_record.to_dict()
        })
    except Exception as e:
        print(f"Error in targeted scan: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/analyze/image', methods=['POST'])
def image_scan():
    from datetime import datetime
    if 'image' not in request.files and 'file' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided."}), 400

    file = request.files.get('image') or request.files.get('file')
    user_id = request.form.get('user_id')

    if not user_id:
        return jsonify({"status": "error", "message": "User ID is required."}), 400

    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file."}), 400

    # Ensure it is a valid image type
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in allowed_extensions:
        return jsonify({"status": "error", "message": f"Allowed extensions are: {', '.join(allowed_extensions)}"}), 400

    try:
        # Read bytes
        image_bytes = file.read()
        
        # Call Gemini Vision Model
        mime_type = "image/jpeg" if ext in {'.jpg', '.jpeg'} else f"image/{ext[1:]}"
        result = analyze_profile_image(image_bytes, mime_type)

        # Generate compact base64 thumbnail for permanent display
        try:
            import base64
            import cv2
            import numpy as np
            nparr = np.frombuffer(image_bytes, np.uint8)
            img_mat = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_mat is not None:
                h, w = img_mat.shape[:2]
                scale = 200.0 / max(h, w)
                resized = cv2.resize(img_mat, (int(w * scale), int(h * scale)))
                _, buf = cv2.imencode('.jpg', resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                result['thumbnail'] = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
        except Exception as thumb_err:
            print(f"Thumbnail creation error: {thumb_err}")

        # Save the file locally
        filename = f"user_{user_id}_{int(datetime.utcnow().timestamp())}{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Write the file from bytes (since we already read it)
        with open(filepath, 'wb') as f:
            f.write(image_bytes)

        relative_path = f"/static/uploads/images/{filename}"

        # Save to database
        image_record = UserImage(
            user_id=int(user_id),
            filename=file.filename,
            image_path=relative_path,
            score=result.get('score', 0),
            reasoning=result.get('reasoning', ''),
            feedback_data=result
        )
        db.session.add(image_record)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Profile headshot analyzed and saved.",
            "data": image_record.to_dict()
        })
    except Exception as e:
        print(f"Error in image scan: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

