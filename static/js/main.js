document.addEventListener('DOMContentLoaded', function () {
    initLiveSearch();
    initCourseAutocomplete();
    initPaperUploadFlow();
    initSolutionUploadFlow();
});

function initLiveSearch() {
    const searchInput = document.getElementById('liveSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const cards = document.querySelectorAll('.paper-card-item');
    const displayedCountBadge = document.getElementById('displayedCount');
    const noResultsBox = document.getElementById('noLiveSearchResults');
    const queryEcho = document.getElementById('liveSearchQueryEcho');

    if (!searchInput || !cards.length) return;

    function applyFilter() {
        const query = searchInput.value.trim().toLowerCase();
        let matchCount = 0;

        cards.forEach(card => {
            const courseName = card.getAttribute('data-course') || '';
            const isMatch = !query || courseName.includes(query);

            if (isMatch) {
                card.classList.remove('d-none');
                matchCount++;
            } else {
                card.classList.add('d-none');
            }
        });

        if (displayedCountBadge) {
            displayedCountBadge.textContent = matchCount;
        }

        if (noResultsBox) {
            if (matchCount === 0 && query) {
                noResultsBox.classList.remove('d-none');
                if (queryEcho) {
                    queryEcho.textContent = `No question papers found matching "${searchInput.value.trim()}".`;
                }
            } else {
                noResultsBox.classList.add('d-none');
            }
        }
    }

    searchInput.addEventListener('input', applyFilter);

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            searchInput.value = '';
            applyFilter();
            searchInput.focus();
        });
    }
}

function initCourseAutocomplete() {
    const courseInput = document.getElementById('paperCourse');
    const dataList = document.getElementById('courseSuggestions');

    if (!courseInput || !dataList) return;

    let debounceTimer;
    courseInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = courseInput.value.trim();

        debounceTimer = setTimeout(() => {
            fetch(`/api/courses?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(courses => {
                    dataList.innerHTML = '';
                    courses.forEach(c => {
                        const option = document.createElement('option');
                        option.value = c;
                        dataList.appendChild(option);
                    });
                })
                .catch(err => console.error('Error fetching courses:', err));
        }, 200);
    });
}

function initPaperUploadFlow() {
    const form = document.getElementById('uploadPaperForm');
    const fileInput = document.getElementById('paperFileInput');
    const dropZone = document.getElementById('paperDropZone');
    const previewContainer = document.getElementById('paperPreviewContainer');
    const previewGrid = document.getElementById('paperPreviews');
    const fileCountBadge = document.getElementById('fileCountBadge');
    const clearAllBtn = document.getElementById('clearAllPaperPagesBtn');
    const submitBtn = document.getElementById('submitPaperBtn');
    const forceInput = document.getElementById('paperForceUpload');

    const dupModalElement = document.getElementById('duplicateWarningModal');
    const dupModal = dupModalElement ? new bootstrap.Modal(dupModalElement) : null;
    const dupDetailsBox = document.getElementById('dupDetailsBox');
    const viewExistingBtn = document.getElementById('viewExistingPaperBtn');
    const proceedAnywayBtn = document.getElementById('proceedAnywayBtn');

    if (!form || !fileInput) return;

    let selectedFiles = [];

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    fileInput.addEventListener('change', function (e) {
        handleFiles(Array.from(e.target.files));
    });

    function handleFiles(files) {
        const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
        const newValidFiles = files.filter(f => validTypes.includes(f.type) || f.name.match(/\.(png|jpe?g|webp)$/i));

        selectedFiles = selectedFiles.concat(newValidFiles);
        renderPreviews();
    }

    function renderPreviews() {
        previewGrid.innerHTML = '';

        if (selectedFiles.length === 0) {
            previewContainer.classList.add('d-none');
            fileCountBadge.textContent = '0 pages';
            syncInputFiles();
            return;
        }

        previewContainer.classList.remove('d-none');
        fileCountBadge.textContent = `${selectedFiles.length} page${selectedFiles.length === 1 ? '' : 's'}`;

        selectedFiles.forEach((file, index) => {
            const col = document.createElement('div');
            col.className = 'col-sm-6 col-md-4';

            const card = document.createElement('div');
            card.className = 'preview-card';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = `Page ${index + 1}`;
            img.style.width = '48px';
            img.style.height = '48px';
            img.style.minWidth = '48px';
            img.style.maxWidth = '48px';
            img.style.maxHeight = '48px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '10px';
            img.style.flexShrink = '0';
            img.style.display = 'block';

            const info = document.createElement('div');
            info.className = 'flex-grow-1 overflow-hidden';
            info.innerHTML = `
                <div class="fw-bold small text-truncate">Page ${index + 1}</div>
                <div class="text-muted smaller text-truncate">${file.name}</div>
            `;

            const controls = document.createElement('div');
            controls.className = 'preview-controls';

            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.className = 'preview-btn';
                upBtn.title = 'Move Earlier';
                upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
                upBtn.addEventListener('click', () => {
                    const temp = selectedFiles[index];
                    selectedFiles[index] = selectedFiles[index - 1];
                    selectedFiles[index - 1] = temp;
                    renderPreviews();
                });
                controls.appendChild(upBtn);
            }

            if (index < selectedFiles.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.className = 'preview-btn';
                downBtn.title = 'Move Later';
                downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
                downBtn.addEventListener('click', () => {
                    const temp = selectedFiles[index];
                    selectedFiles[index] = selectedFiles[index + 1];
                    selectedFiles[index + 1] = temp;
                    renderPreviews();
                });
                controls.appendChild(downBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'preview-btn text-danger';
            removeBtn.title = 'Remove Page';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.addEventListener('click', () => {
                selectedFiles.splice(index, 1);
                renderPreviews();
            });
            controls.appendChild(removeBtn);

            card.appendChild(img);
            card.appendChild(info);
            card.appendChild(controls);
            col.appendChild(card);
            previewGrid.appendChild(col);
        });

        syncInputFiles();
    }

    function syncInputFiles() {
        const dt = new DataTransfer();
        selectedFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            selectedFiles = [];
            renderPreviews();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const course = document.getElementById('paperCourse').value.trim();
            const year = document.getElementById('paperYear').value.trim();
            const examType = document.getElementById('paperExamType').value.trim();

            if (!course || !year || !examType) {
                alert('Please fill out Course Name, Year, and Exam Type.');
                return;
            }

            if (selectedFiles.length === 0) {
                alert('Please upload at least one page image for the question paper.');
                return;
            }

            syncInputFiles();

            if (forceInput.value === 'true') {
                form.submit();
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Checking Duplicates...';

                const url = `/api/check-duplicate?course=${encodeURIComponent(course)}&year=${encodeURIComponent(year)}&exam_type=${encodeURIComponent(examType)}`;
                const response = await fetch(url);
                const data = await response.json();

                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Upload Question Paper';

                if (data.exists) {

                    if (dupDetailsBox) {
                        dupDetailsBox.innerHTML = `
                            <div class="fw-bold text-dark mb-1"><i class="fa-solid fa-circle-exclamation text-warning me-1"></i> Match Found in Database:</div>
                            <div class="text-secondary">Course: <strong>${data.course}</strong></div>
                            <div class="text-secondary">Exam: <strong>${data.exam_type} (${data.year})</strong></div>
                            <div class="text-secondary">Existing Pages: <strong>${data.page_count}</strong> | Solutions: <strong>${data.solution_count}</strong></div>
                        `;
                    }
                    if (viewExistingBtn) {
                        viewExistingBtn.href = `/paper/${data.paper_id}`;
                    }
                    if (dupModal) {
                        dupModal.show();
                    }
                } else {

                    form.submit();
                }
            } catch (err) {
                console.error('Error during duplicate check:', err);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Upload Question Paper';
                form.submit();
            }
        });
    }

    if (proceedAnywayBtn) {
        proceedAnywayBtn.addEventListener('click', function () {
            forceInput.value = 'true';
            if (dupModal) {
                dupModal.hide();
            }
            form.submit();
        });
    }
}

function initSolutionUploadFlow() {
    const form = document.getElementById('uploadSolutionForm');
    const solFileInput = document.getElementById('solFileInput');
    const solPreviewContainer = document.getElementById('solPreviewContainer');
    const solPreviewGrid = document.getElementById('solPreviews');
    const solFileCountBadge = document.getElementById('solFileCountBadge');
    const clearAllSolBtn = document.getElementById('clearAllSolPagesBtn');

    const modeTypeBtn = document.getElementById('modeTypeBtn');
    const modeUploadBtn = document.getElementById('modeUploadBtn');
    const typedSection = document.getElementById('typedSolutionSection');
    const uploadSection = document.getElementById('uploadImagesSection');
    const toggleAlsoAttachBtn = document.getElementById('toggleAlsoAttachImagesBtn');
    const toggleAlsoAddTextBtn = document.getElementById('toggleAlsoAddTextBtn');

    const solText = document.getElementById('solTextContent');
    const typedWordCount = document.getElementById('typedWordCount');
    const formatChips = document.querySelectorAll('.format-chip');

    if (!form) return;

    let solutionFiles = [];
    let currentMode = 'type';

    if (modeTypeBtn && modeUploadBtn) {
        modeTypeBtn.addEventListener('click', () => {
            currentMode = 'type';
            modeTypeBtn.classList.add('active');
            modeUploadBtn.classList.remove('active');
            if (typedSection) typedSection.classList.remove('d-none');
            if (uploadSection) uploadSection.classList.add('d-none');
            if (solText) solText.focus();
        });

        modeUploadBtn.addEventListener('click', () => {
            currentMode = 'upload';
            modeUploadBtn.classList.add('active');
            modeTypeBtn.classList.remove('active');
            if (uploadSection) uploadSection.classList.remove('d-none');
            if (typedSection) typedSection.classList.add('d-none');
        });
    }

    if (toggleAlsoAttachBtn && uploadSection) {
        toggleAlsoAttachBtn.addEventListener('click', () => {
            uploadSection.classList.toggle('d-none');
            const isHidden = uploadSection.classList.contains('d-none');
            toggleAlsoAttachBtn.innerHTML = isHidden
                ? '<i class="fa-solid fa-paperclip me-1"></i> Also attach handwritten diagrams or photos'
                : '<i class="fa-solid fa-minus me-1"></i> Hide image attachment section';
        });
    }

    if (toggleAlsoAddTextBtn && typedSection) {
        toggleAlsoAddTextBtn.addEventListener('click', () => {
            typedSection.classList.toggle('d-none');
            const isHidden = typedSection.classList.contains('d-none');
            toggleAlsoAddTextBtn.innerHTML = isHidden
                ? '<i class="fa-solid fa-pen me-1"></i> Also add written typed explanations'
                : '<i class="fa-solid fa-minus me-1"></i> Hide written solution section';
        });
    }

    if (solText && typedWordCount) {
        solText.addEventListener('input', () => {
            const val = solText.value.trim();
            const words = val ? val.split(/\s+/).length : 0;
            const chars = solText.value.length;
            typedWordCount.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} chars`;
        });
    }

    formatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (!solText) return;
            const format = chip.getAttribute('data-format');
            const start = solText.selectionStart;
            const end = solText.selectionEnd;
            const text = solText.value;

            let insertText = '';
            if (format === 'q-header') {
                insertText = '\n\n### Question: \n';
            } else if (format === 'ans') {
                insertText = '\nAnswer: ';
            } else if (format === 'bullet') {
                insertText = '\n• ';
            } else if (format === 'numbered') {
                insertText = '\n1. ';
            } else if (format === 'code') {
                insertText = '\n```\n// Code / equation here\n```\n';
            }

            solText.value = text.substring(0, start) + insertText + text.substring(end);
            solText.focus();
            solText.selectionStart = solText.selectionEnd = start + insertText.length;
            solText.dispatchEvent(new Event('input'));
        });
    });

    if (solFileInput && solPreviewGrid) {
        solFileInput.addEventListener('change', function (e) {
            const files = Array.from(e.target.files);
            const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
            const newFiles = files.filter(f => validTypes.includes(f.type) || f.name.match(/\.(png|jpe?g|webp)$/i));

            solutionFiles = solutionFiles.concat(newFiles);
            renderSolPreviews();
        });
    }

    function renderSolPreviews() {
        if (!solPreviewGrid) return;
        solPreviewGrid.innerHTML = '';

        if (solutionFiles.length === 0) {
            if (solPreviewContainer) solPreviewContainer.classList.add('d-none');
            if (solFileCountBadge) solFileCountBadge.textContent = '0 pages';
            syncSolInputFiles();
            return;
        }

        if (solPreviewContainer) solPreviewContainer.classList.remove('d-none');
        if (solFileCountBadge) solFileCountBadge.textContent = `${solutionFiles.length} page${solutionFiles.length === 1 ? '' : 's'}`;

        solutionFiles.forEach((file, index) => {
            const col = document.createElement('div');
            col.className = 'col-sm-6 col-md-4';

            const card = document.createElement('div');
            card.className = 'preview-card';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = `Sol Page ${index + 1}`;
            img.style.width = '48px';
            img.style.height = '48px';
            img.style.minWidth = '48px';
            img.style.maxWidth = '48px';
            img.style.maxHeight = '48px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '10px';
            img.style.flexShrink = '0';
            img.style.display = 'block';

            const info = document.createElement('div');
            info.className = 'flex-grow-1 overflow-hidden';
            info.innerHTML = `
                <div class="fw-bold small text-truncate">Page ${index + 1}</div>
                <div class="text-muted smaller text-truncate">${file.name}</div>
            `;

            const controls = document.createElement('div');
            controls.className = 'preview-controls';

            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.className = 'preview-btn';
                upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
                upBtn.addEventListener('click', () => {
                    const temp = solutionFiles[index];
                    solutionFiles[index] = solutionFiles[index - 1];
                    solutionFiles[index - 1] = temp;
                    renderSolPreviews();
                });
                controls.appendChild(upBtn);
            }

            if (index < solutionFiles.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.className = 'preview-btn';
                downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
                downBtn.addEventListener('click', () => {
                    const temp = solutionFiles[index];
                    solutionFiles[index] = solutionFiles[index + 1];
                    solutionFiles[index + 1] = temp;
                    renderSolPreviews();
                });
                controls.appendChild(downBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'preview-btn text-danger';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.addEventListener('click', () => {
                solutionFiles.splice(index, 1);
                renderSolPreviews();
            });
            controls.appendChild(removeBtn);

            card.appendChild(img);
            card.appendChild(info);
            card.appendChild(controls);
            col.appendChild(card);
            solPreviewGrid.appendChild(col);
        });

        syncSolInputFiles();
    }

    function syncSolInputFiles() {
        if (!solFileInput) return;
        const dt = new DataTransfer();
        solutionFiles.forEach(f => dt.items.add(f));
        solFileInput.files = dt.files;
    }

    if (clearAllSolBtn) {
        clearAllSolBtn.addEventListener('click', () => {
            solutionFiles = [];
            renderSolPreviews();
        });
    }

    form.addEventListener('submit', function (e) {
        syncSolInputFiles();
        const hasText = solText && solText.value.trim().length > 0;
        const hasImages = solutionFiles.length > 0;

        if (!hasText && !hasImages) {
            e.preventDefault();
            alert('Please type out your solution answers or upload solution page images.');
            if (solText) solText.focus();
        }
    });
}

window.copySolutionText = function(elementId, btn) {
    const textEl = document.getElementById(elementId);
    if (!textEl) return;
    const text = textEl.innerText || textEl.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        const originalText = span ? span.textContent : '';

        if (span) span.textContent = 'Copied!';
        if (icon) icon.className = 'fa-solid fa-check text-success me-1';

        setTimeout(() => {
            if (span) span.textContent = originalText;
            if (icon) icon.className = 'fa-regular fa-copy me-1';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
    });
};

document.addEventListener('DOMContentLoaded', function () {
    const guidelinesBtn = document.querySelector('.guidelines-toggle');
    const guidelinesModalEl = document.getElementById('imageGuidelinesModal');
    if (guidelinesBtn && guidelinesModalEl) {
        guidelinesBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = bootstrap.Modal.getOrCreateInstance(guidelinesModalEl);
            modal.show();
        });
    }
});
