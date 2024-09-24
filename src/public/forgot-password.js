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
  
      const schema = await fetchUserSchema("/userForgotPasswordSchema.json");
      if (!schema) {
        console.error("Schema not found");
        return;
      }
  
      const formContainer = document.getElementById("form-container");
      const formElement = await createForm(schema, `forgot-password-form`, "Reset");
      formContainer.appendChild(formElement);
  
      attachValidationListeners(
        `forgot-password-form`,
        schema,
        "/auth/forgot-password",
        "POST"
      );
    } catch (error) {
      console.error("Error initializing the form:", error);
    }
  });
  