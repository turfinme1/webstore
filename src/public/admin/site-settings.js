import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);

  await renderSettings();
});

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
