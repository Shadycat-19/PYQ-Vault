# PYQ Vault - Previous Year Questions & Solutions Sharing Platform

A full-stack web application designed for students and educators to share, search, preview, and download past examination papers and verified solutions.

---

## Tech Stack
- **Backend**: Flask 3.1, Python 3.9+
- **Database**: SQLite with Flask-SQLAlchemy (with full ON DELETE CASCADE)
- **Frontend**: Jinja2 Templating, HTML5, CSS3, Bootstrap 5.3, Font Awesome 6
- **Imaging, Documents & Bundling**: Pillow (PIL), `pypdfium2`, `python-docx`, Python `zipfile`

---

## Key Features

### 1. Catalog & Real-time Search
- **Live Search**: Instant client-side and server-side filtering by course name/code.
- **Filters**: Dropdowns by **Upload Year**, **Exam Year**, and **Exam Type** (CT1, CT2, End Sem) with real-time responsive filtering.
- **Repository Statistics**: Real-time counter of total papers, community solutions, and indexed courses.
- **Empty States**: Helpful guidance when no papers or solutions are found.

### 2. Multi-Page Document & Format Support
- **PDF, Word (.docx), TXT & Image Uploads**: Upload papers directly as PDF or Word documents or scans/images. PDFs and DOCX are automatically converted into high-resolution viewable page images.
- **Original & PDF Downloads**: Download original uploaded files (.pdf, .docx, .txt), compiled multi-page PDFs, or individual page images.
- **High-Resolution Page Viewer**: Large interactive preview with Page X of Y indicators, zoom controls (+25%, -25%, reset), keyboard shortcuts, and full-screen view.
- **Sidebar Thumbnail Strip**: Fast jumping between pages with active page highlight.

### 3. Categorized Solutions & Simple Text Answers
- **Grouped by Question Number**: Solutions are neatly categorized by question (e.g. Question 1, Question 2, Full Paper). If a question has multiple answers, they are grouped together for clear comparison.
- **Quick Question Navigation**: Filter solution tabs by question (`All Questions`, `Q1`, `Q2`...).
- **Simple Text Answer Upload**: Direct type/paste text answers without needing to scan or upload images. Includes 1-click clipboard copy and `.txt` file download.
- **Handwritten & Multi-Page Solutions**: Upload handwritten image pages or PDF solutions with page reordering and thumbnail navigation.

### 4. Course Papers Bundle Download
- **All-Years Course Bundle**: One-click download of all question papers for any course across all available years in a neatly organized `.ZIP` archive with structured folders and manifest.

### 5. Upload Flows & Duplicate Detection
- **Paper Uploader**:
  - Dynamic course autocomplete suggestions based on existing catalog.
  - Multi-format file uploader (PDF, DOCX, TXT, PNG, JPG, WEBP).
  - Drag-and-drop support with document preview and page sequence reordering.
  - **Duplicate Detection**: Queries `/api/check-duplicate` before submission with duplicate warning modal.
- **Solution Uploader**:
  - Easy toggle between "Type / Paste Text Answer" and "Handwritten Images / PDF".
  - Quick question number selectors (Q1, Q2, Q3, Q4, Q5, Full Paper).
  - Contributor attribution and optional notes.

### 6. Downloads & Cascade Deletions
- Download original files (.pdf, .docx, .txt) and compiled PDF documents.
- Download all papers of a course across all years as a single `.ZIP`.
- Download solution text files or full solution page archives.
- Delete paper with cascade delete removing associated pages, original files, solutions, and disk files.

---

## Quick Start

### 1. Activate Virtual Environment
```bash
source venv/bin/activate
```

### 2. Run the Development Server
```bash
python3 app.py
```
Open your browser at [http://127.0.0.1:5002](http://127.0.0.1:5002).
