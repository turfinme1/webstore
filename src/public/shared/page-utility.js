async function fetchUserSchema(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch schema");
  return await response.json();
}

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
    } else if (key === "birth_date") {
      const input = document.createElement("input");
      input.type = "date";
      input.id = key;
      input.name = key;
      input.className = "form-control";

      wrapper.appendChild(label);
      wrapper.appendChild(input);

    } 
    else if (schema.properties[key]?.type === "boolean"){
      const input = document.createElement("input");
      input.style.display = "block";
      input.type = "checkbox";
      input.id = key;
      input.name = key;
      input.className = "form-check-input";

      wrapper.appendChild(label);
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

async function populateFormFields(formId, url) {
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
      // input.value = `${timeValue} ${timeUnit}`;
      input.value = timeValue;
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

async function handleFormSubmission(url, method, data, formId) {
  const genericMessage = document.getElementById(`${formId}-generic-message`);
  genericMessage.innerText = "";
  try {
    const response = await fetchWithErrorHandling(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = response.error;
      genericMessage.innerText = error || "Submission failed.";
      genericMessage.className = "text-danger";
      if (
        !error.includes("Too many failed attempts. Try again later") &&
        method === "POST" &&
        formId.includes("login" || formId.includes("register"))
      ) {
        await loadCaptchaImage();
      }
    } else {
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
      } else if (formId.includes("settings")) {
        genericMessage.innerText = `Settings updated successfully.`;
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

function getFormTypeBasedOnUrl() {
  const url = window.location.pathname;
  return url.includes("login") ? "login" : "register";
}

async function getUserStatus() {
  const response = await fetch("/auth/status");
  return await response.json();
}

async function loadCaptchaImage() {
  const captchaImage = document.getElementById("captcha-image");
  captchaImage.src = `/auth/captcha?t=${Date.now()}`; // Add timestamp to avoid caching
}

function attachCaptchaRefreshHandler() {
  const captchaImage = document.getElementById("captcha-image");
  captchaImage.addEventListener("click", loadCaptchaImage);
}

function hasPermission(userStatus, permission, interfaceName) {
  if (!userStatus || !userStatus.role_permissions) return false;
  const result = userStatus.role_permissions.some(
    (rolePermission) =>
      rolePermission.permission === permission &&
      rolePermission.interface === interfaceName
  );
  return result;
}

function createNavigation(userStatus) {
  const navBar = document.createElement("nav");
  navBar.classList.add(
    "navbar",
    "navbar-expand-lg",
    "navbar-light",
    "bg-light"
  );

  navBar.innerHTML = `
          <div class="container-fluid">
              <a class="navbar-brand" href="/index.html">Product Showcase</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                  aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                  <span class="navbar-toggler-icon"></span>
              </button>
              <div class="collapse navbar-collapse" id="navbarNav">
                  <ul class="navbar-nav ms-auto">
                      <li class="nav-item">
                          <a class="nav-link" href="/index.html">Products</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link" href="/cart">My Cart</a>
                      </li>
                      ${
                        userStatus.session_type === "Authenticated"
                          ? `
                       <li class="nav-item">
                          <a class="nav-link" href="/user-profile">${
                            userStatus.has_first_login
                              ? userStatus.first_name
                              : `Welcome ${userStatus.first_name}`
                          }</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link logout-btn" href="/logout">Logout</a>
                      </li>
                      `
                          : `
                      <li class="nav-item">
                          <a class="nav-link" href="/register.html">Register</a>
                      </li>
                       <li class="nav-item">
                          <a class="nav-link" href="/forgot-password.html">Forgot Password</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link" href="/login.html">Login</a>
                      </li>
                      `
                      }
                  </ul>
              </div>
          </div>
      `;

  document.body.prepend(navBar);

  const logoutButton = document.querySelector(".logout-btn");
  if (!logoutButton) return;
  logoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const response = await fetch("/auth/logout");
    window.location.href = "/index";
  });
}

function createBackofficeNavigation(userStatus) {
  const navContainer = document.getElementById("dynamic-nav");
  navContainer.innerHTML = ""; // Clear previous content

  const navItems = [
    {
      id: "settings-link",
      text: "Site Settings",
      href: "/site-settings",
      permission: "view",
      interface: "site-settings",
    },
    {
      id: "crud-product-link",
      text: "CRUD Products",
      href: "/crud-product",
      permission: "view",
      interface: "products",
    },
    {
      id: "crud-user-link",
      text: "CRUD Users",
      href: "/crud-user",
      permission: "view",
      interface: "users",
    },
    {
      id: "crud-staff-user-link",
      text: "CRUD Staff Users",
      href: "/crud-staff-user",
      permission: "view",
      interface: "admin-users",
    },
    {
      id: "crud-order-link",
      text: "CRUD Orders",
      href: "/crud-order",
      permission: "view",
      interface: "orders",
    },
    {
      id: "crud-role-link",
      text: "CRUD Roles",
      href: "/crud-role",
      permission: "view",
      interface: "roles",
    },
    {
      id:"promotion-link",
      text: "CRUD Promotions",
      href: "/crud-promotion",
      permission: "view",
      interface: "promotions",
    },
    {
      id: "crud-voucher-link",
      text: "CRUD Vouchers",
      href: "/crud-voucher",
      permission: "view",
      interface: "vouchers",
    },
    {
      id: "crud-campaign-link",
      text: "CRUD Campaigns",
      href: "/crud-campaign",
      permission: "view",
      interface: "campaigns",
    },
    // {
    //   id: "logs-link",
    //   text: "Report Logs",
    //   href: "/logs",
    //   permission: "view",
    //   interface: "report-logs",
    // },
    // {
    //   id: "report-order-link",
    //   text: "Report Orders",
    //   href: "/report-order",
    //   permission: "view",
    //   interface: "report-orders",
    // },
    // {
    //   id: "report-order-by-user-link",
    //   text: "Report Orders by User",
    //   href: "/report-order-by-user",
    //   permission: "view",
    //   interface: "report-orders",
    // },
    {
      id: "report-link",
      text: "Report Logs",
      href: "/report?report=report-logs",
      permission: "view",
      interface: "report-logs",
    },
    {
      id: "report-link",
      text: "Report Orders",
      href: "/report?report=report-orders",
      permission: "view",
      interface: "report-orders",
    },
    {
      id: "report-link",
      text: "Report Order By User",
      href: "/report?report=report-orders-by-user",
      permission: "view",
      // to be changed to the correct interface
      interface: "report-orders",
    },
    {
      id: "report-link",
      text: "Report Users",
      href: "/report?report=report-users",
      permission: "view",
      // to be changed to the correct interface
      interface: "report-orders",
    },
    {
      id: "upload-products-link",
      text: "Upload Products from CSV",
      href: "/upload-products",
      permission: "create",
      interface: "products",
    },
    {
      id: "target-groups-link",
      text: "Target Groups",
      href: "/target-group",
      permission: "create",
      interface: "target-groups",
    },
    {
      id: "email-templates-link",
      text: "Email Templates",
      href: "/email-templates",
      permission: "view",
      interface: "email-templates",
    },
  ];

  navItems.forEach((item) => {
    if (hasPermission(userStatus, item.permission, item.interface)) {
      const li = document.createElement("li");
      li.classList.add("nav-item");
      const a = document.createElement("a");
      a.classList.add("nav-link");
      a.id = item.id;
      a.href = item.href;
      a.textContent = item.text;
      li.appendChild(a);
      navContainer.appendChild(li);
    }
  });
}

async function fetchWithErrorHandling(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      return {
        ok: true,
        data,
        error: null,
      };
    }

    return {
      ok: false,
      error: data.error || "Failed to fetch data, please try again later",
    };
  } catch (error) {
    if (!navigator.onLine) {
      return {
        ok: false,
        error: "No internet connection",
      };
    } else {
      console.error("Error fetching data:", error);
      return {
        ok: false,
        error: "Failed to fetch data, please try again later",
      };
    }
  }
}

function showToastMessage(message, type) {
  let container = document.getElementById("message-container");
  if (!container) {
    const messageContainer = document.createElement("div");
    messageContainer.id = "message-container";
    messageContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1050;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
    document.body.appendChild(messageContainer);
    container = messageContainer;
  }

  const toast = document.createElement("div");
  toast.className = `toast`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
        <div class="toast-header ${
          type === "error" ? "bg-danger text-white" : "bg-success text-white"
        }">
          <strong class="me-auto">${
            type === "error" ? "Error" : "Success"
          }</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      `;

  container.appendChild(toast);
  const toastInstance = new bootstrap.Toast(toast, { delay: 5000 });
  toastInstance.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: parseInt(params.get('page')) || 1,
    pageSize: parseInt(params.get('pageSize')) || 10,
    filterParams: JSON.parse(params.get('filterParams') || '{}'),
    orderParams: JSON.parse(params.get('orderParams') || '[]'),
    searchParams: JSON.parse(params.get('searchParams') || '{}'),
  };
}

function updateUrlParams(state) {
  const params = new URLSearchParams();
  params.set('page', state.currentPage);
  params.set('pageSize', state.pageSize);
  if (state.filterParams && Object.keys(state.filterParams).length) {
    params.set('filterParams', JSON.stringify(state.filterParams));
  }
  if (state?.orderParams?.length) {
    params.set('orderParams', JSON.stringify(state.orderParams));
  }
  if(state.searchParams && Object.keys(state.searchParams).length) {
    params.set('searchParams', JSON.stringify(state.searchParams));
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

function formatCurrency(number) {
  if(!number) {
    return '$0.00';
  }
  return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(number)).replace(',', '.')}`;
}

export {
  fetchUserSchema,
  createForm,
  attachValidationListeners,
  getFormTypeBasedOnUrl,
  getUserStatus,
  loadCaptchaImage,
  attachCaptchaRefreshHandler,
  hasPermission,
  createNavigation,
  createBackofficeNavigation,
  fetchWithErrorHandling,
  showToastMessage,
  populateFormFields,
  getUrlParams,
  updateUrlParams,
  formatCurrency,
};
