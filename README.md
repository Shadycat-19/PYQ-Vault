# PYQ Vault - Previous Year Questions & Solutions Sharing Platform

A full-stack web application designed for students and educators to share, search, preview, and download past examination papers and verified solutions.

---

## 🛠️ Tech Stack
- **Backend**: Flask 3.1, Python 3.9+
- **Database**: SQLite with Flask-SQLAlchemy (with full ON DELETE CASCADE)
- **Frontend**: Jinja2 Templating, HTML5, CSS3, Bootstrap 5.3, Font Awesome 6
- **Imaging & Bundling**: Pillow (PIL), Python `zipfile`

---

## 🚀 Key Features

### 1. Catalog & Real-time Search
- **Live Search**: Instant client-side and server-side filtering by course name/code.
- **Filters**: Dropdowns by **Year** and **Exam Type** (Midsem, Endsem, Quiz, Minor, Class Test) with quick reset.
- **Repository Statistics**: Real-time counter of total papers, community solutions, and indexed courses.
- **Empty States**: Helpful guidance when no papers or solutions are found.

### 2. Multi-Page Document Viewer
- **High-Resolution Page Viewer**: Large interactive preview with Page X of Y indicators.
- **Navigation**: Previous/Next buttons, keyboard navigation (Left/Right arrows), and floating navigation overlay.
- **Zoom & Fullscreen**: Zoom in (+25%), Zoom out (-25%), Reset, and full-screen modal view.
- **Sidebar Thumbnail Strip**: Fast jumping between pages with active page highlight.

### 3. Solution Sharing & Viewer
- Community solutions section on each paper.
- Multi-page solution viewer with dedicated thumbnails.
- Download individual solution pages or all solution pages as a `.ZIP` archive.
- Add Solution modal accessible directly from any paper detail page.

### 4. Upload Flows & Duplicate Detection
- **Paper Uploader**:
  - Dynamic course autocomplete suggestions based on existing catalog.
  - Multi-image file uploader (PNG, JPG, WEBP).
  - Drag-and-drop support with page sequence reordering (move up/down) and delete before upload.
  - **Duplicate Detection**: Queries `/api/check-duplicate` before submission. If an identical Course + Year + Exam Type exists, prompts a **Duplicate Warning Modal** with options to view the existing paper, cancel, or proceed anyway.
- **Solution Uploader**:
  - Multi-page image upload with reordering and contributor attribution.

### 5. Downloads & Cascade Deletions
- Download individual page images.
- Stream dynamic `.ZIP` archives of full papers and solutions on the fly.
- Delete paper with cascade delete removing associated pages, solutions, and disk files.

---

## ⚡ Quick Start

### 1. Activate Virtual Environment
```bash
source venv/bin/activate
```

### 2. Run the Development Server
```bash
python3 app.py
```
Open your browser at [http://127.0.0.1:5002](http://127.0.0.1:5002).
