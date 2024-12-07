import {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getUserStatus,
  loadCaptchaImage,
  attachCaptchaRefreshHandler
} from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userStatus = await getUserStatus();
    createNavigation(userStatus);
    const schema = await fetchUserSchema("/userLoginSchema.json");
    if (!schema) {
      console.error("Schema not found");
      return;
    }

    const formContainer = document.getElementById("form-container");
    const formElement = await createForm(schema, `login-form`, "Login");
    formContainer.appendChild(formElement);

    await loadCaptchaImage();
    attachCaptchaRefreshHandler();
    attachValidationListeners(`login-form`, schema,"/auth/login", "POST");
  } catch (error) {
    console.error("Error initializing the form:", error);
  }
});
