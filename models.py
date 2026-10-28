from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Paper(db.Model):
    __tablename__ = 'paper'
    
    id = db.Column(db.Integer, primary_key=True)
    course = db.Column(db.String(120), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    exam_type = db.Column(db.String(50), nullable=False, index=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    original_file_path = db.Column(db.String(300), nullable=True)
    original_filename = db.Column(db.String(200), nullable=True)
    file_type = db.Column(db.String(20), default='images')
    
    pages = db.relationship(
        'PaperPage',
        backref=db.backref('paper', lazy=True),
        cascade='all, delete-orphan',
        order_by='PaperPage.page_number',
        lazy=True
    )
    
    solutions = db.relationship(
        'Solution',
        backref=db.backref('paper', lazy=True),
        cascade='all, delete-orphan',
        order_by='Solution.upload_date.desc()',
        lazy=True
    )

    @property
    def page_count(self):
        return len(self.pages)

    @property
    def solution_count(self):
        return len(self.solutions)

    @property
    def first_page_url(self):
        if self.pages and len(self.pages) > 0:
            return self.pages[0].file_path
        return None

    def to_dict(self):
        return {
            'id': self.id,
            'course': self.course,
            'year': self.year,
            'exam_type': self.exam_type,
            'upload_date': self.upload_date.strftime('%Y-%m-%d %H:%M') if self.upload_date else '',
            'original_file_path': self.original_file_path,
            'original_filename': self.original_filename,
            'file_type': self.file_type or 'images',
            'page_count': self.page_count,
            'solution_count': self.solution_count,
            'thumbnail': self.first_page_url
        }


class PaperPage(db.Model):
    __tablename__ = 'paper_page'
    
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('paper.id', ondelete='CASCADE'), nullable=False, index=True)
    file_path = db.Column(db.String(300), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'paper_id': self.paper_id,
            'file_path': self.file_path,
            'page_number': self.page_number
        }


class Solution(db.Model):
    __tablename__ = 'solution'
    
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('paper.id', ondelete='CASCADE'), nullable=False, index=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    contributor = db.Column(db.String(100), default='Community Contributor')
    notes = db.Column(db.Text, nullable=True)
    solution_type = db.Column(db.String(20), default='images')
    text_content = db.Column(db.Text, nullable=True)
    question_number = db.Column(db.String(50), nullable=True, default='1')

    pages = db.relationship(
        'SolutionPage',
        backref=db.backref('solution', lazy=True),
        cascade='all, delete-orphan',
        order_by='SolutionPage.page_number',
        lazy=True
    )

    @property
    def page_count(self):
        return len(self.pages)

    @property
    def has_text(self):
        return bool(self.text_content and self.text_content.strip())

    @property
    def has_images(self):
        return len(self.pages) > 0

    @property
    def first_page_url(self):
        if self.pages and len(self.pages) > 0:
            return self.pages[0].file_path
        return None

    def to_dict(self):
        return {
            'id': self.id,
            'paper_id': self.paper_id,
            'upload_date': self.upload_date.strftime('%b %d, %Y') if self.upload_date else '',
            'contributor': self.contributor,
            'notes': self.notes or '',
            'question_number': self.question_number or 'General',
            'solution_type': self.solution_type or 'images',
            'text_content': self.text_content or '',
            'page_count': self.page_count,
            'has_text': self.has_text,
            'has_images': self.has_images,
            'pages': [p.to_dict() for p in self.pages]
        }


class SolutionPage(db.Model):
    __tablename__ = 'solution_page'
    
    id = db.Column(db.Integer, primary_key=True)
    solution_id = db.Column(db.Integer, db.ForeignKey('solution.id', ondelete='CASCADE'), nullable=False, index=True)
    file_path = db.Column(db.String(300), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'solution_id': self.solution_id,
            'file_path': self.file_path,
            'page_number': self.page_number
        }
