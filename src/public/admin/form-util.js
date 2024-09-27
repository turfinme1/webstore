export async function createForm(schema, formId, formType) {
  const form = document.createElement("form");
  form.id = formId;
  form.className = "needs-validation"; // For Bootstrap styling

  const formTitle = document.createElement("h2");
  formTitle.innerText = formType;
  form.appendChild(formTitle);

  for (const [key, field] of Object.entries(schema.properties)) {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group mb-3";

    const label = createLabel(key, field, schema.required);
    const input = await createInputField(key, field);

    wrapper.appendChild(label);
    wrapper.appendChild(input);

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

export function createLabel(key, field, requiredFields) {
  const label = document.createElement("label");
  label.htmlFor = key;
  label.className = "form-label";
  label.innerText = field.label || key.charAt(0).toUpperCase() + key.slice(1);

  if (requiredFields.includes(key)) {
    label.innerHTML += `<span style="color:red;"> *</span>`;
  }
  return label;
}

export async function createInputField(key, field) {
  if (field.type === "boolean") {
    return createCheckboxField(key, field);
  } else if (key === "iso_country_code_id") {
    return createSelectField(
      key,
      field,
      await fetchCountryCodes(field.fetchFrom)
    );
  } else if (key === "gender_id") {
    return createSelectField(key, field, field.enumValues);
  } else if (key === "captcha_answer") {
    return createCaptchaField(key);
  } else if (key === "categories") {
    return createMultiSelectField(
      key,
      field,
      await fetchCategories(field.fetchFrom)
    );
  } else if (field.fileInput) {
    return createFileInputField(key, field);
  } else {
    return createTextField(key, field);
  }
}

export async function fetchCategories(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

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

export function createFileInputField(key, field) {
  const input = document.createElement("input");
  input.type = "file";
  input.id = key;
  input.name = key;
  input.multiple = true;
  input.className = "form-control";
  input.accept = "image/*";
  return input;
}

export function createTextField(key, field) {
  const input = document.createElement("input");
  input.type = key === "password" ? "password" : "text";
  input.id = key;
  input.name = key;
  input.placeholder = field.placeholder || "";
  input.className = "form-control";
  return input;
}

export function createSelectField(key, field, options) {
  const select = document.createElement("select");
  select.id = key;
  select.name = key;
  select.className = "form-select";

  options.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value || option.id;
    optionEl.innerText =
      option.label ||
      option.name ||
      `${option.country_name} (${option.phone_code})`;
    select.appendChild(optionEl);
  });

  return select;
}

export function createMultiSelectField(key, field, options) {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-multi-select";
  const input = document.createElement("input");
  input.placeholder = `Select ${key}`;
  input.className = "form-control";
  const div = document.createElement("div");
  div.id = key;
  div.name = key;
  div.className = "options-list";

  options.forEach((option) => {
    const label = document.createElement("label");
    label.classList.add("d-block"); // Optionally add Bootstrap or custom classes

    // Create input element (checkbox)
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option.id;
    checkbox.name = key;

    // Append checkbox and text to label
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${option.name}`));

    // Append label to the category options container
    div.appendChild(label);
  });

  input.addEventListener("click", () => {
    div.style.display = div.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (
      !input.contains(e.target) &&
      !div.contains(e.target)
    ) {
      div.style.display = "none";
    }
  });

  // Optional: Attach event listeners for each checkbox for tracking selections
  div.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const selectedValues = Array.from(
        div.querySelectorAll("input[type='checkbox']:checked")
      ).map((input) => input.value);

      console.log("Selected values:", selectedValues);
      // You can update the UI or state based on the selected values
    });
  });
  console.log(div);
  wrapper.appendChild(input);
  wrapper.appendChild(div);
  return wrapper;
}

export function createCaptchaField(key) {
  const wrapper = document.createElement("div");
  const captchaImage = document.createElement("img");
  captchaImage.id = "captcha-image";
  captchaImage.alt = "CAPTCHA";
  captchaImage.className = "captcha-image";
  captchaImage.style.cursor = "pointer";

  const input = document.createElement("input");
  input.type = "text";
  input.id = key;
  input.name = key;
  input.placeholder = "Enter CAPTCHA";
  input.className = "form-control";

  wrapper.appendChild(captchaImage);
  wrapper.appendChild(input);

  return wrapper;
}

export function createCheckboxField(key, field) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = key;
  input.name = key;
  input.className = "form-check-input";

  const label = document.createElement("label");
  label.htmlFor = key;
  label.className = "form-check-label";
  label.innerText =
    field.placeholder || key.charAt(0).toUpperCase() + key.slice(1);

  wrapper.appendChild(input);
  wrapper.appendChild(label);

  return wrapper;
}

export async function handleFormSubmission(url, method, data, formId) {
  const genericMessage = document.getElementById(`${formId}-generic-message`);
  genericMessage.innerText = "";

  const formRedirects = {
    login: {
      success: "Success! Redirecting to homepage...",
      redirectUrl: "/index.html",
    },
    register: {
      success: "Registration successful! Redirecting to verification...",
      redirectUrl: "/verify.html",
    },
    update: {
      success: "Profile updated! Redirecting to profile...",
      redirectUrl: "/user-profile",
    },
    "forgot-password": {
      success: "If the email exists, a password reset link is sent.",
      redirectUrl: null,
    },
    "reset-password": {
      success: "Password reset successful. Redirecting to login page.",
      redirectUrl: "/login.html",
    },
    "settings-form": {
      success: "Settings updated!",
    },
  };

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || "Submission failed.";
      genericMessage.className = "text-danger";
      genericMessage.innerText = errorMessage;
      handleCaptchaResetOnFailure(errorMessage, method, formId);
    } else {
      const { success, redirectUrl } = formRedirects[formId] || {};
      genericMessage.className = "text-success";
      genericMessage.innerText = success || "Success! Redirecting...";

      if (redirectUrl) {
        setTimeout(() => (window.location.href = redirectUrl), 2000);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    genericMessage.innerText =
      error.message || "An error occurred. Please try again later.";
  }
}

export function handleCaptchaResetOnFailure(errorMessage, method, formId) {
  if (
    !errorMessage.includes("Too many failed attempts") &&
    method === "POST" &&
    (formId.includes("login") || formId.includes("register"))
  ) {
    loadCaptchaImage(); // Assume you have a function for loading a new CAPTCHA image
  }
}

// validationService.js
export function attachValidationListeners(formId, schema, url, method) {
  const form = document.getElementById(formId);
  if (!form) return;

  const ajv = initializeAjv();
  const validate = ajv.compile(schema);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const data = castFormDataToSchema(Object.fromEntries(formData), schema);

    resetFormValidationState(form);

    if (validate(data)) {
      handleFormSubmission(url, method, data, formId);
    } else {
      displayValidationErrors(validate.errors);
    }
  });
}

// Initializes the AJV instance (configurable and reusable)
export function initializeAjv() {
  const Ajv = window.Ajv;
  const ajv = new Ajv({ allErrors: true, strict: false });
  window.ajvErrors(ajv); // Assuming ajvErrors extends AJV with better error handling
  return ajv;
}

// Resets form validation states (removes previous errors)
export function resetFormValidationState(form) {
  document.querySelectorAll(".invalid-feedback").forEach((el) => {
    el.innerText = "";
  });
  document.querySelectorAll(".is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
  });
}

// Displays validation errors returned by AJV
export function displayValidationErrors(errors) {
  errors.forEach((error) => {
    const field = error.instancePath.slice(1);
    const errorMessageEl = document.getElementById(`${field}-error`);
    if (errorMessageEl) {
      errorMessageEl.innerText = error.message;
      document.getElementById(field).classList.add("is-invalid");
    }
  });
}

export function castFormDataToSchema(data, schema) {
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
        castedData[key] = data[key] === "on";
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

export async function fetchUserSchema(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch schema");
  return await response.json();
}

export async function populateFormFields(formId, url) {
  const form = document.getElementById(formId);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch user data");
  const userData = await response.json();

  Object.keys(userData).forEach((key) => {
    const input = form.querySelector(`[name="${key}"], [id="${key}"]`);

    if (typeof userData[key] === "object" && input) {
      // Check if it's a time unit object (like request_window or request_block_duration)
      const timeObject = userData[key];
      const timeUnit = Object.keys(timeObject)[0]; // This should be "minutes", "hours", etc.
      const timeValue = timeObject[timeUnit]; // This should be the numeric value

      // Set the input value in the form (adjust according to how you're displaying the time)
      input.value = `${timeValue} ${timeUnit}`;
    } else if (input) {
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
