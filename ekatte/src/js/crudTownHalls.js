import { fetchData, createTableRow } from "../util/crudUtilities.js";
import {
  validateTownHallCode,
  validateName,
  validateNameEn,
  validateReferenceId,
} from "../util/validation.js";

const createForm = document.getElementById("create-form");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

document.addEventListener("DOMContentLoaded", async () => {
  await initialize(); 
});

async function initialize() {
  const municipalities = await fetchData("/municipalities");
  if (!municipalities.errors) {
    populateSelect("municipality-id", municipalities);
    populateSelect("update-municipality-id", municipalities);
    const townHalls = await fetchData("/townhalls");
    if (!townHalls.errors) {
      generateTable(townHalls);
    } else {
      errorMessage.textContent = townHalls.errors;
    }
  } else {
    errorMessage.textContent = municipalities.errors;
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
  const townHallCode = document.getElementById("town-hall-code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name-en").value;
  const municipalityId = document.getElementById("municipality-id").value;

  const validationError =
    validateTownHallCode(townHallCode) ||
    validateName(name) ||
    validateNameEn(nameEn) ||
    validateReferenceId("Municipality", municipalityId);
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
  const data = await fetchData("/townhalls", "POST", requestData);

  if (data.errors) {
    errorMessage.textContent = data.errors;
  } else {
    errorMessage.textContent = "";
    addTableRow(data);
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
    "town_hall_code",
    "name_en",
    "name",
    "municipality_name",
    "actions",
  ];

  generateTableHead(table, columnNames);
  generateTableBody(table, data);

  container.appendChild(table);
}

function generateTableHead(table, columnNames) {
  const thead = table.createTHead();
  const row = thead.insertRow();
  for (let name of columnNames) {
    const th = document.createElement("th");
    const text = document.createTextNode(name.replaceAll("_", " "));
    th.appendChild(text);
    row.appendChild(th);
  }
}

function generateTableBody(table, data) {
  const tbody = table.createTBody();
  data.forEach((townHall) => {
    const row = createTableRow(townHall, showUpdateForm, deleteHandler);
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
    const response = await fetchData(`/townhalls?id=${data.id}`, "DELETE");
    if (response.errors) {
      errorMessage.textContent = response.errors;
    } else {
      const row = document.querySelector(`tr[data-id='${data.id}']`);
      if (row) {
        row.remove();
      }
    }
  }
}

function showUpdateForm(data) {
  document.getElementById("update-id").value = data.id;
  document.getElementById("update-town-hall-code").value = data.town_hall_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-municipality-id").value =
    data.municipality_id;

  createForm.style.display = "none";
  updateContainer.style.display = "block";
  updateErrorMessage.textContent = "";

  updateForm.onsubmit = async (e) => {
    e.preventDefault();
    const updatedData = {
      town_hall_code: document.getElementById("update-town-hall-code").value,
      name: document.getElementById("update-name").value,
      name_en: document.getElementById("update-name-en").value,
      municipality_id: document.getElementById("update-municipality-id").value,
    };

    const validationError =
      validateTownHallCode(updatedData.town_hall_code) ||
      validateName(updatedData.name) ||
      validateNameEn(updatedData.name_en) ||
      validateReferenceId("Municipality", updatedData.municipality_id);;
    if (validationError) {
      updateErrorMessage.textContent = validationError;
      return;
    }

    const response = await fetchData(
      `/townhalls?id=${data.id}`,
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
  };

  document.getElementById("cancel-btn").onclick = resetForm;
}

function updateTableRow(row, data) {
  row.cells[0].textContent = data.town_hall_code;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.name_en;
  row.cells[3].textContent = document.getElementById(
    "update-municipality-id"
  ).selectedOptions[0].text;
}

function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
