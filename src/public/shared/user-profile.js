import {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getFormTypeBasedOnUrl,
  getUserStatus,
  loadCaptchaImage,
  attachCaptchaRefreshHandler,
  attachLogoutHandler,
} from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const updateProfile = document.getElementById("change-password-link");
  const contentArea = document.getElementById("content-area");
  
  let userStatus = await getUserStatus();
  createNavigation(userStatus);
  await attachLogoutHandler();

  const links = [
    updateProfile,
  ];

  // Function to remove 'active' class from all links
  const removeActiveClass = () => {
    links.forEach((link) => {
      link.classList.remove("active");
    });
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
        "update-form",
        "Update"
      );
      const formContainer = document.createElement("div");
      formContainer.classList.add("p-4", "border", "rounded");
      formContainer.id = "form-container";
      formContainer.appendChild(preferencesForm);
      contentArea.appendChild(preferencesForm);
      userStatus = await getUserStatus();
      populateFormFields("update-form", userStatus);
      attachValidationListeners("update-form", schema, "/auth/profile",  "PUT");
    } catch (error) {
      console.error("Error rendering preferences form:", error);
      contentArea.innerHTML = `<p class="text-danger">Failed to load preferences. Please try again later.</p>`;
    }
  };

  updateProfile.addEventListener("click", () => {
    removeActiveClass();
    updateProfile.classList.add("active");
    renderChangePassword();
  });

  // Load the account info section by default
  // renderChangePassword();
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
        case "date":
          if(userData[key]){
            input.value = dayjs(userData[key]).format('YYYY-MM-DD');
          }
          break;
        default:
          input.value = userData[key] ?? "";
      }
    }
  });
}
