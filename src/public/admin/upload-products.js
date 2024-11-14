import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  await attachLogoutHandler();

  await renderUploadProducts();
});

async function renderUploadProducts() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = ""; // Clear previous content
  const form = document.createElement("form");
  form.id = "upload-products-form";
  form.classList.add("p-4", "border", "rounded");
  form.innerHTML = `
      <h2>Upload Products</h2>
      <div class="mb-3">
        <label for="product-csv" class="form-label">Upload products from CSV file</label>
        <input type="file" class="form-control" id="product-csv" name="product-csv" accept=".csv" required>
        <div id="response-text" class="form-text"></div>
      </div>
      <div class="d-flex align-items-center">
        <button type="submit" class="btn btn-primary" id="upload-button">Upload</button>
        <div id="spinner" class="spinner-border text-primary ms-3" role="status" style="display: none;">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  contentArea.appendChild(form);
  const uploadButton = document.getElementById("upload-button");
  const spinner = document.getElementById("spinner");
  const responseText = document.getElementById("response-text");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    spinner.style.display = "inline-block";
    uploadButton.disabled = true;
    responseText.textContent = "";

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        responseText.textContent = data.message;
        spinner.style.display = "none";
        uploadButton.disabled = false;
      } else {
        alert("Failed to upload products. Please try again later.");
        spinner.style.display = "none";
        uploadButton.disabled = false;
      }
    } catch (error) {
      console.error("Error uploading products:", error);
      alert("An error occurred. Please try again.");
      spinner.style.display = "none";
      uploadButton.disabled = false;
    }
  });
}
