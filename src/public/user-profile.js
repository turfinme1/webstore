import {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getFormTypeBasedOnUrl,
  getUserStatus,
  loadCaptchaImage,
  attachCaptchaRefreshHandler,
} from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const accountInfoLink = document.getElementById("account-info-link");
  const updateProfile = document.getElementById("change-password-link");
  const notificationsLink = document.getElementById("notifications-link");
  const preferencesLink = document.getElementById("preferences-link");
  const contentArea = document.getElementById("content-area");

  let userStatus = await getUserStatus();
  createNavigation(userStatus);

  const links = [
    accountInfoLink,
    updateProfile,
    notificationsLink,
    preferencesLink,
  ];

  // Function to remove 'active' class from all links
  const removeActiveClass = () => {
    links.forEach((link) => {
      link.classList.remove("active");
    });
  };

  // Function to render account info
  const renderAccountInfo = () => {
    contentArea.innerHTML = `
            <h5>Account Information</h5>
            <p>Here you can view and update your account details.</p>
            <form id="account-info-form">
                <div class="mb-3">
                    <label for="name" class="form-label">Name</label>
                    <input type="text" class="form-control" id="name" value="John Doe">
                </div>
                <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email" value="john@example.com">
                </div>
                <button type="submit" class="btn btn-primary">Update Info</button>
            </form>
        `;
  };

  // Function to render change password form
  const renderChangePassword = async () => {
    contentArea.innerHTML = "";
    try {
      // Fetch user preferences schema from the server
      const schema = await fetchUserSchema("/userUpdateSchema.json");

      // Create form dynamically based on fetched schema
      const preferencesForm = await createForm(
        schema,
        "preferences-form",
        "Update"
      );
      const formContainer = document.createElement("div");
      formContainer.classList.add("p-4", "border", "rounded");
      formContainer.id = "form-container";
      formContainer.appendChild(preferencesForm);
      contentArea.appendChild(preferencesForm);
      userStatus = await getUserStatus();
      populateFormFields("preferences-form", userStatus);

      attachValidationListeners("preferences-form", schema, "Update");
    } catch (error) {
      console.error("Error rendering preferences form:", error);
      contentArea.innerHTML = `<p class="text-danger">Failed to load preferences. Please try again later.</p>`;
    }
  };

  // Function to render notifications settings
  const renderNotifications = () => {
    contentArea.innerHTML = `
            <h5>Notifications</h5>
            <form id="notifications-form">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="email-notifications" checked>
                    <label class="form-check-label" for="email-notifications">
                        Receive email notifications
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sms-notifications">
                    <label class="form-check-label" for="sms-notifications">
                        Receive SMS notifications
                    </label>
                </div>
                <button type="submit" class="btn btn-primary mt-3">Save Settings</button>
            </form>
        `;
  };

  // Function to render preferences form
  const renderPreferences = () => {
    contentArea.innerHTML = `
            <h5>Preferences</h5>
            <form id="preferences-form">
                <div class="mb-3">
                    <label for="theme-select" class="form-label">Theme</label>
                    <select id="theme-select" class="form-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="language-select" class="form-label">Language</label>
                    <select id="language-select" class="form-select">
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Save Preferences</button>
            </form>
        `;
  };

  // Add click event listeners for each sidebar link
  accountInfoLink.addEventListener("click", () => {
    removeActiveClass();
    accountInfoLink.classList.add("active");
    renderAccountInfo();
  });

  updateProfile.addEventListener("click", () => {
    removeActiveClass();
    updateProfile.classList.add("active");
    renderChangePassword();
  });

  notificationsLink.addEventListener("click", () => {
    removeActiveClass();
    notificationsLink.classList.add("active");
    renderNotifications();
  });

  preferencesLink.addEventListener("click", () => {
    removeActiveClass();
    preferencesLink.classList.add("active");
    renderPreferences();
  });

  // Load the account info section by default
  renderAccountInfo();
});

function populateFormFields(formId, userData) {
  const form = document.getElementById(formId);
  if (!form || typeof userData !== "object") return;

  Object.keys(userData).forEach((key) => {
    const input = form.querySelector(`[name="${key}"], [id="${key}"]`);
    if (input) {
      switch (input.type) {
        case "checkbox":
          input.checked = userData[key] ? true : false;
          break;
        case "radio":
          const radio = form.querySelector(
            `[name="${key}"][value="${userData[key]}"]`
          );
          if (radio) radio.checked = true;
          break;
        case "select-one":
          const option = input.querySelector(
            `option[value="${userData[key]}"]`
          );
          if (option) input.value = userData[key];
          break;
        default:
          input.value = userData[key] ?? "";
      }
    }
  });
}
