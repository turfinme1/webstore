import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

let state = {
  userStatus: null,
  emailTemplateId: null,
  templates: [],
};

const elements = {
  mainContainer: document.getElementById("main-container"),
  templateForm: document.getElementById("template-form"),
  templateNameSelect: document.getElementById("name"),
  subjectInput: document.getElementById("subject"),
  templateInput: document.getElementById("template"),
  placeholderArea: document.getElementById("placeholders"),
  tableBorderColorInput: document.getElementById("table-border-color"),
  tableBorderWidthInput: document.getElementById("table-border-width"),
  borderCustomizationElements: document.querySelectorAll(".border-customization"),
  sendTestEmailButton: document.getElementById("send-test-email"),
  previewEmailButton: document.getElementById("preview-email"),
  createTemplateButton: document.getElementById("create-template"),
  typeSelect: document.getElementById("type"),
  nameSelect: document.getElementById("name"),
  nameInput: document.getElementById("template_name"),
  displayCreateTemplateButton: document.getElementById("add-template"),
  displayEditTemplateButton: document.getElementById("edit-template"),
  saveButton: document.getElementById("save"),
};

document.addEventListener("DOMContentLoaded", async () => {
  state.userStatus = await getUserStatus();
  createNavigation(state.userStatus);
  createBackofficeNavigation(state.userStatus);
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
  populateTemplateNameSelect("Email");
  attachEventListeners();

  if (state.templates.length > 0) {
    const firstTemplate = state.templates.filter(template=> template.type === "Email")[0];
    state.emailTemplateId = firstTemplate.id;
    populateTemplateForm(firstTemplate);
  }
  await loadCurrentTemplate();
});

async function getTemplates() {
  try {
    const response = await fetchWithErrorHandling("/crud/email-templates");
    if (response.ok) {
      const templates = await response.data;
      state.templates = templates;
    } else {
      showToastMessage(response.error, "error");
    }
  } catch (error) {
    showToastMessage("Error while fetching templates", "error");
  }
}

async function populateTemplateNameSelect(templateTypeFilter) {
  elements.templateNameSelect.innerHTML = "";
  const templateTypes = state.templates.filter(template=> template.type === templateTypeFilter).map((template) => template.name);
  templateTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.templateNameSelect.appendChild(option);
  });
}

function attachEventListeners() {
  elements.templateForm.addEventListener("submit", handleTemplateFormSubmit);
  elements.templateNameSelect.addEventListener("change", loadCurrentTemplate);
  elements.sendTestEmailButton.addEventListener("click", handleSendTestEmail);
  elements.previewEmailButton.addEventListener("click", handlePreviewEmail);
  elements.createTemplateButton.addEventListener("click", handleCreateTemplate);
  elements.displayCreateTemplateButton.addEventListener("click", handleDisplayCreateTemplate);
  elements.displayEditTemplateButton.addEventListener("click", handleDisplayEditTemplate);
  elements.typeSelect.addEventListener("change", handleTypeSelectChange);
}

function handleDisplayCreateTemplate() {
  elements.nameInput.style.display = "block";
  elements.typeSelect.value = "Notification";
  elements.typeSelect.disabled = true;
  elements.nameInput.value = "";
  elements.nameSelect.style.display = "none";
  const notificationTemplate = state.templates.find(template => template.type === "Notification");
  populateTemplateForm(notificationTemplate);
  elements.borderCustomizationElements.forEach(element => element.style.display = "none");
  elements.createTemplateButton.style.display = "";
  elements.saveButton.style.display = "none";
}

function handleDisplayEditTemplate() {
  elements.nameInput.style.display = "none";
  elements.typeSelect.style.display = "block";
  elements.nameInput.value = "";
  elements.nameSelect.style.display = "";
  elements.saveButton.style.display = "";
  elements.typeSelect.value = "Email";
  elements.typeSelect.disabled = false;
  const notificationTemplate = state.templates.find(template => template.type !== "Notification");
  populateTemplateForm(notificationTemplate);
}

async function handleTemplateFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.templateForm);
  const name = formData.get("name");
  const subject = formData.get("subject");
  const template = CKEDITOR.instances.template.getData();
  console.log({ name: name, subject, template });
  const data = Object.fromEntries(formData);
  data.template = template;    
  if(elements.templateNameSelect.value === "Email verification") {
    data.table_border_color = null;
    data.table_border_width = null;
  }
  const response = await fetchWithErrorHandling(
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
    showToastMessage("Template saved", "success");
    await getTemplates();
  } else {
    showToastMessage(response.error, "error");
  }
}

async function loadCurrentTemplate() {
  const name = elements.templateNameSelect.value;
  const currentTemplate = state.templates.find(
    (template) => template.name === name
  );
  const templateId = currentTemplate.id;
  state.emailTemplateId = templateId;
  console.log(currentTemplate);

  try {
    const response = await fetchWithErrorHandling(
      `/crud/email-templates/${state.emailTemplateId}`
    );
    if (response.ok) {
      const emailTemplate = await response.data;
      populateTemplateForm(emailTemplate);
    } else {
      showToastMessage(response.error, "error");
    }
  } catch (error) {
    console.error("fetch error", error);
  }
}

function populateTemplateForm(template) {
 
  if (elements.templateNameSelect.value  === "Order created" || elements.templateNameSelect.value  === "Order paid") {
    elements.borderCustomizationElements.forEach(element => element.style.display = "block");
    elements.tableBorderColorInput.value = template.table_border_color;
    elements.tableBorderWidthInput.value = template.table_border_width;
    elements.createTemplateButton.style.display = "none";
  } else {
      elements.borderCustomizationElements.forEach(element => element.style.display = "none");
      elements.createTemplateButton.style.display = "none";
  }
  elements.templateNameSelect.value = template.name;
  elements.subjectInput.value = template.subject;
  CKEDITOR.instances.template.setData(template.template);
  elements.placeholderArea.innerHTML =
    "Available placeholders: " + template.placeholders.join(", ") ||
    "No placeholders";
}

async function handleSendTestEmail() {
  const emailType = elements.templateNameSelect.value.replace(/\s/g, "-").toLowerCase();
  const response = await fetchWithErrorHandling(`/api/test-email/${emailType}`);

  if (response.ok) {
    showToastMessage("Test email sent", "success");
  } else {
    showToastMessage(response.error, "error");
  }
}

async function handlePreviewEmail() {
  const emailType = elements.templateNameSelect.value.replace(/\s/g, "-").toLowerCase();
  const response = await fetchWithErrorHandling(`/api/preview-email/${emailType}`);

  try {
    if (response.ok) {
      const email = await response.data;
      const modal = document.createElement("div");
      modal.style.position = "fixed";
      modal.style.top = "0";
      modal.style.left = "0";
      modal.style.width = "100vw";
      modal.style.height = "100vh";
      modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      modal.style.display = "flex";
      modal.style.justifyContent = "center";
      modal.style.alignItems = "center";
      modal.addEventListener("click", () => {
        modal.remove();
      });
      
      const iframe = document.createElement("iframe");
      iframe.style.width = "80%";
      iframe.style.height = "80%";
      iframe.style.backgroundColor = "white";
      iframe.style.border = "none";
      iframe.srcdoc = email;

      modal.appendChild(iframe);
      document.body.appendChild(modal);
    } else {
      showToastMessage(response.error, "error");
    }
  }
  catch (error) {
    console.error("fetch error", error);
  }
}

async function handleCreateTemplate(event) {
  event.preventDefault();

  const formData = new FormData(elements.templateForm);
  const type = formData.get("type");
  const subject = formData.get("subject");
  const template = CKEDITOR.instances.template.getData();
  console.log({ type, subject, template });
  const data = Object.fromEntries(formData);
  data.template = template;
  data.table_border_color = null;
  data.table_border_width = null;
  data.name = data.template_name;
  data.type = "Notification";
  const notificationTemplate = state.templates.find(template => template.type === "Notification");
  data.placeholders = JSON.stringify(notificationTemplate.placeholders);
  if(data.template_name.length <= 2) {
    showToastMessage("Please select a type", "error");
    return;
  }
  if(data.subject.length <= 2) {
    showToastMessage("Please enter a subject", "error");
    return;
  }
  const response = await fetchWithErrorHandling(`/crud/email-templates`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (response.ok) {
    showToastMessage("Template saved", "success");
    await getTemplates();
  } else {
    showToastMessage(response.error, "error");
  }
}

async function handleTypeSelectChange() {
  populateTemplateNameSelect(elements.typeSelect.value);
}
