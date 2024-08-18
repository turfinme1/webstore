import Ajv from "ajv";
import addFormats from "ajv-formats";
import ajvErrors from "ajv-errors";

// Initialize AJV
const ajv = new Ajv.default({ allErrors: true });
addFormats(ajv);
ajvErrors(ajv);

// region and municipality schemas
const regionSchema = {
  type: "object",
  properties: {
    region_code: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z0-9]+$",
    },
    name_en: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z ]+$",
    },
    name: {
      type: "string",
      minLength: 3,
      pattern: "^[а-яА-Я ]+$",
    },
  },
  required: ["region_code", "name_en", "name"],
  additionalProperties: false,
  errorMessage: {
    properties: {
      region_code:
        "Region code must be at least 3 characters long and contain only Latin letters and digits.",
      name_en:
        "Name (EN) must be at least 3 characters long and contain only Latin letters and spaces.",
      name: "Name must be at least 3 characters long and contain only Cyrillic letters and spaces.",
    },
    required: {
      region_code: "Region code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};

const municipalitySchema = {
  type: "object",
  properties: {
    municipality_code: {
      type: "string",
      minLength: 5,
      pattern: "^[a-zA-Z0-9]+$",
    },
    name_en: {
      type: "string",
      minLength: 3,
      pattern: "^[a-zA-Z ]+$",
    },
    name: {
      type: "string",
      minLength: 3,
      pattern: "^[а-яА-Я ]+$",
    },
    region_id: {
      type: "string",
      minLength: 1,
      pattern: "^[0-9]+$",
    },
  },
  required: ["municipality_code", "name_en", "name", "region_id"],
  additionalProperties: false,
  errorMessage: {
    properties: {
      municipality_code:
        "Municipality code must be at least 5 characters long and contain only Latin letters and digits.",
      name_en:
        "Name (EN) must be at least 3 characters long and contain only Latin letters and spaces.",
      name: "Name must be at least 3 characters long and contain only Cyrillic letters and spaces.",
      region_id: "Region ID must contain only digits and must not be empty.",
    },
    required: {
      municipality_code: "Municipality code is required.",
      name_en: "Name (EN) is required.",
      name: "Name is required.",
      region_id: "Region ID is required.",
    },
    additionalProperties: "No additional properties are allowed.",
  },
};

// compiles schemas with AJV
const validateRegion = ajv.compile(regionSchema);
const validateMunicipality = ajv.compile(municipalitySchema);

// DOM elements
const createForm = document.getElementById("create-form");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");
const regionMap = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  await initialize();
});

async function initialize() {
  await fetchRegions();
  await fetchMunicipalities();
}

// fetching regions
async function fetchRegions() {
  try {
    const regions = await fetchData("/regions");
    if (!regions.errors) {
      populateSelect("region-id", regions);
      populateSelect("update-region-id", regions);
      regions.forEach((region) => regionMap.set(region.id, region.name));
    } else {
      errorMessage.textContent = regions.errors;
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching regions.";
  }
}

// fetching municipalities
async function fetchMunicipalities() {
  try {
    const municipalities = await fetchData("/municipalities");
    if (!municipalities.errors) {
      generateTable(municipalities);
    } else {
      errorMessage.textContent = municipalities.errors;
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent =
      "An error occurred while fetching municipalities.";
  }
}

// populate select options
function populateSelect(id, options) {
  const select = document.getElementById(id);
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.name;
    select.appendChild(opt);
  });
}

// create form submit event
createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = getFormData("create");

  const validationError = validateMunicipality(formData)
    ? null
    : ajv.errorsText(validateMunicipality.errors);
  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  try {
    const data = await fetchData("/municipalities", "POST", formData);
    if (data.errors) {
      errorMessage.textContent = data.errors;
    } else {
      data.region_name = regionMap.get(formData.region_id);
      addTableRow(data);
      errorMessage.textContent = "";
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
});

// utility to get form data
function getFormData(formType) {
  if (formType === "create") {
    return {
      municipality_code: document.getElementById("municipality-code").value,
      name: document.getElementById("name").value,
      name_en: document.getElementById("name-en").value,
      region_id: document.getElementById("region-id").value,
    };
  } else {
    return {
      municipality_code: document.getElementById("update-municipality-code")
        .value,
      name: document.getElementById("update-name").value,
      name_en: document.getElementById("update-name-en").value,
      region_id: document.getElementById("update-region-id").value,
    };
  }
}

// generate table for data
function generateTable(data) {
  const container = document.getElementById("table-container");
  container.innerHTML = "";

  if (data.length === 0) {
    return;
  }

  const table = document.createElement("table");
  const columnNames = [
    "municipality_code",
    "name_en",
    "name",
    "region_name",
    "actions",
  ];

  generateTableHead(table, columnNames);
  generateTableBody(table, data);

  container.appendChild(table);
}

// generate table head
function generateTableHead(table, columnNames) {
  const thead = table.createTHead();
  const row = thead.insertRow();
  columnNames.forEach((name) => {
    const th = document.createElement("th");
    const text = document.createTextNode(name.replaceAll("_", " "));
    th.appendChild(text);
    row.appendChild(th);
  });
}

// generate table body
function generateTableBody(table, data) {
  const tbody = table.createTBody();
  data.forEach((municipality) => {
    const row = createTableRow(municipality, showUpdateForm, deleteHandler);
    tbody.appendChild(row);
  });
}

// add table row
function addTableRow(data) {
  const table = document.querySelector("table");
  const tbody = table.querySelector("tbody");
  const row = createTableRow(data, showUpdateForm, deleteHandler);

  tbody.insertBefore(row, tbody.firstChild);
}

// delete handler
async function deleteHandler(data) {
  const userConfirmed = window.confirm(
    `Are you sure you want to delete ${data.name}?`
  );

  if (userConfirmed) {
    try {
      const response = await fetchData(
        `/municipalities?id=${data.id}`,
        "DELETE"
      );
      if (response.errors) {
        errorMessage.textContent = response.errors;
      } else {
        const row = document.querySelector(`tr[data-id='${data.id}']`);
        if (row) {
          row.remove();
        }
      }
    } catch (error) {
      console.error("Error:", error);
      errorMessage.textContent = "An error occurred while deleting.";
    }
  }
}

// update handler
async function updateHandler(e) {
  e.preventDefault();
  const formData = getFormData("update");

  const validationError = validateMunicipality(formData)
    ? null
    : ajv.errorsText(validateMunicipality.errors);
  if (validationError) {
    updateErrorMessage.textContent = validationError;
    return;
  }

  try {
    const response = await fetchData(`/municipalities?id=${updateContainer.dataset.id}`, "PUT", {
      ...formData,
    });
    if (response.errors) {
      updateErrorMessage.textContent = response.errors;
    } else {
      const row = document.querySelector(
        `tr[data-id='${updateContainer.dataset.id}']`
      );
      updateTableRow(row, formData);
      hideUpdateForm();
      updateErrorMessage.textContent = "";
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
}

// update table row
function updateTableRow(row, data) {
  row.cells[0].textContent = data.municipality_code;
  row.cells[1].textContent = data.name_en;
  row.cells[2].textContent = data.name;
  row.cells[3].textContent = regionMap.get(data.region_id);
}

// show update form
function showUpdateForm(data) {
  updateContainer.dataset.id = data.id;
  document.getElementById("update-municipality-code").value =
    data.municipality_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-region-id").value = data.region_id;

  updateContainer.style.display = "block";
}

// hide update form
function hideUpdateForm() {
  updateContainer.style.display = "none";
}

// event listener for update form
updateForm.addEventListener("submit", updateHandler);
document
  .getElementById("update-cancel")
  .addEventListener("click", hideUpdateForm);

async function fetchData(url, method = "GET", body = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    };

    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return { errors: "Network error occurred." };
  }
}

// create a table row for given data
function createTableRow(data, showUpdateForm, deleteHandler) {
  const row = document.createElement("tr");
  row.dataset.id = data.id;

  Object.keys(data).forEach((key) => {
    if (key !== "id") {
      const cell = document.createElement("td");
      cell.textContent = data[key];
      row.appendChild(cell);
    }
  });

  const actionsCell = document.createElement("td");

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => showUpdateForm(data));
  actionsCell.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteHandler(data));
  actionsCell.appendChild(deleteButton);

  row.appendChild(actionsCell);

  return row;
}
