import os
import io
import uuid
import zipfile
from datetime import datetime
from flask import (
    Flask, render_template, request, redirect, url_for, flash, 
    jsonify, send_file, abort
)
from werkzeug.utils import secure_filename

from config import Config
from models import db, Paper, PaperPage, Solution, SolutionPage

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    os.makedirs(app.config['PAPERS_UPLOAD_DIR'], exist_ok=True)
    os.makedirs(app.config['SOLUTIONS_UPLOAD_DIR'], exist_ok=True)

    with app.app_context():
        db.create_all()
        for col, col_type in [('text_content', 'TEXT'), ('solution_type', 'VARCHAR(20) DEFAULT "images"')]:
            try:
                db.session.execute(db.text(f"ALTER TABLE solution ADD COLUMN {col} {col_type}"))
                db.session.commit()
            except Exception:
                db.session.rollback()

    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    def remove_file_safely(relative_path):
        if not relative_path:
            return
        clean_rel = relative_path.replace('static/', '', 1) if relative_path.startswith('static/') else relative_path
        abs_path = os.path.join(app.root_path, 'static', clean_rel)
        if os.path.exists(abs_path) and os.path.isfile(abs_path):
            try:
                os.remove(abs_path)
            except Exception as e:
                app.logger.warning(f"Error deleting file {abs_path}: {e}")

    @app.route('/')
    def index():
        query_course = request.args.get('course', '').strip()
        query_year = request.args.get('year', '').strip()
        query_exam = request.args.get('exam_type', '').strip()

        paper_query = Paper.query

        if query_course:
            paper_query = paper_query.filter(Paper.course.ilike(f'%{query_course}%'))
        if query_year:
            try:
                paper_query = paper_query.filter(Paper.year == int(query_year))
            except ValueError:
                pass
        if query_exam:
            paper_query = paper_query.filter(Paper.exam_type == query_exam)

        papers = paper_query.order_by(Paper.upload_date.desc()).all()

        all_courses = db.session.query(Paper.course).distinct().order_by(Paper.course).all()
        distinct_courses = [c[0] for c in all_courses]

        all_years = db.session.query(Paper.year).distinct().order_by(Paper.year.desc()).all()
        distinct_years = [y[0] for y in all_years]

        all_exams = db.session.query(Paper.exam_type).distinct().order_by(Paper.exam_type).all()
        distinct_exams = [e[0] for e in all_exams]

        standard_exams = ['CT1', 'CT2', 'End Sem']
        for exam in standard_exams:
            if exam not in distinct_exams:
                distinct_exams.append(exam)

        stats = {
            'total_papers': Paper.query.count(),
            'total_solutions': Solution.query.count(),
            'total_courses': len(distinct_courses)
        }

        current_year = datetime.now().year
        year_choices = list(range(current_year, 2014, -1))

        return render_template(
            'index.html',
            papers=papers,
            stats=stats,
            distinct_courses=distinct_courses,
            distinct_years=distinct_years,
            distinct_exams=distinct_exams,
            year_choices=year_choices,
            selected_course=query_course,
            selected_year=query_year,
            selected_exam=query_exam
        )

    @app.route('/api/courses')
    def api_courses():
        q = request.args.get('q', '').strip()
        query = db.session.query(Paper.course).distinct()
        if q:
            query = query.filter(Paper.course.ilike(f'%{q}%'))
        courses = [c[0] for c in query.order_by(Paper.course).limit(10).all()]
        return jsonify(courses)

    @app.route('/api/check-duplicate')
    def api_check_duplicate():
        course = request.args.get('course', '').strip()
        year = request.args.get('year', '').strip()
        exam_type = request.args.get('exam_type', '').strip()

        if not (course and year and exam_type):
            return jsonify({'exists': False})

        try:
            year_int = int(year)
        except ValueError:
            return jsonify({'exists': False})

        existing = Paper.query.filter(
            Paper.course.ilike(course),
            Paper.year == year_int,
            Paper.exam_type.ilike(exam_type)
        ).first()

        if existing:
            return jsonify({
                'exists': True,
                'paper_id': existing.id,
                'course': existing.course,
                'year': existing.year,
                'exam_type': existing.exam_type,
                'page_count': existing.page_count,
                'solution_count': existing.solution_count,
                'message': f"A paper for '{existing.course}' ({existing.exam_type} {existing.year}) already exists with {existing.page_count} page(s) and {existing.solution_count} solution(s)."
            })
        
        return jsonify({'exists': False})

    @app.route('/api/papers')
    def api_papers():
        q = request.args.get('q', '').strip()
        year = request.args.get('year', '').strip()
        exam = request.args.get('exam_type', '').strip()

        query = Paper.query
        if q:
            query = query.filter(Paper.course.ilike(f'%{q}%'))
        if year:
            try:
                query = query.filter(Paper.year == int(year))
            except ValueError:
                pass
        if exam:
            query = query.filter(Paper.exam_type == exam)

        papers = query.order_by(Paper.upload_date.desc()).all()
        return jsonify([p.to_dict() for p in papers])

    @app.route('/paper/<int:paper_id>')
    def paper_detail(paper_id):
        paper = db.get_or_404(Paper, paper_id)
        return render_template('paper_detail.html', paper=paper)

    @app.route('/paper/upload', methods=['POST'])
    def upload_paper():
        course = request.form.get('course', '').strip()
        year = request.form.get('year', '').strip()
        exam_type = request.form.get('exam_type', '').strip()
        force = request.form.get('force', 'false').lower() == 'true'

        if not course or not year or not exam_type:
            flash('Please complete all required fields (Course, Year, Exam Type).', 'danger')
            return redirect(url_for('index'))

        try:
            year_int = int(year)
        except ValueError:
            flash('Invalid year provided.', 'danger')
            return redirect(url_for('index'))

        if not force:
            existing = Paper.query.filter(
                Paper.course.ilike(course),
                Paper.year == year_int,
                Paper.exam_type.ilike(exam_type)
            ).first()
            if existing:
                flash(f"Paper for {course} ({exam_type} {year_int}) already exists. Duplicate warning triggered.", 'warning')
                return redirect(url_for('paper_detail', paper_id=existing.id))

        uploaded_files = request.files.getlist('paper_files')
        valid_files = [f for f in uploaded_files if f and f.filename and allowed_file(f.filename)]

        if not valid_files:
            flash('Please select at least one valid question paper image (PNG, JPG, WEBP).', 'danger')
            return redirect(url_for('index'))

        new_paper = Paper(
            course=course,
            year=year_int,
            exam_type=exam_type,
            upload_date=datetime.utcnow()
        )
        db.session.add(new_paper)
        db.session.flush()

        for idx, file in enumerate(valid_files, start=1):
            original_ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"paper_{new_paper.id}_p{idx}_{uuid.uuid4().hex[:8]}.{original_ext}"
            file_path = os.path.join(app.config['PAPERS_UPLOAD_DIR'], unique_filename)
            file.save(file_path)

            rel_path = f"uploads/papers/{unique_filename}"
            paper_page = PaperPage(
                paper_id=new_paper.id,
                file_path=rel_path,
                page_number=idx
            )
            db.session.add(paper_page)

        db.session.commit()
        flash(f"Question Paper for '{course}' ({exam_type} {year_int}) uploaded successfully with {len(valid_files)} page(s)!", 'success')
        return redirect(url_for('paper_detail', paper_id=new_paper.id))

    @app.route('/paper/<int:paper_id>/solution/upload', methods=['POST'])
    def upload_solution(paper_id):
        paper = db.get_or_404(Paper, paper_id)
        contributor = request.form.get('contributor', '').strip() or 'Community Contributor'
        notes = request.form.get('notes', '').strip()
        text_content = request.form.get('text_content', '').strip()

        uploaded_files = request.files.getlist('solution_files')
        valid_files = [f for f in uploaded_files if f and f.filename and allowed_file(f.filename)]

        if not valid_files and not text_content:
            flash('Please upload solution page images or type out your solution answers.', 'danger')
            return redirect(url_for('paper_detail', paper_id=paper.id))

        if valid_files and text_content:
            actual_type = 'both'
        elif text_content:
            actual_type = 'text'
        else:
            actual_type = 'images'

        new_solution = Solution(
            paper_id=paper.id,
            contributor=contributor,
            notes=notes,
            solution_type=actual_type,
            text_content=text_content if text_content else None,
            upload_date=datetime.utcnow()
        )
        db.session.add(new_solution)
        db.session.flush()

        for idx, file in enumerate(valid_files, start=1):
            original_ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"sol_{new_solution.id}_p{idx}_{uuid.uuid4().hex[:8]}.{original_ext}"
            file_path = os.path.join(app.config['SOLUTIONS_UPLOAD_DIR'], unique_filename)
            file.save(file_path)

            rel_path = f"uploads/solutions/{unique_filename}"
            solution_page = SolutionPage(
                solution_id=new_solution.id,
                file_path=rel_path,
                page_number=idx
            )
            db.session.add(solution_page)

        db.session.commit()
        if actual_type == 'text':
            flash("Typed solution submitted successfully! Thank you for contributing.", 'success')
        elif actual_type == 'both':
            flash(f"Comprehensive solution (typed answers + {len(valid_files)} image pages) submitted successfully!", 'success')
        else:
            flash(f"Solution with {len(valid_files)} page(s) submitted successfully!", 'success')
        return redirect(url_for('paper_detail', paper_id=paper.id) + '#solutions')

    @app.route('/paper/<int:paper_id>/delete', methods=['POST'])
    def delete_paper(paper_id):
        paper = db.get_or_404(Paper, paper_id)
        course_name = paper.course

        for solution in paper.solutions:
            for sp in solution.pages:
                remove_file_safely(sp.file_path)

        for pp in paper.pages:
            remove_file_safely(pp.file_path)

        db.session.delete(paper)
        db.session.commit()
        flash(f"Paper '{course_name}' and all associated pages & solutions have been permanently deleted.", 'info')
        return redirect(url_for('index'))

    @app.route('/solution/<int:solution_id>/delete', methods=['POST'])
    def delete_solution(solution_id):
        solution = db.get_or_404(Solution, solution_id)
        paper_id = solution.paper_id

        for sp in solution.pages:
            remove_file_safely(sp.file_path)

        db.session.delete(solution)
        db.session.commit()
        flash("Solution deleted successfully.", 'info')
        return redirect(url_for('paper_detail', paper_id=paper_id) + '#solutions')

    @app.route('/paper/<int:paper_id>/page/<int:page_id>/download')
    def download_paper_page(paper_id, page_id):
        paper = db.get_or_404(Paper, paper_id)
        page = PaperPage.query.filter_by(id=page_id, paper_id=paper.id).first_or_404()
        clean_rel = page.file_path.replace('static/', '', 1) if page.file_path.startswith('static/') else page.file_path
        abs_path = os.path.join(app.root_path, 'static', clean_rel)

        if not os.path.exists(abs_path):
            abort(404, description="Page file not found.")

        ext = abs_path.rsplit('.', 1)[-1]
        download_name = f"{secure_filename(paper.course)}_{paper.exam_type}_{paper.year}_page_{page.page_number}.{ext}"
        return send_file(abs_path, as_attachment=True, download_name=download_name)

    @app.route('/paper/<int:paper_id>/download-zip')
    def download_paper_zip(paper_id):
        paper = db.get_or_404(Paper, paper_id)
        if not paper.pages:
            flash("No pages available in this paper to download.", 'warning')
            return redirect(url_for('paper_detail', paper_id=paper.id))

        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for page in paper.pages:
                clean_rel = page.file_path.replace('static/', '', 1) if page.file_path.startswith('static/') else page.file_path
                abs_path = os.path.join(app.root_path, 'static', clean_rel)
                if os.path.exists(abs_path):
                    ext = abs_path.rsplit('.', 1)[-1]
                    archive_name = f"{secure_filename(paper.course)}_{paper.exam_type}_{paper.year}_page_{page.page_number:02d}.{ext}"
                    zf.write(abs_path, arcname=archive_name)

        memory_file.seek(0)
        zip_filename = f"{secure_filename(paper.course)}_{paper.exam_type}_{paper.year}_full_paper.zip"
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )

    @app.route('/solution/<int:solution_id>/page/<int:page_id>/download')
    def download_solution_page(solution_id, page_id):
        solution = db.get_or_404(Solution, solution_id)
        page = SolutionPage.query.filter_by(id=page_id, solution_id=solution.id).first_or_404()
        clean_rel = page.file_path.replace('static/', '', 1) if page.file_path.startswith('static/') else page.file_path
        abs_path = os.path.join(app.root_path, 'static', clean_rel)

        if not os.path.exists(abs_path):
            abort(404, description="Solution page file not found.")

        ext = abs_path.rsplit('.', 1)[-1]
        paper = solution.paper
        download_name = f"{secure_filename(paper.course)}_{paper.exam_type}_{paper.year}_solution_{solution.id}_p{page.page_number}.{ext}"
        return send_file(abs_path, as_attachment=True, download_name=download_name)

    @app.route('/solution/<int:solution_id>/download-zip')
    def download_solution_zip(solution_id):
        solution = db.get_or_404(Solution, solution_id)
        paper = solution.paper
        if not solution.pages:
            flash("No pages available for this solution.", 'warning')
            return redirect(url_for('paper_detail', paper_id=paper.id))

        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for page in solution.pages:
                clean_rel = page.file_path.replace('static/', '', 1) if page.file_path.startswith('static/') else page.file_path
                abs_path = os.path.join(app.root_path, 'static', clean_rel)
                if os.path.exists(abs_path):
                    ext = abs_path.rsplit('.', 1)[-1]
                    archive_name = f"solution_{solution.id}_page_{page.page_number:02d}.{ext}"
                    zf.write(abs_path, arcname=archive_name)

        memory_file.seek(0)
        zip_filename = f"{secure_filename(paper.course)}_{paper.exam_type}_{paper.year}_solution_{solution.id}.zip"
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )

    @app.route('/solution/<int:solution_id>/download-text')
    def download_solution_text(solution_id):
        solution = db.get_or_404(Solution, solution_id)
        if not solution.text_content:
            flash('This solution does not have typed text answers.', 'warning')
            return redirect(url_for('paper_detail', paper_id=solution.paper_id))

        paper = solution.paper
        header = f"PYQ Vault - Solution for {paper.course}\n"
        header += f"Exam: {paper.exam_type} {paper.year}\n"
        header += f"Contributor: {solution.contributor}\n"
        header += f"Date: {solution.upload_date.strftime('%Y-%m-%d %H:%M') if solution.upload_date else 'N/A'}\n"
        if solution.notes:
            header += f"Notes: {solution.notes}\n"
        header += "=" * 60 + "\n\n"

        full_content = header + solution.text_content
        text_io = io.BytesIO(full_content.encode('utf-8'))
        safe_course = "".join(c for c in paper.course if c.isalnum() or c in (' ', '_', '-')).strip()
        filename = f"{safe_course}_{paper.exam_type}_{paper.year}_solution_{solution.id}.txt"
        return send_file(
            text_io,
            as_attachment=True,
            download_name=filename,
            mimetype='text/plain'
        )

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"Starting PYQ Vault server on http://127.0.0.1:{port} (host: 0.0.0.0)")
    app.run(debug=True, host='0.0.0.0', port=port)
