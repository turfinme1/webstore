import { fetchData, createTableRow } from "../util/crudUtilities.js";
import {
  validateMunicipalityCode,
  validateName,
  validateNameEn,
  validateReferenceId,
} from "../util/validation.js";

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

function populateSelect(id, options) {
  const select = document.getElementById(id);
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.name;
    select.appendChild(opt);
  });
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const municipalityCode = document.getElementById("municipality-code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name-en").value;
  const regionId = document.getElementById("region-id").value;

  const validationError =
    validateMunicipalityCode(municipalityCode) ||
    validateName(name) ||
    validateNameEn(nameEn) ||
    validateReferenceId("Region", regionId);;
  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    municipality_code: municipalityCode,
    name,
    name_en: nameEn,
    region_id: regionId,
  };

  try {
    const data = await fetchData("/municipalities", "POST", requestData);
    if (data.errors) {
      errorMessage.textContent = data.errors;
    } else {
      data.region_name = regionMap.get(regionId);
      addTableRow(data);
      errorMessage.textContent = "";
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
});

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

function generateTableBody(table, data) {
  const tbody = table.createTBody();
  data.forEach((municipality) => {
    const row = createTableRow(municipality, showUpdateForm, deleteHandler);
    tbody.appendChild(row);
  });
}

function addTableRow(data) {
  const table = document.querySelector("table");
  const tbody = table.querySelector("tbody");
  const row = createTableRow(data, showUpdateForm, deleteHandler);

  tbody.insertBefore(row, tbody.firstChild);
}

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

function showUpdateForm(data) {
  document.getElementById("update-id").value = data.id;
  document.getElementById("update-municipality-code").value =
    data.municipality_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-region-id").value = data.region_id;

  createForm.style.display = "none";
  updateContainer.style.display = "block";
  updateErrorMessage.textContent = "";

  updateForm.onsubmit = async (e) => {
    e.preventDefault();
    const updatedData = {
      municipality_code: document.getElementById("update-municipality-code")
        .value,
      name: document.getElementById("update-name").value,
      name_en: document.getElementById("update-name-en").value,
      region_id: document.getElementById("update-region-id").value,
    };

    const validationError =
      validateMunicipalityCode(updatedData.municipality_code) ||
      validateName(updatedData.name) ||
      validateNameEn(updatedData.name_en) ||
      validateReferenceId("Region", updatedData.region_id);
    if (validationError) {
      updateErrorMessage.textContent = validationError;
      return;
    }

    try {
      const response = await fetchData(
        `/municipalities?id=${data.id}`,
        "PUT",
        updatedData
      );
      if (response.errors) {
        updateErrorMessage.textContent = response.errors;
      } else {
        updateTableRow(
          document.querySelector(`tr[data-id='${data.id}']`),
          updatedData
        );
        resetForm();
      }
    } catch (error) {
      console.error("Error:", error);
      updateErrorMessage.textContent = "An error occurred while updating.";
    }
  };

  document.getElementById("cancel-btn").onclick = resetForm;
}

function updateTableRow(row, data) {
  row.cells[0].textContent = data.municipality_code;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.name_en;
  row.cells[3].textContent = regionMap.get(data.region_id);
}

function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
