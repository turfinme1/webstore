import {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getFormTypeBasedOnUrl,
  getUserStatus,
  loadCaptchaImage,
  attachCaptchaRefreshHandler
} from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userStatus = await getUserStatus();
    createNavigation(userStatus);
    const schema = await fetchUserSchema("/userRegisterSchema.json");
    if (!schema) {
      console.error("Schema not found");
      return;
    }

    const formType = getFormTypeBasedOnUrl();
    const formContainer = document.getElementById("form-container");
    const formElement = await createForm(schema, `${schema.name}-form`, formType);
    formContainer.appendChild(formElement);

    await loadCaptchaImage();
    attachCaptchaRefreshHandler();

    attachValidationListeners(`${schema.name}-form`, schema, formType);
  } catch (error) {
    console.error("Error initializing the form:", error);
  }
});