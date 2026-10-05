from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    analyses = db.relationship('ResumeAnalysis', backref='user', lazy=True, cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class ResumeAnalysis(db.Model):
    __tablename__ = 'resume_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    raw_text = db.Column(db.Text, nullable=True)
    parsed_data = db.Column(db.JSON, nullable=True)
    parsed_method = db.Column(db.String(50), nullable=True)
    ats_score = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        thumb = None
        if isinstance(self.parsed_data, dict):
            thumb = self.parsed_data.get('thumbnail')
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'parsed_data': self.parsed_data,
            'parsed_method': self.parsed_method,
            'ats_score': self.ats_score,
            'thumbnail': thumb,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class TargetedScan(db.Model):
    __tablename__ = 'targeted_scans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    job_title = db.Column(db.String(255), nullable=False)
    job_description = db.Column(db.Text, nullable=False)
    compatibility_score = db.Column(db.Integer, nullable=False)
    feedback_data = db.Column(db.JSON, nullable=True) # To store missing_keywords, matched_skills, recommendations, reasoning, match_status
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'compatibility_score': self.compatibility_score,
            'feedback_data': self.feedback_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class UserImage(db.Model):
    __tablename__ = 'user_images'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    image_path = db.Column(db.String(255), nullable=False) # Local path or URL
    score = db.Column(db.Integer, nullable=False)
    reasoning = db.Column(db.Text, nullable=True)
    feedback_data = db.Column(db.JSON, nullable=True) # To store full breakdown and improvementTips
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'image_path': self.image_path,
            'score': self.score,
            'reasoning': self.reasoning,
            'feedback_data': self.feedback_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ITJob(db.Model):
    __tablename__ = 'it_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    job_title = db.Column(db.String(255), unique=True, nullable=False)
    job_description = db.Column(db.Text, nullable=False)
    keywords = db.Column(db.JSON, nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'keywords': self.keywords
        }


class DiscoveryScan(db.Model):
    __tablename__ = 'discovery_scans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    results_data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'results_data': self.results_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }



