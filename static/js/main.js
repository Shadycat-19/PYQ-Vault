document.addEventListener("DOMContentLoaded", function () {
  initLiveSearch();
  initCourseAutocomplete();
  initPaperUploadFlow();
  initSolutionUploadFlow();
});

function initLiveSearch() {
  const searchInput = document.getElementById("liveSearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const cards = document.querySelectorAll(".paper-card-item");
  const displayedCountBadge = document.getElementById("displayedCount");
  const noResultsBox = document.getElementById("noLiveSearchResults");
  const queryEcho = document.getElementById("liveSearchQueryEcho");

  if (!searchInput || !cards.length) return;

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    let matchCount = 0;

    cards.forEach((card) => {
      const courseName = card.getAttribute("data-course") || "";
      const isMatch = !query || courseName.includes(query);

      if (isMatch) {
        card.classList.remove("d-none");
        matchCount++;
      } else {
        card.classList.add("d-none");
      }
    });

    if (displayedCountBadge) {
      displayedCountBadge.textContent = matchCount;
    }

    if (noResultsBox) {
      if (matchCount === 0 && query) {
        noResultsBox.classList.remove("d-none");
        if (queryEcho) {
          queryEcho.textContent = `No question papers found matching "${searchInput.value.trim()}".`;
        }
      } else {
        noResultsBox.classList.add("d-none");
      }
    }
  }

  searchInput.addEventListener("input", applyFilter);

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      applyFilter();
      searchInput.focus();
    });
  }
}

function initCourseAutocomplete() {
  const courseInput = document.getElementById("paperCourse");
  const dataList = document.getElementById("courseSuggestions");

  if (!courseInput || !dataList) return;

  let debounceTimer;
  courseInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    const query = courseInput.value.trim();

    debounceTimer = setTimeout(() => {
      fetch(`/api/courses?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((courses) => {
          dataList.innerHTML = "";
          courses.forEach((c) => {
            const option = document.createElement("option");
            option.value = c;
            dataList.appendChild(option);
          });
        })
        .catch((err) => console.error("Error fetching courses:", err));
    }, 200);
  });
}

function initPaperUploadFlow() {
  const form = document.getElementById("uploadPaperForm");
  const fileInput = document.getElementById("paperFileInput");
  const dropZone = document.getElementById("paperDropZone");
  const previewContainer = document.getElementById("paperPreviewContainer");
  const previewGrid = document.getElementById("paperPreviews");
  const fileCountBadge = document.getElementById("fileCountBadge");
  const clearAllBtn = document.getElementById("clearAllPaperPagesBtn");
  const submitBtn = document.getElementById("submitPaperBtn");
  const forceInput = document.getElementById("paperForceUpload");

  const dupModalElement = document.getElementById("duplicateWarningModal");
  const dupModal = dupModalElement
    ? new bootstrap.Modal(dupModalElement)
    : null;
  const dupDetailsBox = document.getElementById("dupDetailsBox");
  const viewExistingBtn = document.getElementById("viewExistingPaperBtn");
  const proceedAnywayBtn = document.getElementById("proceedAnywayBtn");

  if (!form || !fileInput) return;

  let selectedFiles = [];

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
      },
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
      },
      false,
    );
  });

  fileInput.addEventListener("change", function (e) {
    handleFiles(Array.from(e.target.files));
  });

  function handleFiles(files) {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    const newValidFiles = files.filter(
      (f) =>
        validTypes.includes(f.type) || f.name.match(/\.(png|jpe?g|webp)$/i),
    );

    selectedFiles = selectedFiles.concat(newValidFiles);
    renderPreviews();
  }

  function renderPreviews() {
    previewGrid.innerHTML = "";

    if (selectedFiles.length === 0) {
      previewContainer.classList.add("d-none");
      fileCountBadge.textContent = "0 pages";
      syncInputFiles();
      return;
    }

    previewContainer.classList.remove("d-none");
    fileCountBadge.textContent = `${selectedFiles.length} page${selectedFiles.length === 1 ? "" : "s"}`;

    selectedFiles.forEach((file, index) => {
      const col = document.createElement("div");
      col.className = "col-sm-6 col-md-4";

      const card = document.createElement("div");
      card.className = "preview-card";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = `Page ${index + 1}`;
      img.style.width = "48px";
      img.style.height = "48px";
      img.style.minWidth = "48px";
      img.style.maxWidth = "48px";
      img.style.maxHeight = "48px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "10px";
      img.style.flexShrink = "0";
      img.style.display = "block";

      const info = document.createElement("div");
      info.className = "flex-grow-1 overflow-hidden";
      info.innerHTML = `
                <div class="fw-bold small text-truncate">Page ${index + 1}</div>
                <div class="text-muted smaller text-truncate">${file.name}</div>
            `;

      const controls = document.createElement("div");
      controls.className = "preview-controls";

      if (index > 0) {
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "preview-btn";
        upBtn.title = "Move Earlier";
        upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        upBtn.addEventListener("click", () => {
          const temp = selectedFiles[index];
          selectedFiles[index] = selectedFiles[index - 1];
          selectedFiles[index - 1] = temp;
          renderPreviews();
        });
        controls.appendChild(upBtn);
      }

      if (index < selectedFiles.length - 1) {
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "preview-btn";
        downBtn.title = "Move Later";
        downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        downBtn.addEventListener("click", () => {
          const temp = selectedFiles[index];
          selectedFiles[index] = selectedFiles[index + 1];
          selectedFiles[index + 1] = temp;
          renderPreviews();
        });
        controls.appendChild(downBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "preview-btn text-danger";
      removeBtn.title = "Remove Page";
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener("click", () => {
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
    selectedFiles.forEach((f) => dt.items.add(f));
    fileInput.files = dt.files;
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      selectedFiles = [];
      renderPreviews();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      const course = document.getElementById("paperCourse").value.trim();
      const year = document.getElementById("paperYear").value.trim();
      const examType = document.getElementById("paperExamType").value.trim();

      if (!course || !year || !examType) {
        alert("Please fill out Course Name, Year, and Exam Type.");
        return;
      }

      if (selectedFiles.length === 0) {
        alert("Please upload at least one page image for the question paper.");
        return;
      }

      syncInputFiles();

      if (forceInput.value === "true") {
        form.submit();
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin me-1"></i> Checking Duplicates...';

        const url = `/api/check-duplicate?course=${encodeURIComponent(course)}&year=${encodeURIComponent(year)}&exam_type=${encodeURIComponent(examType)}`;
        const response = await fetch(url);
        const data = await response.json();

        submitBtn.disabled = false;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-check me-1"></i> Upload Question Paper';

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
        console.error("Error during duplicate check:", err);
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-check me-1"></i> Upload Question Paper';
        form.submit();
      }
    });
  }

  if (proceedAnywayBtn) {
    proceedAnywayBtn.addEventListener("click", function () {
      forceInput.value = "true";
      if (dupModal) {
        dupModal.hide();
      }
      form.submit();
    });
  }
}

function initSolutionUploadFlow() {
  const form = document.getElementById("uploadSolutionForm");
  const solFileInput = document.getElementById("solFileInput");
  const solPreviewContainer = document.getElementById("solPreviewContainer");
  const solPreviewGrid = document.getElementById("solPreviews");
  const solFileCountBadge = document.getElementById("solFileCountBadge");
  const clearAllSolBtn = document.getElementById("clearAllSolPagesBtn");

  if (!form) return;

  let solutionFiles = [];

  const validTypes = ["image/png", "image/jpeg", "image/webp"];
  const validExtensions = /\.(png|jpe?g|webp)$/i;

  // Select handwritten solution images
  if (solFileInput && solPreviewGrid) {
    solFileInput.addEventListener("change", function () {
      const selectedFiles = Array.from(solFileInput.files);

      const validFiles = selectedFiles.filter(
        (file) =>
          validTypes.includes(file.type) ||
          (!file.type && validExtensions.test(file.name)),
      );

      const invalidCount = selectedFiles.length - validFiles.length;

      if (invalidCount > 0) {
        alert(
          "Some files were skipped. Please select PNG, JPG, or WEBP images only.",
        );
      }

      solutionFiles = solutionFiles.concat(validFiles);

      renderSolPreviews();
    });
  }

  // Render image previews and page controls
  function renderSolPreviews() {
    if (!solPreviewGrid) return;

    solPreviewGrid.innerHTML = "";

    if (solutionFiles.length === 0) {
      if (solPreviewContainer) {
        solPreviewContainer.classList.add("d-none");
      }

      if (solFileCountBadge) {
        solFileCountBadge.textContent = "0 pages";
      }

      syncSolInputFiles();
      return;
    }

    if (solPreviewContainer) {
      solPreviewContainer.classList.remove("d-none");
    }

    if (solFileCountBadge) {
      solFileCountBadge.textContent = `${solutionFiles.length} page${solutionFiles.length === 1 ? "" : "s"}`;
    }

    solutionFiles.forEach((file, index) => {
      const col = document.createElement("div");
      col.className = "col-sm-6 col-md-4";

      const card = document.createElement("div");
      card.className = "preview-card";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = `Solution Page ${index + 1}`;
      img.style.width = "48px";
      img.style.height = "48px";
      img.style.minWidth = "48px";
      img.style.maxWidth = "48px";
      img.style.maxHeight = "48px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "10px";
      img.style.flexShrink = "0";
      img.style.display = "block";

      const info = document.createElement("div");
      info.className = "flex-grow-1 overflow-hidden";

      const pageLabel = document.createElement("div");
      pageLabel.className = "fw-bold small text-truncate";
      pageLabel.textContent = `Page ${index + 1}`;

      const fileLabel = document.createElement("div");
      fileLabel.className = "text-muted smaller text-truncate";
      fileLabel.textContent = file.name;

      info.appendChild(pageLabel);
      info.appendChild(fileLabel);

      const controls = document.createElement("div");
      controls.className = "preview-controls";

      // Move page up
      if (index > 0) {
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "preview-btn";
        upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        upBtn.setAttribute("aria-label", `Move page ${index + 1} up`);

        upBtn.addEventListener("click", () => {
          [solutionFiles[index - 1], solutionFiles[index]] = [
            solutionFiles[index],
            solutionFiles[index - 1],
          ];

          renderSolPreviews();
        });

        controls.appendChild(upBtn);
      }

      // Move page down
      if (index < solutionFiles.length - 1) {
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "preview-btn";
        downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        downBtn.setAttribute("aria-label", `Move page ${index + 1} down`);

        downBtn.addEventListener("click", () => {
          [solutionFiles[index], solutionFiles[index + 1]] = [
            solutionFiles[index + 1],
            solutionFiles[index],
          ];

          renderSolPreviews();
        });

        controls.appendChild(downBtn);
      }

      // Remove page
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "preview-btn text-danger";
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.setAttribute("aria-label", `Remove page ${index + 1}`);

      removeBtn.addEventListener("click", () => {
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

  // Keep the actual file input synchronized with the displayed order
  function syncSolInputFiles() {
    if (!solFileInput) return;

    const dataTransfer = new DataTransfer();

    solutionFiles.forEach((file) => {
      dataTransfer.items.add(file);
    });

    solFileInput.files = dataTransfer.files;
  }

  // Clear all selected images
  if (clearAllSolBtn) {
    clearAllSolBtn.addEventListener("click", () => {
      solutionFiles = [];
      renderSolPreviews();
    });
  }

  // Require at least one handwritten solution image
  form.addEventListener("submit", function (event) {
    syncSolInputFiles();

    if (solutionFiles.length === 0) {
      event.preventDefault();
      alert("Please upload at least one handwritten solution image.");

      if (solFileInput) {
        solFileInput.click();
      }
    }
  });
}

window.copySolutionText = function (elementId, btn) {
  const textEl = document.getElementById(elementId);
  if (!textEl) return;
  const text = textEl.innerText || textEl.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const span = btn.querySelector("span");
      const icon = btn.querySelector("i");
      const originalText = span ? span.textContent : "";

      if (span) span.textContent = "Copied!";
      if (icon) icon.className = "fa-solid fa-check text-success me-1";

      setTimeout(() => {
        if (span) span.textContent = originalText;
        if (icon) icon.className = "fa-regular fa-copy me-1";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy text:", err);
    });
};

document.addEventListener("DOMContentLoaded", function () {
  const guidelinesBtn = document.querySelector(".guidelines-toggle");
  const guidelinesModalEl = document.getElementById("imageGuidelinesModal");
  if (guidelinesBtn && guidelinesModalEl) {
    guidelinesBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const modal = bootstrap.Modal.getOrCreateInstance(guidelinesModalEl);
      modal.show();
    });
  }
});
