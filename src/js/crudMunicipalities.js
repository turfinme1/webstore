import {
  validateMunicipalityCode,
  validateName,
  validateNameEn,
} from "../util/validation.js";

const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

const regionMap = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  await fetchRegions();
  fetchMunicipalities();
});

async function fetchRegions() {
  try {
    const res = await fetch("/regions");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      populateRegionSelect(data);
      data.forEach((region) => {
        regionMap.set(region.id, region.name);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching regions.";
  }
}

async function fetchMunicipalities() {
  try {
    const res = await fetch("/municipalities");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      data.forEach((municipality) => {
        municipality.region_name = regionMap.get(municipality.region_id);
        addTableRow(municipality);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent =
      "An error occurred while fetching municipalities.";
  }
}

function populateRegionSelect(regions) {
  const regionSelect = document.getElementById("region-id");
  const updateRegionSelect = document.getElementById("update-region-id");

  regions.forEach((region) => {
    const option = createOption(region.id, region.name);
    const updateOption = createOption(region.id, region.name);
    regionSelect.appendChild(option);
    updateRegionSelect.appendChild(updateOption);
  });
}

function createOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  console.log(option);
  return option;
}

createForm.addEventListener("submit", handleCreateFormSubmit);

async function handleCreateFormSubmit(e) {
  e.preventDefault();
  const municipalityCode = document.getElementById("municipality-code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name-en").value;
  const regionId = document.getElementById("region-id").value;

  const validationError =
    validateMunicipalityCode(municipalityCode) ||
    validateName(name) ||
    validateNameEn(nameEn);
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
    const res = await fetch("/municipalities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.errors) {
      errorMessage.textContent = data.errors;
    } else {
      data.region_name = regionMap.get(regionId);
      addTableRow(data);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
}

function addTableRow(data) {
  const row = createTableRow(data);
  tbody.insertBefore(row, tbody.firstChild);
}

function createTableRow(data) {
  const row = document.createElement("tr");

  const municipalityCodeCell = createTableCell(data.municipality_code);
  const nameCell = createTableCell(data.name);
  const nameEnCell = createTableCell(data.name_en);
  const regionNameCell = createTableCell(data.region_name);

  const actionsCell = document.createElement("td");
  const updateBtn = createActionButton("Edit", () => showUpdateForm(data, row));
  const deleteBtn = createActionButton("Delete", () =>
    deleteHandler(data, row)
  );

  actionsCell.appendChild(updateBtn);
  actionsCell.appendChild(deleteBtn);

  row.appendChild(municipalityCodeCell);
  row.appendChild(nameCell);
  row.appendChild(nameEnCell);
  row.appendChild(regionNameCell);
  row.appendChild(actionsCell);

  return row;
}

function createTableCell(textContent) {
  const cell = document.createElement("td");
  cell.textContent = textContent;
  return cell;
}

function createActionButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function deleteHandler(rowData, row) {
  try {
    const res = await fetch(`/municipalities?id=${rowData.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.id === rowData.id) {
      row.remove();
    } else {
      errorMessage.textContent = data.error;
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while deleting.";
  }
}

async function showUpdateForm(data, row) {
  updateErrorMessage.textContent = "";
  try {
    const res = await fetch(`/municipalities?id=${data.id}`);
    const latestData = await res.json();
    if (latestData.error) {
      updateErrorMessage.textContent = latestData.error;
    } else {
      fillUpdateForm(latestData, row);
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while fetching.";
  }
}

function fillUpdateForm(data, row) {
  document.getElementById("update-id").value = data.id;
  document.getElementById("update-municipality-code").value =
    data.municipality_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-region-id").value = data.region_id;

  createForm.style.display = "none";
  updateContainer.style.display = "block";

  updateForm.onsubmit = (e) => {
    e.preventDefault();
    updateHandler(data.id, row);
  };

  document.getElementById("cancel-btn").onclick = () => {
    createForm.style.display = "block";
    updateContainer.style.display = "none";
    updateErrorMessage.textContent = "";
  };
}

async function updateHandler(id, row) {
  const municipalityCode = document.getElementById(
    "update-municipality-code"
  ).value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name-en").value;
  const regionId = document.getElementById("update-region-id").value;

  const validationError =
    validateMunicipalityCode(municipalityCode) ||
    validateName(name) ||
    validateNameEn(nameEn);
  if (validationError) {
    updateErrorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    municipality_code: municipalityCode,
    name,
    name_en: nameEn,
    region_id: regionId,
  };

  try {
    const res = await fetch(`/municipalities?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.error) {
      updateErrorMessage.textContent = data.error;
    } else {
      updateTableRow(row, { municipalityCode, name, nameEn, regionId });
      resetForm();
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
}

function updateTableRow(row, data) {
  const regionName = regionMap.get(data.regionId);
  row.cells[0].textContent = data.municipalityCode;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.nameEn;
  row.cells[3].textContent = regionName;
}

function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
