import {
  validateRegionCode,
  validateName,
  validateNameEn,
} from "../util/validation.js";

const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

const fetchRecords = async () => {
  try {
    const res = await fetch("/regions");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      data.forEach((record) => {
        addTableRow(record);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching records.";
  }
};

const deleteHandler = async (rowData, row) => {
  try {
    const res = await fetch(`/regions?id=${rowData.id}`, { method: "DELETE" });
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
};

const showUpdateForm = async (data, row) => {
  updateErrorMessage.textContent = "";
  try {
    const res = await fetch(`/regions?id=${data.id}`);
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
};

const fillUpdateForm = (data, row) => {
  document.getElementById("update-id").value = data.id;
  document.getElementById("update-region-code").value = data.region_code;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;

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
};

const updateTableRow = (row, data) => {
  row.cells[0].textContent = data.region_code;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.name_en;
};

const updateHandler = async (id, row) => {
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
    const res = await fetch(`/regions?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, name_en, region_code }),
    });
    const data = await res.json();
    if (data.error) {
      updateErrorMessage.textContent = data.error;
    } else {
      updateTableRow(row, { region_code, name, name_en });
      resetForm();
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
};

function addTableRow(data, prepend = false) {
  const row = createTableRow(data);
  if (prepend) {
    tbody.prepend(row);
  } else {
    tbody.appendChild(row);
  }
}

const createTableRow = (data) => {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${data.region_code}</td>
    <td>${data.name}</td>
    <td>${data.name_en}</td>
    <td>
      <button class="update-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </td>
  `;

  const updateBtn = row.querySelector(".update-btn");
  updateBtn.addEventListener("click", () => showUpdateForm(data, row));

  const deleteBtn = row.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => deleteHandler(data, row));

  return row;
};

const handleCreateFormSubmit = async (e) => {
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
    const res = await fetch("/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, name_en, region_code }),
    });
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      const obj = { id: data.id, region_code, name, name_en };
      addTableRow(data, true);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
};

const resetForm = () => {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
};

document.addEventListener("DOMContentLoaded", fetchRecords);

createForm.addEventListener("submit", handleCreateFormSubmit);
