let currentPageIndex = 0;
let currentZoom = 1.0;
let paperPages = [];

document.addEventListener('DOMContentLoaded', function () {
    initPaperViewer();
    initSolutionViewers();
});

function initPaperViewer() {
    const mainImg = document.getElementById('mainDisplayImage');
    if (!mainImg) return;

    const thumbItems = document.querySelectorAll('.thumb-item, .thumb-item-pastel');
    const pageCounter = document.getElementById('pageCounter');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const floatingPrevBtn = document.getElementById('floatingPrevBtn');
    const floatingNextBtn = document.getElementById('floatingNextBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const fullScreenBtn = document.getElementById('fullScreenBtn');
    const downloadPageBtn = document.getElementById('downloadCurrentPageBtn');

    const fsModalElement = document.getElementById('fullscreenViewerModal');
    const fsModal = fsModalElement ? new bootstrap.Modal(fsModalElement) : null;
    const fsImage = document.getElementById('fullscreenModalImage');
    const fsZoomIn = document.getElementById('fsZoomIn');
    const fsZoomOut = document.getElementById('fsZoomOut');
    const fsZoomReset = document.getElementById('fsZoomReset');
    let fsZoom = 1.0;

    paperPages = Array.from(thumbItems).map((el, idx) => ({
        index: idx,
        pageId: el.getAttribute('data-page-id'),
        imageUrl: el.getAttribute('data-image-url'),
        downloadUrl: el.getAttribute('data-download-url'),
        element: el
    }));

    function showPage(index) {
        if (index < 0 || index >= paperPages.length) return;
        currentPageIndex = index;
        const page = paperPages[index];

        mainImg.style.opacity = '0.3';
        setTimeout(() => {
            mainImg.src = page.imageUrl;
            mainImg.style.opacity = '1';
        }, 120);

        if (pageCounter) {
            pageCounter.textContent = `Page ${index + 1} of ${paperPages.length}`;
        }
        if (downloadPageBtn) {
            downloadPageBtn.href = page.downloadUrl;
        }

        paperPages.forEach((p, i) => {
            if (i === index) {
                p.element.classList.add('active');
                p.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                p.element.classList.remove('active');
            }
        });

        if (prevBtn) prevBtn.disabled = (index === 0);
        if (nextBtn) nextBtn.disabled = (index === paperPages.length - 1);
        if (floatingPrevBtn) floatingPrevBtn.style.display = (index === 0) ? 'none' : 'flex';
        if (floatingNextBtn) floatingNextBtn.style.display = (index === paperPages.length - 1) ? 'none' : 'flex';
    }

    paperPages.forEach(p => {
        p.element.addEventListener('click', () => {
            showPage(p.index);
        });
    });

    if (prevBtn) prevBtn.addEventListener('click', () => showPage(currentPageIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showPage(currentPageIndex + 1));
    if (floatingPrevBtn) floatingPrevBtn.addEventListener('click', () => showPage(currentPageIndex - 1));
    if (floatingNextBtn) floatingNextBtn.addEventListener('click', () => showPage(currentPageIndex + 1));

    document.addEventListener('keydown', (e) => {

        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.key === 'ArrowLeft') {
            showPage(currentPageIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showPage(currentPageIndex + 1);
        }
    });

    function applyZoom() {
        mainImg.style.transformOrigin = 'center top';
        mainImg.style.transition = 'transform 0.15s ease-out';
        mainImg.style.transform = `scale(${currentZoom})`;
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (currentZoom < 2.5) {
                currentZoom += 0.25;
                applyZoom();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom > 0.5) {
                currentZoom -= 0.25;
                applyZoom();
            }
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            currentZoom = 1.0;
            applyZoom();
        });
    }

    if (fullScreenBtn && fsModal) {
        fullScreenBtn.addEventListener('click', () => {
            fsImage.src = paperPages[currentPageIndex].imageUrl;
            fsZoom = 1.0;
            fsImage.style.transform = `scale(${fsZoom})`;
            fsModal.show();
        });
    }

    if (fsZoomIn) {
        fsZoomIn.addEventListener('click', () => {
            fsZoom += 0.25;
            fsImage.style.transform = `scale(${fsZoom})`;
        });
    }

    if (fsZoomOut) {
        fsZoomOut.addEventListener('click', () => {
            if (fsZoom > 0.5) {
                fsZoom -= 0.25;
                fsImage.style.transform = `scale(${fsZoom})`;
            }
        });
    }

    if (fsZoomReset) {
        fsZoomReset.addEventListener('click', () => {
            fsZoom = 1.0;
            fsImage.style.transform = `scale(${fsZoom})`;
        });
    }

    showPage(0);
}

function switchSolutionPage(solId, imageUrl, downloadUrl, pageNum, totalPages, clickedEl) {
    const mainImg = document.getElementById(`sol-main-img-${solId}`);
    const downloadLink = document.getElementById(`sol-download-link-${solId}`);
    const indicator = document.querySelector(`.sol-page-indicator-${solId}`);

    if (mainImg) {
        mainImg.style.opacity = '0.3';
        setTimeout(() => {
            mainImg.src = imageUrl;
            mainImg.style.opacity = '1';
        }, 100);
    }

    if (downloadLink) {
        downloadLink.href = downloadUrl;
    }

    if (indicator) {
        indicator.textContent = `Page ${pageNum} of ${totalPages}`;
    }

    if (clickedEl) {
        const container = clickedEl.closest('.solution-thumb-strip');
        if (container) {
            container.querySelectorAll('.sol-thumb-box').forEach(box => {
                box.classList.remove('border-primary', 'shadow-sm', 'bg-white');
                box.classList.add('bg-light', 'opacity-75');
            });
            clickedEl.classList.add('border-primary', 'shadow-sm', 'bg-white');
            clickedEl.classList.remove('bg-light', 'opacity-75');
        }
    }
}

function initSolutionViewers() {

    document.querySelectorAll('.zoom-sol-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const imgId = this.getAttribute('data-img-id');
            const targetImg = document.getElementById(imgId);
            const fsModalElement = document.getElementById('fullscreenViewerModal');
            const fsImage = document.getElementById('fullscreenModalImage');

            if (targetImg && fsModalElement && fsImage) {
                const fsModal = new bootstrap.Modal(fsModalElement);
                fsImage.src = targetImg.src;
                fsImage.style.transform = 'scale(1)';
                fsModal.show();
            }
        });
    });
}
