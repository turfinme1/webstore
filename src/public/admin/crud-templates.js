import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage, getUrlParams, updateUrlParams } from "./page-utility.js";

// Centralized state object
const state = {
    templates: [],
    currentTemplateId: null,
    userStatus: null,
    filterParams: {},
    orderParams: [],
    currentPage: 1,
    pageSize: 10,
};

// DOM elements
const elements = {
    mainContainer: document.getElementById("main-container"),
    formContainer: document.getElementById("form-container"),
    formUpdateContainer: document.getElementById("form-update-container"),
    templateForm: document.getElementById("template-form"),
    templateUpdateForm: document.getElementById("template-update-form"),
    templateList: document.getElementById("template-list"),
    showFormButton: document.getElementById("show-form-btn"),
    cancelButton: document.getElementById("cancel-btn"),
    cancelUpdateButton: document.getElementById("cancel-update-btn"),
    borderCustomizationElements: document.querySelectorAll(".border-customization"),
    paginationContainer: document.getElementById("pagination-container"),
    currentPageDisplay: document.getElementById("current-page-display"),
    resultCountDisplay: document.getElementById("result-count"),
    placeholderArea: document.getElementById("placeholders"),

    showFilterButton: document.getElementById("show-filter-btn"),
    cancelFilterButton: document.getElementById("cancel-filter-btn"),
    filterContainer: document.getElementById("filter-container"),
    filterForm: document.getElementById("filter-form"),
    orderBySelect: document.getElementById("order_by"),
};

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
    state.userStatus = await getUserStatus();
    createNavigation(state.userStatus);
    createBackofficeNavigation(state.userStatus);
    const urlParams = getUrlParams();
    state.currentPage = urlParams.page || 1;
    state.pageSize = urlParams.pageSize || 10;
    state.filterParams = urlParams.filterParams || {};
    state.orderParams = urlParams.orderParams || [];

    // if (!hasPermission(state.userStatus, "read", "email-templates")) {
    //     elements.mainContainer.innerHTML = "<h1>Email Template Management</h1>";
    //     return;
    // }

    // Initialize CKEditor
    CKEDITOR.replace("template", {
        allowedContent: true,
        autoParagraph: false,
        enterMode: CKEDITOR.ENTER_BR,
        shiftEnterMode: CKEDITOR.ENTER_P,
    });

    CKEDITOR.replace("template-update", {
        allowedContent: true,
        autoParagraph: false,
        enterMode: CKEDITOR.ENTER_BR,
        shiftEnterMode: CKEDITOR.ENTER_P,
    });

    attachEventListeners();
    await loadTemplates(state.currentPage);
});

// Event Listeners
function attachEventListeners() {
    elements.templateForm.addEventListener("submit", handleCreateTemplate);
    elements.templateUpdateForm.addEventListener("submit", handleUpdateTemplate);
    elements.showFormButton.addEventListener("click", showForm);
    elements.cancelButton.addEventListener("click", hideForm);
    elements.cancelUpdateButton.addEventListener("click", hideUpdateForm);

    elements.showFilterButton.addEventListener("click", showFilterForm);
    elements.cancelFilterButton.addEventListener("click", hideFilterForm);
    elements.filterForm.addEventListener("submit", handleFilterTemplates);
    elements.orderBySelect.addEventListener("change", handleFilterTemplates);
}

// Show/Hide Forms
function showForm() {
    elements.formContainer.style.display = "block";
    elements.formUpdateContainer.style.display = "none";
    elements.filterContainer.style.display = "none";
}

function hideForm() {
    elements.formContainer.style.display = "none";
}

function showUpdateForm() {
    elements.formUpdateContainer.style.display = "block";
    elements.formContainer.style.display = "none";
    elements.filterContainer.style.display = "none";
}

function hideUpdateForm() {
    elements.formUpdateContainer.style.display = "none";
    elements.templateUpdateForm.reset();
}

function showFilterForm() {
    elements.filterContainer.style.display = "block";
    elements.formContainer.style.display = "none";
    elements.formUpdateContainer.style.display = "none";
}

function hideFilterForm() {
    elements.filterContainer.style.display = "none";
}

// API Functions
async function loadTemplates(page) {
    try {
        const queryParams = new URLSearchParams({
            filterParams: JSON.stringify(state.filterParams),
            orderParams: JSON.stringify(state.orderParams),
            pageSize: state.pageSize.toString(),
            page: page.toString(),
        });
        updateUrlParams(state);
        const response = await fetchWithErrorHandling(`/crud/email-templates/filtered?${queryParams.toString()}`);
        if (!response.ok) {
            showToastMessage(response.error, "error");
            return;
        }
        const { result, count } = await response.data;
        
        renderTemplateList(result);
        updatePagination(count, page);
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

// UI Functions
function renderTemplateList(templates) {
    elements.templateList.innerHTML = "";
    templates.forEach(async (template) => {
        const row = document.createElement("tr");

        const previewCell = document.createElement("td");
        
        previewCell.align = "center";
        const iframe = document.createElement("iframe");
        
        iframe.style.width = "100px";  
         iframe.style.height = "120px";
        iframe.style.border = "1px solid #dee2e6";
        iframe.scrolling = "no";
        iframe.style.overflow = "hidden";
    
        const response = await fetchWithErrorHandling(`/api/preview-email/${template.id}`);
        const email = await response.data;
    
        const scaledEmail = `
          <html>
            <head>
              <style>
                body { margin: 0; padding: 0; }
                .scale-wrapper {
                  transform: scale(0.2);
                  transform-origin: top left;
                  width: 500%; /* 1 / 0.4 = 500% so that the full content is visible */
                }
              </style>
            </head>
            <body>
              <div class="scale-wrapper">
                ${email}
              </div>
            </body>
          </html>
        `;
        iframe.srcdoc = scaledEmail;
        previewCell.appendChild(iframe);
        row.appendChild(previewCell);
        
        // Create cells
        row.appendChild(createTableCell(template.name));
        row.appendChild(createTableCell(template.type));
        row.appendChild(createTableCell(template.subject));

        // Actions cell
        const actionsCell = document.createElement("td");
        // if (hasPermission(state.userStatus, "update", "email-templates")) {
            actionsCell.appendChild(
                createActionButton("Edit", "btn-warning", () =>
                    displayUpdateForm(template.id)
                )
            );
        // }
        // if (hasPermission(state.userStatus, "delete", "email-templates")) {
            // actionsCell.appendChild(
            //     createActionButton("Delete", "btn-danger", () =>
            //         handleDeleteTemplate(template.id)
            //     )
            // );
        // }

        actionsCell.appendChild(
            createActionButton("Preview", "btn-warning", () =>
                handlePreviewEmail(template.id)
            )
        );
        
        if (template.type !== "Notification") {
            actionsCell.appendChild(
                createActionButton("Send test email", "btn-warning", () =>
                    handleSendTestEmail(template.id)
                )
            );
        }

        row.appendChild(actionsCell);

        elements.templateList.appendChild(row);
    });
}

function createTableCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

function createActionButton(text, btnClass, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add("btn", btnClass, "me-2");
    button.addEventListener("click", onClick);
    return button;
}

// Update pagination
function updatePagination(totalTemplates, page) {
    const totalPages = Math.ceil(totalTemplates / state.pageSize);
    elements.paginationContainer.innerHTML = "";
    elements.currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;
    elements.resultCountDisplay.textContent = `Found ${totalTemplates} results`;
  
    if (totalTemplates == 0) {
      elements.currentPageDisplay.innerHTML = "";
      return;
    }
  
    elements.paginationContainer.appendChild(
      createPaginationButton("Previous", page > 1, () => {
        state.currentPage = page - 1;
        loadTemplates(state.currentPage);
      })
    );
    elements.paginationContainer.appendChild(
      createPaginationButton("Next", page < totalPages, () => {
        state.currentPage = page + 1;
        loadTemplates(state.currentPage);
      })
    );
}
  
// Create pagination button
function createPaginationButton(text, enabled, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add("btn", "btn-secondary", "me-2");
    button.disabled = !enabled;
    if (enabled) button.addEventListener("click", onClick);
    return button;
}

async function displayUpdateForm(templateId) {
    try {
        const response = await fetchWithErrorHandling(
            `/crud/email-templates/${templateId}`
        );
        if (!response.ok) {
            showToastMessage(response.error, "error");
            return;
        }
        const template = await response.data;
        showUpdateForm();
        populateUpdateForm(template);
        state.currentTemplateId = templateId;
    } catch (error) {
        console.error("Error loading user for update:", error);
        showToastMessage("Error loading template", "error");
    }
}

function populateUpdateForm(template) {
    elements.templateUpdateForm["name-update"].value = template.name;
    elements.templateUpdateForm["type-update"].value = template.type;
    elements.templateUpdateForm["type-update"].disabled = true;
    elements.templateUpdateForm["subject-update"].value = template.subject;
    CKEDITOR.instances["template-update"].setData(template.template);
    elements.placeholderArea.innerHTML =
    "Available placeholders: " + template.placeholders.join(", ") ||
    "No placeholders";

    if (template.type !== "notification") {
        elements.borderCustomizationElements.forEach((element) => {
            element.style.display = "block";
        });
        elements.templateUpdateForm["table-border-color-update"].value = template.table_border_color;
        elements.templateUpdateForm["table-border-width-update"].value = template.table_border_width;
    } else {
        elements.borderCustomizationElements.forEach((element) => {
            element.style.display = "none";
        });
    }
}

async function handleCreateTemplate(event) {
    event.preventDefault();
    const formData = new FormData(elements.templateForm);
    const data = Object.fromEntries(formData);
    data.template = CKEDITOR.instances.template.getData();
    data.table_border_color = null;
    data.table_border_width = null;
    data.placeholders = JSON.stringify(["{first_name}","{last_name}","{email}","{phone}"]);
    try {
        const response = await fetchWithErrorHandling("/crud/email-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            showToastMessage("Template created successfully!", "success");
            elements.templateForm.reset();
            hideForm();
            await loadTemplates(state.currentPage);
        } else {
            showToastMessage(`Failed to create template: ${response.error}`, "error");
        }
    } catch (error) {
        console.error("Error creating user:", error);
    }
}

async function handleUpdateTemplate(event) {
    event.preventDefault();
    const formData = new FormData(elements.templateUpdateForm);
    const data = Object.fromEntries(formData);
    data.template = CKEDITOR.instances["template-update"].getData();
    data.type = elements.templateUpdateForm["type-update"].value;
    if (data.type !== "notification") {
        data.table_border_color = elements.templateUpdateForm["table-border-color-update"].value || null;
        data.table_border_width = elements.templateUpdateForm["table-border-width-update"].value || null;
    } else {
        data.table_border_color = null;
        data.table_border_width = null
    }
    try {
        const response = await fetchWithErrorHandling(
            `/crud/email-templates/${state.currentTemplateId}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );

        if (response.ok) {
            showToastMessage("Template updated successfully!", "success");
            hideUpdateForm();
            state.currentTemplateId = null;
            state.currentPage = 1;
            state.filterParams = {};
            await loadTemplates(state.currentPage);
        } else {
            showToastMessage(response.error, "error");
        }
    } catch (error) {
        showToastMessage("Error updating template", "error");
    }
}

async function handleDeleteTemplate(templateId) {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
        const response = await fetchWithErrorHandling(
            `/crud/email-templates/${templateId}`,
            { method: "DELETE" }
        );

        if (response.ok) {
            showToastMessage("Template deleted successfully!", "success");
            await loadTemplates();
        } else {
            showToastMessage(response.error, "error");
        }
    } catch (error) {
        showToastMessage("Error deleting template", "error");
    }
}


async function handleFilterTemplates(event) {
    event.preventDefault();
    const formData = new FormData(elements.filterForm);
    if (formData.get("country_id") === "") {
      formData.delete("country_id");
    }
    const filterParams = Object.fromEntries(formData);
    state.filterParams = filterParams;
  
    if(elements.orderBySelect.value){
      state.orderParams = [elements.orderBySelect.value.split(" ")];
    } else {
      state.orderParams = [];
    }
  
    state.currentPage = 1;
    loadTemplates(state.currentPage);
}

async function handleSendTestEmail(templateId) {
    try {
        // confirmation before sending test email
        if (!confirm("Are you sure you want to send a test email?")) return;
        const response = await fetchWithErrorHandling(`/api/test-email/${templateId}`);
        if (response.ok) {
            showToastMessage("Test email sent successfully!", "success");
        } else {
            showToastMessage(response.error, "error");
        }
    } catch (error) {
        console.error("Error sending test email:", error);
        showToastMessage("Error sending test email", "error");
    }
}

async function handlePreviewEmail(templateId) {
    const response = await fetchWithErrorHandling(`/api/preview-email/${templateId}`);

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