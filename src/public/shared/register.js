import * as Utils from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Utils.initializePage();
    const userStatus = await Utils.getUserStatus();
    Utils.createNavigation(userStatus);
    const schema = await Utils.fetchUserSchema("/userRegisterSchema.json");
    if (!schema) {
      console.error("Schema not found");
      return;
    }

    const formContainer = document.getElementById("form-container");
    const formElement = await Utils.createForm(schema, `register-form`, "Register");
    formContainer.appendChild(formElement);

    await Utils.loadCaptchaImage();
    Utils.attachCaptchaRefreshHandler();
    Utils.attachValidationListeners(`register-form`, schema,"/auth/register", "POST");
  } catch (error) {
    console.error("Error initializing the form:", error);
  }
});