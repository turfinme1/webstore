import {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getUserStatus,
} from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userStatus = await getUserStatus();
    createNavigation(userStatus);

    const schema = await fetchUserSchema("/userResetPasswordSchema.json");
    if (!schema) {
      console.error("Schema not found");
      return;
    }

    const formContainer = document.getElementById("form-container");
    const formElement = await createForm(
      schema,
      `reset-password-form`,
      "Reset"
    );
    formContainer.appendChild(formElement);

    attachValidationListeners(
      `reset-password-form`,
      schema,
      "/auth/reset-password?token=" + new URLSearchParams(window.location.search).get("token"),
      "POST"
    );
  } catch (error) {
    console.error("Error initializing the form:", error);
  }
});
