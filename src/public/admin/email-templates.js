import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";

let state = {
  userStatus: null,
  emailTemplateId: null,
  templates: [],
};

const elements = {
  mainContainer: document.getElementById("main-container"),
  templateForm: document.getElementById("template-form"),
  templateTypeSelect: document.getElementById("type"),
  subjectInput: document.getElementById("subject"),
  templateInput: document.getElementById("template"),
  placeholderArea: document.getElementById("placeholders"),
  tableBorderColorInput: document.getElementById("table-border-color"),
  tableBorderWidthInput: document.getElementById("table-border-width"),
  borderCustomizationElements: document.querySelectorAll(".border-customization"),
  sendTestEmailButton: document.getElementById("send-test-email"),
  previewEmailButton: document.getElementById("preview-email"),
};

document.addEventListener("DOMContentLoaded", async () => {
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus);
  createBackofficeNavigation(state.userStatus);
  await attachLogoutHandler();
  // if (!hasPermission(state.userStatus, 'read', "site-settings")) {
  // 	window.location = '/login.html';
  // }

  CKEDITOR.replace("template", {
    allowedContent: true,
    autoParagraph: false,
    enterMode: CKEDITOR.ENTER_BR,
    shiftEnterMode: CKEDITOR.ENTER_P,
  });

  await getTemplates();
  populateTemplateTypeSelect();
  attachEventListeners();

  if (state.templates.length > 0) {
    state.emailTemplateId = state.templates[0].id;
    populateTemplateForm(state.templates[0]);
  }
  await loadCurrentTemplate();
});

async function getTemplates() {
  try {
    const response = await fetch("/crud/email-templates");
    if (response.ok) {
      const templates = await response.json();
      state.templates = templates;
    } else {
      alert("Error fetching templates");
    }
  } catch (error) {
    alert("Error fetching templates");
  }
}

async function populateTemplateTypeSelect() {
  const templateTypes = state.templates.map((template) => template.type);
  templateTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.templateTypeSelect.appendChild(option);
  });
}

function attachEventListeners() {
  elements.templateForm.addEventListener("submit", handleTemplateFormSubmit);
  elements.templateTypeSelect.addEventListener("change", loadCurrentTemplate);
  elements.sendTestEmailButton.addEventListener("click", handleSendTestEmail);
  // elements.previewEmailButton.addEventListener("click", handlePreviewEmail);
}

async function handleTemplateFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.templateForm);
  const type = formData.get("type");
  const subject = formData.get("subject");
  const template = CKEDITOR.instances.template.getData();
  console.log({ type, subject, template });
  const data = Object.fromEntries(formData);
  data.template = template;
  if(elements.templateTypeSelect.value === "Email verification") {
    data.table_border_color = null;
    data.table_border_width = null;
  }
  const response = await fetch(
    `/crud/email-templates/${state.emailTemplateId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (response.ok) {
    alert("Template saved!");
    await getTemplates();
  } else {
    const apiError = await response.json();
    const errorMessage = apiError.error || "Error saving template";
    alert(errorMessage);
  }
}

async function loadCurrentTemplate() {
  const type = elements.templateTypeSelect.value;
  const currentTemplate = state.templates.find(
    (template) => template.type === type
  );
  const templateId = currentTemplate.id;
  state.emailTemplateId = templateId;
  console.log(currentTemplate);

  try {
    const response = await fetch(
      `/crud/email-templates/${state.emailTemplateId}`
    );
    if (response.ok) {
      const emailTemplate = await response.json();
      populateTemplateForm(emailTemplate);
    } else {
      alert("error!");
    }
  } catch (error) {
    console.error("fetch error", error);
  }
}

function populateTemplateForm(template) {
 
  if (elements.templateTypeSelect.value  === "Order created" || elements.templateTypeSelect.value  === "Order paid") {
    elements.borderCustomizationElements.forEach(element => element.style.display = "block");
    elements.tableBorderColorInput.value = template.table_border_color;
    elements.tableBorderWidthInput.value = template.table_border_width;
  } else {
      elements.borderCustomizationElements.forEach(element => element.style.display = "none");
  }
  elements.templateTypeSelect.value = template.type;
  elements.subjectInput.value = template.subject;
  CKEDITOR.instances.template.setData(template.template);
  elements.placeholderArea.innerHTML =
    "Available placeholders: " + template.placeholders.join(", ") ||
    "No placeholders";
}

async function handleSendTestEmail() {
  const emailType = elements.templateTypeSelect.value.replace(/\s/g, "-").toLowerCase();
  const response = await fetch(`/api/test-email/${emailType}`);

  if (response.ok) {
    alert("Test email sent!");
  } else {
    alert("Error sending test email");
  }
}