import { fetchData, createTableRow } from "../util/crudUtilities.js";
import {
  validateRegionCode,
  validateName,
  validateNameEn,
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
  try {
    const regions = await fetchData("/regions");
    if (regions.errors) {
      errorMessage.textContent = regions.errors;
    } else {
      generateTable(regions);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching records.";
  }
}

function generateTable(data) {
  const container = document.getElementById("table-container");
  container.innerHTML = "";

  if (data.length === 0) {
    return;
  }

  const table = document.createElement("table");
  const columnNames = [
    "region_code",
    "name_en",
    "name",
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
  data.forEach((region) => {
    const row = createTableRow(region, showUpdateForm, deleteHandler);
    tbody.appendChild(row);
  });
}

async function deleteHandler(data) {
  const userConfirmed = window.confirm(
    `Are you sure you want to delete ${data.name}?`
  );

  if (userConfirmed) {
    try {
      const response = await fetchData(`/regions?id=${data.id}`, "DELETE");
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
  document.getElementById("update-region-code").value = data.region_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;

  createForm.style.display = "none";
  updateContainer.style.display = "block";
  updateErrorMessage.textContent = "";

  updateForm.onsubmit = async (e) => {
    e.preventDefault();
    await updateHandler(data.id);
  };

  document.getElementById("cancel-btn").onclick = resetForm;
}

async function updateHandler(id) {
  const region_code = document.getElementById("update-region-code").value;
  const name = document.getElementById("update-name").value;
  const name_en = document.getElementById("update-name-en").value;

  const validationError =
    validateRegionCode(region_code) ||
    validateName(name) ||
    validateNameEn(name_en);
  if (validationError) {
    updateErrorMessage.textContent = validationError;
    return;
  }

  try {
    const response = await fetchData(
      `/regions?id=${id}`,
      "PUT",
      { region_code, name, name_en }
    );
    if (response.errors) {
      updateErrorMessage.textContent = response.errors;
    } else {
      const row = document.querySelector(`tr[data-id='${id}']`);
      updateTableRow(row, { region_code, name, name_en });
      resetForm();
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
}

function updateTableRow(row, data) {
  row.cells[0].textContent = data.region_code;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.name_en;
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const region_code = document.getElementById("region-code").value;
  const name = document.getElementById("name").value;
  const name_en = document.getElementById("name-en").value;

  const validationError =
    validateRegionCode(region_code) ||
    validateName(name) ||
    validateNameEn(name_en);
  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  try {
    const data = await fetchData("/regions", "POST", {
      region_code,
      name,
      name_en,
    });
    if (data.errors) {
      errorMessage.textContent = data.errors;
    } else {
      addTableRow(data, true);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
});

function addTableRow(data, prepend = false) {
  const row = createTableRow(data, showUpdateForm, deleteHandler);
  const table = document.querySelector("table");
  const tbody = table.querySelector("tbody");

  if (prepend) {
    tbody.prepend(row);
  } else {
    tbody.appendChild(row);
  }
}

function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
