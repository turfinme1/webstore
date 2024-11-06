import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation } from "./navigation.js";
import {
  createForm,
  attachValidationListeners,
  fetchUserSchema,
  populateFormFields,
} from "./form-util.js";

// Initial setup
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize user status and navigation
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  await attachLogoutHandler();

  renderDynamicNavigation(userStatus);

});

function renderDynamicNavigation(userStatus) {
  const navContainer = document.getElementById("dynamic-nav");
  navContainer.innerHTML = ""; // Clear previous content

  const navItems = [
    { id: "settings-link", text: "Site Settings", href: "#", permission: "view", interface: "site-settings" },
    { id: "crud-product-link", text: "CRUD Products", href: "/crud-product", permission: "view", interface: "products" },
    { id: "crud-user-link", text: "CRUD Users", href: "/crud-user", permission: "view", interface: "users" },
    { id: "crud-staff-user-link", text: "CRUD Staff Users", href: "/crud-staff-user", permission: "view", interface: "admin-users" },
    { id: "crud-order-link", text: "CRUD Orders", href: "/crud-order", permission: "view", interface: "orders" },
    { id: "crud-role-link", text: "CRUD Roles", href: "/crud-role", permission: "view", interface: "roles" },
    { id: "logs-link", text: "Report Logs", href: "/logs", permission: "view", interface: "report-logs" },
    { id: "report-order-link", text: "Report Orders", href: "/report-order", permission: "view", interface: "report-orders" },
    { id: "upload-products-link", text: "Upload Products from CSV", href: "#", permission: "create", interface: "products" },
  ];

  navItems.forEach(item => {
    if (hasPermission(userStatus, item.permission, item.interface)) {
      const li = document.createElement("li");
      li.classList.add("nav-item");
      const a = document.createElement("a");
      a.classList.add("nav-link");
      a.id = item.id;
      a.href = item.href;
      a.textContent = item.text;
      li.appendChild(a);
      navContainer.appendChild(li);

      // Attach event listeners for dynamic content rendering
      if (item.id === "settings-link") {
        a.addEventListener("click", async () => {
          await renderSettings();
        });
      } else if (item.id === "upload-products-link") {
        a.addEventListener("click", async () => {
          await renderUploadProducts();
        });
      }
    }
  });
}

// Function to render settings form
async function renderSettings() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = ""; // Clear previous content

  const settingsSchema = await fetchUserSchema("/appSettingsSchema.json");

  try {
    // Dynamically create form based on settings schema
    const settingsForm = await createForm(
      settingsSchema,
      "settings-form",
      "Update Settings"
    );
    const formContainer = document.createElement("div");
    formContainer.classList.add("p-4", "border", "rounded");
    formContainer.appendChild(settingsForm);
    contentArea.appendChild(formContainer);

    // Attach validation and submission logic
    attachValidationListeners(
      "settings-form",
      settingsSchema,
      "/app-config/rate-limit-settings",
      "PUT"
    );

    await populateFormFields(
      "settings-form",
      "/app-config/rate-limit-settings"
    );
  } catch (error) {
    console.error("Error rendering settings form:", error);
    contentArea.innerHTML = `<p class="text-danger">Failed to load settings. Please try again later.</p>`;
  }
}

// Function to render upload products form
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
