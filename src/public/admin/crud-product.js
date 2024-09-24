import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";
import {
  createForm,
  attachValidationListeners,
  populateFormFields,
} from "./form-util.js";

document.addEventListener("DOMContentLoaded", async () => {
  const createProductButton = document.getElementById("create-product-btn");
  const formContainer = document.getElementById("form-container");

  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  const response = await fetch("/productsSchema.json"); // Fetch schema for product form
  const schema = await response.json();
  //   await attachLogoutHandler();
  // Load and render the form on clicking "Create Product"
  createProductButton.addEventListener("click", async () => {
    try {
      if (!schema) {
        console.error("Product schema not found");
        return;
      }

      // Clear the form container in case it has content
      formContainer.innerHTML = "";

      // Create form dynamically based on the schema
      const formElement = await createForm(
        schema,
        "product-form",
        "Create Product"
      );
      formContainer.appendChild(formElement);
      formContainer.style.display = "block"; // Show the form

      // Attach validation and submit logic
      attachValidationListeners("product-form", schema, "/products", "POST");
    } catch (error) {
      console.error("Error loading the product form:", error);
    }
  });
});
