import * as WebSocketClientModule from "./websocketClient.js";
import { HttpTransport, WebSocketTransport } from "./transport.js";

let transport = new HttpTransport();

async function fetchUserSchema(url) {
  const response = await fetchWithErrorHandling(url);
  if (!response.ok) throw new Error("Failed to fetch schema");
  return response.data;
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

    } else if (schema.properties[key]?.format === "time") {
      const input = document.createElement("input");
      input.type = "time";
      input.id = key;
      input.name = key;
      input.className = "form-control";

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
  const response = await fetchWithErrorHandling(url);
  if (!response.ok) throw new Error("Failed to fetch user data");
  const userData = response.data;

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
        case "time":
          const localTime = userData[key].split(':').slice(0, 2).join(':');
          
          input.value = localTime;
          break;
        default:
          input.value = userData[key] ?? "";
      }
    }
  });
}

async function fetchCountryCodes(apiUrl) {
  try {
    const response = await fetchWithErrorHandling(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch country codes");
    // return await response.json();
    return response.data;
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
  const response = await fetchWithErrorHandling("/auth/status");
  return response.data;
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
                    ${userStatus.user_type !== "admin" 
                      ? `
                      <li class="nav-item">
                          <a class="nav-link" href="/index.html">Products</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link" href="/cart">My Cart</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link subscribe-button">Subscribe</a>
                      </li>` 
                      : ""}
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
                      ${userStatus.user_type !== "admin" 
                        ? `
                        <li class="nav-item position-relative">
                            <a class="nav-link" href="#" id="notification-bell" data-bs-toggle="modal" data-bs-target="#notificationsModal">
                                <div>🔔</div>
                                <span id="notification-count" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display: none"></span>
                            </a>
                        </li>`
                        : ""}
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

        <!-- Notifications Modal -->
        <div class="modal fade" id="notificationsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <h5 class="modal-title">
                            <i class="fas fa-bell me-2"></i>
                            Notifications
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="notifications-list" class="notifications-container">
                            <div class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
  `;

  document.body.prepend(navBar);

  initSubscriptionButton(userStatus);

  const logoutButton = document.querySelector(".logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const response = await fetchWithErrorHandling("/auth/logout");
      window.location.href = "/index";
    });
  }

  if (userStatus.session_type === "Authenticated" && userStatus.user_type === "user") {
    updateNotificationsList();
  }

  window.addEventListener('notification', async (e) => {
    console.log('New notification received:', e.data);
    await updateNotificationsList();
    showMessage("You have a new notification");
  });
}

async function initSubscriptionButton(userStatus) {
  const subscribeButton = document.querySelector(".subscribe-button");
  if (!subscribeButton) return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  subscribeButton.textContent = subscription ? 'Unsubscribe' : 'Subscribe';

  if(subscription && userStatus.session_type === "Authenticated") {
    try{
      const response = await fetchWithErrorHandling("/api/subscriptions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  }

  setupPermissionChangeListener();

  subscribeButton.addEventListener("click", async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BJ7UuFCX99N49hlHSrTP76J_88LdIDJQ0YWuMVvC2O7GHI12eLNZK5_MGuD1leViV28gGoG1YwpYv8l3Y1yWoaU',
      });
      await fetchWithErrorHandling("/api/subscriptions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      subscribeButton.textContent = 'Unsubscribe';
      window.subscription = subscription;
    } else {
      await subscription.unsubscribe();
      await fetchWithErrorHandling(`/api/subscriptions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      subscribeButton.textContent = 'Subscribe';
      subscription = null;
      window.subscription = null;
    }
  });
}

function setupPermissionChangeListener() {
  // Store current permission state
  let currentPermission = Notification.permission;
  
  // Check if browser supports the Permissions API
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'notifications' })
      .then(permissionStatus => {
        // Listen for permission changes
        permissionStatus.onchange = async () => {
          const newPermission = Notification.permission;
          console.log(`Notification permission changed: ${currentPermission} → ${newPermission}`);
          const subscription = window?.subscription;
          
          // If permission changed from granted to denied/blocked and we have a subscription
          if (currentPermission === 'granted' && 
              newPermission !== 'granted' && 
              subscription) {
            try {
              console.log('Updating subscription status to blocked');
              subscription.status = 'blocked';
              const body = subscription.toJSON();
              body.status = subscription.status; 
              await fetchWithErrorHandling("/api/subscriptions", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
            } catch (error) {
              console.error('Error updating subscription status:', error);
            }
          }
          
          currentPermission = newPermission;
        };
      });
  } else {
    // Fallback for browsers without Permissions API
    // Use visibility change as opportunity to check permission changes
    document.addEventListener('visibilitychange', async () => {
      const subscription = window?.subscription;

      if (document.visibilityState === 'visible') {
        const newPermission = Notification.permission;
        if (currentPermission === 'granted' && 
            newPermission !== 'granted' && 
            subscription) {
          try {
            console.log('Visibility change - updating subscription status');
            subscription.status = 'blocked';
            const body = subscription.toJSON();
            body.status = subscription.status; 
            await fetchWithErrorHandling("/api/subscriptions", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
          } catch (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        currentPermission = newPermission;
      }
    });
  }
}

async function updateNotificationsList() {
  const notifications = await loadNotifications();
  const notificationCount = document.getElementById('notification-count');
  const bellIcon = document.getElementById('notification-bell');
  
  if (notifications.length > 0) {
      notificationCount.textContent = notifications.filter(n => n.status !== 'seen').length;
      notificationCount.style.display = 'inline';
  } else {
      notificationCount.style.display = 'none';
  }

  const notificationsList = document.getElementById('notifications-list');
  const notificationsHtml = notifications.length ? notifications.map(notification => `
    <div class="notification-card" 
         data-id="${notification.id}" 
         data-read="${notification.status === 'seen'}"
         style="padding: 1rem; 
                border-bottom: 1px solid #dee2e6; 
                cursor: pointer; 
                transition: background-color 0.2s ease;">
        <div style="display: flex; 
                    justify-content: space-between; 
                    align-items: center;">
            <div style="font-weight: ${notification.status === 'seen' ? 'normal' : '500'}; 
                        color: #212529;">
                <i class="fas ${notification.status === 'seen' ? 'fa-envelope-open' : 'fa-envelope'} me-2"></i>
                ${notification.subject}
            </div>
            <div style="font-size: 0.875rem; color: #6c757d;">
                ${new Date(notification.created_at).toLocaleString()}
            </div>
        </div>
        <div style="display: none; 
                    margin-top: 1rem; 
                    padding-top: 1rem; 
                    border-top: 1px solid #dee2e6; 
                    transition: max-height 0.3s ease-out; 
                    overflow: hidden;">
            ${notification.text_content}
        </div>
    </div>
  `).join('') : `
      <div style="text-align: center; padding: 1.5rem 0;">
          <i class="fas fa-check-circle fa-2x mb-2" style="color: #6c757d;"></i>
          <p style="margin-bottom: 0;">No new notifications</p>
      </div>
  `;
  notificationsList.innerHTML = notificationsHtml;

  notificationsList.querySelectorAll('.notification-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.backgroundColor = '#f8f9fa';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.backgroundColor = 'transparent';
    });

    card.addEventListener('click', async function() {
        const content = this.children[1];
        const isRead = this.dataset.read === 'true';
        const id = this.dataset.id;

        if (!isRead) {
            await markNotificationAsRead(id);
            this.dataset.read = 'true';
            this.children[0].children[0].style.fontWeight = 'normal';
            this.querySelector('.fa-envelope').classList.replace('fa-envelope', 'fa-envelope-open');
            updateNotificationCount();
        }

        // Toggle content
        if (content.style.display === 'none') {
            content.style.display = 'block';
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            content.style.maxHeight = null;
            content.style.display = 'none';
        }
    });
  });

  notificationsList.querySelectorAll('.mark-read').forEach(button => {
      button.addEventListener('click', async () => {
          await markNotificationAsRead(button.dataset.id);
          await updateNotificationsList();
      });
  });
}

async function updateNotificationCount() {
  const notifications = await loadNotifications();
  const notificationCount = document.getElementById('notification-count');
  
  if (notifications.length > 0) {
      notificationCount.textContent = notifications.filter(n => n.status !== 'seen').length;
      notificationCount.style.display = 'inline';
  } else {
      notificationCount.style.display = 'none';
  }
}

async function loadNotifications() {
  try {
      const response = await fetchWithErrorHandling('/api/notifications');
      if (!response.ok) return [];
      const data = response.data;
      return data;
  } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
  }
}

async function markNotificationAsRead(notificationId) {
  try {
      return await fetchWithErrorHandling(`/api/notifications/${notificationId}`, {
          method: 'PUT'
      });
  } catch (error) {
      console.error('Error marking notification as read:', error);
  }
}

async function createBackofficeNavigation(userStatus) {
  const navContainer = document.getElementById("dynamic-nav");
  navContainer.innerHTML = ""; // Clear previous content


  const crudResult = await fetchWithErrorHandling("/api/crud");
  if (!crudResult.ok) {
    showErrorMessage(crudResult.error);
  }

  const crudLinks = crudResult.data.map((entity) => {
    if (entity.name.toLowerCase().includes("admin")) {
      return {
        text: `CRUD Staff Users`,
        href: entity.href,
        permission: "view",
        interface: entity.name,
      }
    }

    return {
      text: `CRUD ${entity.name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")}`,
      href: entity.href,
      permission: "view",
      interface: entity.name,
    };
  });

  const reportResults = await fetchWithErrorHandling("/api/reports");
  if (!reportResults.ok) {
    showErrorMessage(reportResults.error);
  }

  const reportLinks = reportResults.data.map((report) => {
    return {
      text: report.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
      href: `/report?report=${report}`,
      permission: "view",
      interface: report,
    };
  });
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
      text: "CRUD Products - JAVA",
      href: "/crud-product-java",
      permission: "view",
      interface: "products",
    },
    {
      id: "crud-user-link",
      text: "CRUD Users - JAVA",
      href: "/crud-user-java",
      permission: "view",
      interface: "users",
    },
    ...crudLinks,
    ...reportLinks,
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
    const response = await transport.fetch(url, options);
    const data = response.payload;

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
        error: "No internet connection. Please reconnect and try again.",
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

function showMessage(message) {
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
          "bg-success text-white"
        }">
          <strong class="me-auto">${
            "Success"
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

function showErrorMessage(message) {
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
          "bg-danger text-white"
        }">
          <strong class="me-auto">${
            "Error"
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

async function initializePage() {
  const frontOfficeTransportConfig = await fetchWithErrorHandling('/api/front-office-transport');
  const frontOfficeTransportConfigResult = frontOfficeTransportConfig.data;
  const webSocketClient = new WebSocketClientModule.WebSocketClient(frontOfficeTransportConfigResult.url);
  await webSocketClient.init();
  
  if (window.location.port === frontOfficeTransportConfigResult.front_office_port && frontOfficeTransportConfigResult.front_office_transport === "websocket") {
    transport = new WebSocketTransport(webSocketClient);
  }
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
  showMessage,
  showErrorMessage,
  populateFormFields,
  getUrlParams,
  updateUrlParams,
  formatCurrency,
  initializePage,
};
