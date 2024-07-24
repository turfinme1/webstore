import {
  validateEkatte,
  validateName,
  validateNameEn,
} from "../util/validation.js";

const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

document.addEventListener("DOMContentLoaded", fetchTownHalls);

async function fetchTownHalls() {
  try {
    const res = await fetch("/townhalls");
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      populateTownHallSelect(data);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while fetching town halls.";
  }
}

function populateTownHallSelect(regions) {
  const townHallSelect = document.getElementById("town-hall-id");
  const updateTownHallSelect = document.getElementById("update-town-hall-id");

  regions.forEach((th) => {
    const option = createOption(th.id, th.name);
    const updateOption = createOption(th.id, th.name);
    townHallSelect.appendChild(option);
    updateTownHallSelect.appendChild(updateOption);
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
  const ekatte = document.getElementById("ekatte").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name-en").value;
  const townHallId = document.getElementById("town-hall-id").value;
  const townHallName =
    document.getElementById("town-hall-id").options[
      document.getElementById("town-hall-id").selectedIndex
    ].text;

  const validationError =
    validateEkatte(ekatte) || validateName(name) || validateNameEn(nameEn);
  if (validationError) {
    errorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    ekatte,
    name,
    name_en: nameEn,
    town_hall_id: townHallId,
  };

  try {
    const res = await fetch("/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.error) {
      errorMessage.textContent = data.error;
    } else {
      data.town_hall_name = townHallName;
      addTableRow(data);
    }
  } catch (error) {
    console.error("Error:", error);
    errorMessage.textContent = "An error occurred while creating.";
  }
}

function addTableRow(data) {
  const row = createTableRow(data);
  tbody.appendChild(row);
}

function createTableRow(data) {
  const row = document.createElement("tr");

  const ekatteCell = createTableCell(data.ekatte);
  const nameCell = createTableCell(data.name);
  const nameEnCell = createTableCell(data.name_en);
  const regionNameCell = createTableCell(data.town_hall_name);

  const actionsCell = document.createElement("td");
  const updateBtn = createActionButton("Update", () =>
    showUpdateForm(data, row)
  );
  const deleteBtn = createActionButton("Delete", () =>
    deleteHandler(data, row)
  );

  actionsCell.appendChild(updateBtn);
  actionsCell.appendChild(deleteBtn);

  row.appendChild(ekatteCell);
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
    const res = await fetch(`/settlements?id=${rowData.id}`, {
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
    const res = await fetch(`/settlements?id=${data.id}`);
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
  document.getElementById("update-ekatte").value = data.ekatte;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name-en").value = data.name_en;
  document.getElementById("update-town-hall-id").value = data.town_hall_id;

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
  const ekatte = document.getElementById("update-ekatte").value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name-en").value;
  const townHallId = document.getElementById("update-town-hall-id").value;

  const validationError =
    validateEkatte(ekatte) || validateName(name) || validateNameEn(nameEn);
  if (validationError) {
    updateErrorMessage.textContent = validationError;
    return;
  }

  const requestData = {
    ekatte,
    name,
    name_en: nameEn,
    town_hall_id: townHallId,
  };

  try {
    const res = await fetch(`/settlements?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const data = await res.json();
    if (data.error) {
      updateErrorMessage.textContent = data.error;
    } else {
      updateTableRow(row, { ekatte, name, nameEn, townHallId });
      resetForm();
    }
  } catch (error) {
    console.error("Error:", error);
    updateErrorMessage.textContent = "An error occurred while updating.";
  }
}

function updateTableRow(row, data) {
  const regionName = document.getElementById("update-town-hall-id").options[
    document.getElementById("update-town-hall-id").selectedIndex
  ].text;
  row.cells[0].textContent = data.ekatte;
  row.cells[1].textContent = data.name;
  row.cells[2].textContent = data.nameEn;
  row.cells[3].textContent = regionName;
}

function resetForm() {
  createForm.style.display = "block";
  updateContainer.style.display = "none";
  updateErrorMessage.textContent = "";
}
