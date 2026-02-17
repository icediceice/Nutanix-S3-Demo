/* ======================================================
   NKP Gallery — Client-Side Logic
   ====================================================== */

(function () {
  "use strict";

  // DOM refs
  const galleryGrid    = document.getElementById("galleryGrid");
  const emptyState     = document.getElementById("emptyState");
  const statCount      = document.getElementById("statCount");
  const statusDot      = document.getElementById("statusDot");
  const statusText     = document.getElementById("statusText");
  const uploadModal    = document.getElementById("uploadModal");
  const dropZone       = document.getElementById("dropZone");
  const fileInput      = document.getElementById("fileInput");
  const uploadProgress = document.getElementById("uploadProgress");
  const progressFill   = document.getElementById("progressFill");
  const progressText   = document.getElementById("progressText");
  const uploadResults  = document.getElementById("uploadResults");

  // Open modal from both buttons
  document.getElementById("btnUpload").addEventListener("click", openModal);
  document.getElementById("btnUploadEmpty").addEventListener("click", openModal);
  document.getElementById("modalClose").addEventListener("click", closeModal);
  uploadModal.addEventListener("click", function (e) {
    if (e.target === uploadModal) closeModal();
  });

  // ----- Health check -----

  function checkHealth() {
    fetch("/api/health")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status === "healthy") {
          statusDot.className = "status-dot status-dot--ok";
          statusText.textContent = "Connected to NUS Object Store";
        } else {
          statusDot.className = "status-dot status-dot--error";
          statusText.textContent = "S3 Disconnected";
        }
      })
      .catch(function () {
        statusDot.className = "status-dot status-dot--error";
        statusText.textContent = "S3 Disconnected";
      });
  }

  // ----- Gallery loading -----

  function loadGallery() {
    fetch("/api/images")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          galleryGrid.innerHTML = "";
          emptyState.style.display = "block";
          statCount.textContent = "0";
          return;
        }
        statCount.textContent = data.count;
        if (data.count === 0) {
          galleryGrid.innerHTML = "";
          emptyState.style.display = "block";
          return;
        }
        emptyState.style.display = "none";
        renderGallery(data.images);
      })
      .catch(function () {
        galleryGrid.innerHTML = "";
        emptyState.style.display = "block";
        statCount.textContent = "—";
      });
  }

  function renderGallery(images) {
    galleryGrid.innerHTML = "";
    images.forEach(function (img, i) {
      var card = document.createElement("div");
      card.className = "image-card";
      card.style.animationDelay = (i * 50) + "ms";

      var sizeStr = formatSize(img.size);

      card.innerHTML =
        '<img class="thumb" src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.filename) + '" loading="lazy">' +
        '<div class="card-info">' +
          '<div class="card-meta">' +
            '<span class="card-filename" title="' + escapeHtml(img.filename) + '">' + escapeHtml(img.filename) + '</span>' +
            '<span class="card-size">' + sizeStr + '</span>' +
          '</div>' +
          '<button class="btn-delete" data-key="' + escapeHtml(img.key) + '" title="Delete">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</div>';

      galleryGrid.appendChild(card);
    });

    // Attach delete handlers
    galleryGrid.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () { handleDeleteClick(btn); });
    });
  }

  function handleDeleteClick(btn) {
    var key = btn.getAttribute("data-key");
    var infoDiv = btn.closest(".card-info");

    // Show inline confirmation
    var meta = infoDiv.querySelector(".card-meta");
    var originalHTML = meta.innerHTML;
    meta.innerHTML =
      '<div class="confirm-delete">' +
        '<span>Delete?</span>' +
        '<button class="btn-confirm-yes">Yes</button>' +
        '<button class="btn-confirm-no">No</button>' +
      '</div>';

    meta.querySelector(".btn-confirm-no").addEventListener("click", function () {
      meta.innerHTML = originalHTML;
    });

    meta.querySelector(".btn-confirm-yes").addEventListener("click", function () {
      fetch("/api/delete/" + encodeURIComponent(key), { method: "DELETE" })
        .then(function (r) { return r.json(); })
        .then(function () { loadGallery(); })
        .catch(function () { meta.innerHTML = originalHTML; });
    });
  }

  // ----- Upload -----

  function openModal() {
    uploadModal.classList.add("active");
    uploadProgress.style.display = "none";
    uploadResults.style.display = "none";
    uploadResults.innerHTML = "";
    progressFill.style.width = "0%";
  }

  function closeModal() {
    uploadModal.classList.remove("active");
  }

  // Drag & drop
  dropZone.addEventListener("click", function () { fileInput.click(); });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files.length) uploadFiles(fileInput.files);
    fileInput.value = "";
  });

  function uploadFiles(files) {
    var formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }

    uploadProgress.style.display = "block";
    uploadResults.style.display = "none";
    progressFill.style.width = "0%";
    progressText.textContent = "Uploading " + files.length + " file" + (files.length > 1 ? "s" : "") + "...";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        var pct = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = pct + "%";
        progressText.textContent = "Uploading... " + pct + "%";
      }
    });

    xhr.addEventListener("load", function () {
      progressFill.style.width = "100%";
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }

      uploadResults.style.display = "block";
      uploadResults.innerHTML = "";

      if (data.uploaded) {
        data.uploaded.forEach(function (item) {
          var div = document.createElement("div");
          div.className = "upload-result-item " + (item.error ? "error" : "success");
          div.textContent = (item.error ? "✗ " : "✓ ") + item.filename + (item.error ? " — " + item.error : "");
          uploadResults.appendChild(div);
        });
      } else if (data.error) {
        uploadResults.innerHTML = '<div class="upload-result-item error">✗ ' + escapeHtml(data.error) + '</div>';
      }

      progressText.textContent = "Done!";
      loadGallery();

      setTimeout(function () {
        if (!data.error && data.uploaded && !data.uploaded.some(function (i) { return i.error; })) {
          closeModal();
        }
      }, 1200);
    });

    xhr.addEventListener("error", function () {
      progressText.textContent = "Upload failed";
      uploadResults.style.display = "block";
      uploadResults.innerHTML = '<div class="upload-result-item error">✗ Network error</div>';
    });

    xhr.send(formData);
  }

  // ----- Helpers -----

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ----- Init -----

  checkHealth();
  loadGallery();
})();
