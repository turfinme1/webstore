// schemaService.js
async function fetchUserSchema(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch schema");
  return await response.json();
}

// formService.js
async function createForm(schema, formId, formType) {
  const form = document.createElement("form");
  form.id = formId;
  form.className = "needs-validation"; // For Bootstrap styling

  const formTitle = document.createElement("h2");
  formTitle.innerText = formType;
  form.appendChild(formTitle);

  for (const key in schema.properties) {
    const field = schema.properties[key];
    const wrapper = document.createElement("div");
    wrapper.className = "form-group mb-3";

    const label = document.createElement("label");
    label.htmlFor = key;
    label.className = "form-label";
    label.innerText = field.label;
    if (schema.required.includes(key)) {
      label.innerHTML += `<span style="color:red;"> *</span>`;
    }

    if (key === "iso_country_code_id") {
      const select = document.createElement("select");
      select.id = key;
      select.name = key;
      select.className = "form-select";

      const countries = await fetchCountryCodes(field.fetchFrom);
      countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.id;
        option.innerText = `${country.country_name} (${country.phone_code})`;
        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
    } else if (key === "country_id") {
      const select = document.createElement("select");
      select.id = key;
      select.name = key;
      select.className = "form-select";

      const option = document.createElement("option");
      option.value = null;
      option.innerText = `Select a country`;
      select.appendChild(option);

      const countries = await fetchCountryCodes(field.fetchFrom);
      countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.id;
        option.innerText = `${country.country_name}`;
        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
    } else if (key === "gender_id") {
      const select = document.createElement("select");
      select.id = key;
      select.name = key;
      select.className = "form-select";

      field.enumValues.forEach((genderOption) => {
        const option = document.createElement("option");
        option.value = genderOption.value;
        option.innerText = genderOption.label;
        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
    } else if (key === "captcha_answer") {
      const captchaImage = document.createElement("img");
      captchaImage.id = "captcha-image";
      captchaImage.alt = "CAPTCHA";
      captchaImage.className = "captcha-image";
      captchaImage.style.cursor = "pointer";

      const input = document.createElement("input");
      input.type = "text";
      input.id = key;
      input.name = key;
      input.placeholder = field.placeholder;
      input.className = "form-control";

      wrapper.appendChild(label);
      wrapper.appendChild(captchaImage);
      wrapper.appendChild(input);
    } else {
      const input = document.createElement("input");
      input.type = key === "password" ? "password" : "text";
      input.id = key;
      input.name = key;
      input.placeholder = field.placeholder;
      input.className = "form-control";

      wrapper.appendChild(label);
      wrapper.appendChild(input);
    }

    const errorMessage = document.createElement("div");
    errorMessage.className = "invalid-feedback";
    errorMessage.id = `${key}-error`;
    wrapper.appendChild(errorMessage);

    form.appendChild(wrapper);
  }

  const genericMessage = document.createElement("div");
  genericMessage.id = `${formId}-generic-message`;
  genericMessage.className = "text-danger";
  form.appendChild(genericMessage);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "btn btn-primary w-100 mt-3";
  submitButton.innerText = formType;
  form.appendChild(submitButton);

  return form;
}

// Helper function to fetch country codes
async function fetchCountryCodes(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch country codes");
    return await response.json();
  } catch (error) {
    console.error("Error fetching country codes:", error);
    return [];
  }
}

// validationService.js
function attachValidationListeners(formId, schema, url, method) {
  const form = document.getElementById(formId);
  if (!form) return;

  const Ajv = window.Ajv;
  const ajv = new Ajv({ allErrors: true, strict: false });
  window.ajvErrors(ajv);
  const validate = ajv.compile(schema);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = castFormDataToSchema(Object.fromEntries(formData), schema);

    document.querySelectorAll(".invalid-feedback").forEach((el) => {
      el.innerText = "";
    });
    document.querySelectorAll(".is-invalid").forEach((el) => {
      el.classList.remove("is-invalid");
    });

    const valid = validate(data);
    if (!valid) {
      validate.errors.forEach((error) => {
        const field = error.instancePath.slice(1);
        const errorMessageEl = document.getElementById(`${field}-error`);
        if (errorMessageEl) {
          errorMessageEl.innerText = error.message;
          document.getElementById(field).classList.add("is-invalid");
        }
      });
    } else {
      handleFormSubmission(url, method, data, formId);
    }
  });
}

function castFormDataToSchema(data, schema) {
  const castedData = {};

  for (const key in data) {
    if (schema.properties[key]) {
      let expectedType = schema.properties[key].type;

      // If type is an array, prioritize casting to the most likely type (integer, null, etc.)
      if (Array.isArray(expectedType)) {
        if (expectedType.includes("integer")) {
          expectedType = "integer";
        } else if (expectedType.includes("number")) {
          expectedType = "number";
        } else if (expectedType.includes("boolean")) {
          expectedType = "boolean";
        } else if (expectedType.includes("null")) {
          expectedType = "null";
        } else {
          expectedType = "string"; // Default to string for unhandled types
        }
      }

      // Perform type casting based on the resolved type
      if (expectedType === "integer") {
        castedData[key] = parseInt(data[key], 10);
        if (isNaN(castedData[key])) castedData[key] = null; // Handle empty or invalid integer values
      } else if (expectedType === "number") {
        castedData[key] = parseFloat(data[key]);
        if (isNaN(castedData[key])) castedData[key] = null; // Handle empty or invalid number values
      } else if (expectedType === "boolean") {
        castedData[key] = data[key] === "true";
      } else if (expectedType === "null") {
        castedData[key] = data[key] === "" ? null : data[key]; // Convert empty string to null
      } else {
        // For other types like string or unchanged values
        castedData[key] = data[key];
      }
    }
  }

  return castedData;
}

// formSubmissionService.js
async function handleFormSubmission(url, method, data, formId) {
  const genericMessage = document.getElementById(`${formId}-generic-message`);
  genericMessage.innerText = "";
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      genericMessage.innerText = error.error || "Submission failed.";
      genericMessage.className = "text-danger";
      if (
        !error.error.includes("Too many failed attempts. Try again later") &&
        method === "POST" &&
        formId.includes("login" || formId.includes("register"))
      ) {
        await loadCaptchaImage();
      }
    } else {
      const result = await response.json();
      console.log(result);
      genericMessage.className = "text-success";
      genericMessage.innerText = `Success! You will be redirected shortly.`;

      if (formId.includes("login")) {
        genericMessage.innerText = `Success! You will be redirected shortly.`;
      } else if (formId.includes("register")) {
        genericMessage.innerText = `Success! You will be redirected shortly.`;
      } else if (formId.includes("update")) {
        genericMessage.innerText = `Success! You will be redirected shortly.`;
      } else if (formId.includes("forgot-password")) {
        genericMessage.innerText = `If the email exists, a password reset link is sent.`;
      } else if (formId.includes("reset-password")) {
        genericMessage.innerText = `Password reset successful. Redirecting to login page.`;
      }

      setTimeout(() => {
        if (formId.includes("login")) {
          window.location.href = "/index.html";
        } else if (formId.includes("register")) {
          window.location.href = "/verify.html";
        } else if (formId.includes("update")) {
          window.location.href = "/user-profile";
        } else if (formId.includes("reset-password")) {
          window.location.href = "/login.html";
        }
      }, 2000);
    }
  } catch (error) {
    console.error("Error:", error);
    genericMessage.innerText =
      error.message || "An error occurred. Please try again later.";
  }
}

// utils.js
function getFormTypeBasedOnUrl() {
  const url = window.location.pathname;
  return url.includes("login") ? "login" : "register";
}

async function getUserStatus() {
  const response = await fetch("/auth/status");
  return await response.json();
}

async function attachLogoutHandler() {
  const logoutButton = document.querySelector(".logout-btn");
  if (!logoutButton) return;
  logoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const response = await fetch("/auth/logout");
    window.location.href = "/index";
  });
}

async function loadCaptchaImage() {
  const captchaImage = document.getElementById("captcha-image");
  captchaImage.src = `/auth/captcha?t=${Date.now()}`; // Add timestamp to avoid caching
}

// Attach a click listener to refresh the CAPTCHA image
function attachCaptchaRefreshHandler() {
  const captchaImage = document.getElementById("captcha-image");
  captchaImage.addEventListener("click", loadCaptchaImage);
}

function hasPermission(userStatus, permission, interfaceName) {
  if (!userStatus || !userStatus.role_permissions) return false;
  const result = 
    userStatus.role_permissions.some(
    (rolePermission) =>
      rolePermission.permission === permission &&
      rolePermission.interface === interfaceName
  );
  return result;
}

export {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getFormTypeBasedOnUrl,
  getUserStatus,
  attachLogoutHandler,
  loadCaptchaImage,
  attachCaptchaRefreshHandler,
  hasPermission,
};
