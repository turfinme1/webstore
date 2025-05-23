import * as Utils from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Utils.initializePage();
    const userStatus = await Utils.getUserStatus();
    Utils.createNavigation(userStatus);
    const schema = await Utils.fetchUserSchema("/userLoginSchema.json");
    if (!schema) {
      console.error("Schema not found");
      return;
    }

    const formContainer = document.getElementById("form-container");
    const formElement = await Utils.createForm(schema, `login-form`, "Login");
    formContainer.appendChild(formElement);

    await Utils.loadCaptchaImage();
    Utils.attachCaptchaRefreshHandler();
    Utils.attachValidationListeners(`login-form`, schema,"/auth/login", "POST");
  } catch (error) {
    console.error("Error initializing the form:", error);
  }
});