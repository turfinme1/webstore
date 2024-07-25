import { createActionButton, createTableCell } from "../util/pageUtilities.js";
import {
  validateTownHallCode,
  validateName,
  validateNameEn,
} from "../util/validation.js";

const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

const municipalityMap = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  await fetchMunicipalities();
  fetchTownHalls();
});

async function fetchMunicipalities() {
  try {
    const res = await fetch("/municipalities");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      populateMunicipalitySelect(data);
      data.forEach((municipality) => {
        municipalityMap.set(municipality.id, municipality.name);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent =
      "An error occurred while fetching municipalities.";
  }
}

async function fetchTownHalls() {
  try {
    const res = await fetch("/townhalls");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      data.forEach((townHall) => {
        townHall.municipality_name = municipalityMap.get(
          townHall.municipality_id
        );
        addTableRow(townHall);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching town halls.";
  }
}

function populateMunicipalitySelect(regions) {
  const municipalitySelect = document.getElementById("municipality-id");
  const updateMunicipalitySelect = document.getElementById(
    "update-municipality-id"
  );

  regions.forEach((mn) => {
    const option = createOption(mn.id, mn.name);
    const updateOption = createOption(mn.id, mn.name);
    municipalitySelect.appendChild(option);
    updateMunicipalitySelect.appendChild(updateOption);
  });
}

function createOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

createForm.addEventListener("submit", handleCreateFormSubmit);

async function handleCreateFormSubmit(e) {
  e.preventDefault();
  const townHallCode = document.getElementById("town-hall-code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name-en").value;
  const municipalityId = document.getElementById("municipality-id").value;
  const municipalityName = municipalityMap.get(municipalityId);

  const validationError =
    validateTownHallCode(townHallCode) ||
    validateName(name) ||
    validateNameEn(nameEn);
  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    town_hall_code: townHallCode,
    name,
    name_en: nameEn,
    municipality_id: municipalityId,
  };

  try {
    const res = await fetch("/townhalls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      data.municipality_name = municipalityName;
      addTableRow(data, true);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
}

function addTableRow(data, prepend = false) {
  const row = createTableRow(data);
  if (prepend) {
    tbody.prepend(row);
  } else {
    tbody.appendChild(row);
  }
}

function createTableRow(data) {
  const row = document.createElement("tr");

  const townHallCodeCell = createTableCell(data.town_hall_code);
  const nameCell = createTableCell(data.name);
  const nameEnCell = createTableCell(data.name_en);
  const municipalityNameCell = createTableCell(data.municipality_name);

  const actionsCell = document.createElement("td");
  const updateBtn = createActionButton("Edit", () => showUpdateForm(data, row));
  const deleteBtn = createActionButton("Delete", () =>
    deleteHandler(data, row)
  );

  actionsCell.appendChild(updateBtn);
  actionsCell.appendChild(deleteBtn);

  row.appendChild(townHallCodeCell);
  row.appendChild(nameCell);
  row.appendChild(nameEnCell);
  row.appendChild(municipalityNameCell);
  row.appendChild(actionsCell);

  return row;
}

async function deleteHandler(rowData, row) {
  try {
    const res = await fetch(`/townhalls?id=${rowData.id}`, {
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
    const res = await fetch(`/townhalls?id=${data.id}`);
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
  document.getElementById("update-town-hall-code").value = data.town_hall_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-municipality-id").value =
    data.municipality_id;

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
  const townHallCode = document.getElementById("update-town-hall-code").value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name-en").value;
  const municipalityId = document.getElementById(
    "update-municipality-id"
  ).value;

  const validationError =
    validateTownHallCode(townHallCode) ||
    validateName(name) ||
    validateNameEn(nameEn);
  if (validationError) {
    updateErrorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    town_hall_code: townHallCode,
    name,
    name_en: nameEn,
    municipality_id: municipalityId,
  };

  try {
    const res = await fetch(`/townhalls?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.error) {
      updateErrorMessage.textContent = data.error;
    } else {
      updateTableRow(row, { townHallCode, name, nameEn, municipalityId });
      resetForm();
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
}

function updateTableRow(row, data) {
  const regionName = document.getElementById("update-municipality-id").options[
    document.getElementById("update-municipality-id").selectedIndex
  ].text;
  row.cells[0].textContent = data.townHallCode;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.nameEn;
  row.cells[3].textContent = regionName;
}

export function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
