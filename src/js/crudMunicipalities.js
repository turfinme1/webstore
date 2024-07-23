const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

const deleteHandler = (rowData, row) => {
  console.log("delete rowData", rowData);

  fetch(`/municipalities?id=${rowData.id}`, {
    method: "DELETE",
  })
    .then((res) => {
      console.log(res);
      return res.json();
    })
    .then((data) => {
      if (data.id === rowData.id) {
        row.remove();
      } else {
        errorMessage.textContent = data.error;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      errorMessage.textContent = "An error occurred while deleting the item.";
    });
};

const showUpdateForm = (data, row) => {
  document.getElementById("update-id").value = data.id;
  document.getElementById("update-municipality_code").value =
    data.municipalityCode;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name_en").value = data.nameEn;
  document.getElementById("update-oblast_id").value = data.oblastCode;

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

const updateHandler = (id, row) => {
  const municipalityCode = document.getElementById(
    "update-municipality_code"
  ).value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name_en").value;
  const regionId = document.getElementById("update-oblast_id").value;

  fetch(`/municipalities?id=${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      obshtina_code: municipalityCode,
      name,
      name_en: nameEn,
      oblast_id: regionId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        updateErrorMessage.textContent = data.error;
      } else {
        row.cells[0].textContent = municipalityCode;
        row.cells[1].textContent = name;
        row.cells[2].textContent = nameEn;
        createForm.style.display = "block";
        updateContainer.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      updateErrorMessage.textContent =
        "An error occurred while updating the item.";
    });
};

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const municipalityCode = document.getElementById("municipality_code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name_en").value;
  const regionId = document.getElementById("oblast_id").value;

  console.log({ name, nameEn, oblastCode: municipalityCode });
  fetch("/municipalities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      obshtina_code: municipalityCode,
      name,
      name_en: nameEn,
      oblast_id: regionId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      if (data.error) {
        errorMessage.textContent = data.error;
      } else {
        const id = data.id;
        createTableRow({
          id,
          municipalityCode,
          name,
          nameEn,
          oblastCode: regionId,
        });
      }
    });
});

const createTableRow = (data) => {
  const row = document.createElement("tr");

  const municipalityCodeCell = document.createElement("td");
  municipalityCodeCell.textContent = data.municipalityCode;
  row.appendChild(municipalityCodeCell);

  const nameCell = document.createElement("td");
  nameCell.textContent = data.name;
  row.appendChild(nameCell);

  const nameEnCell = document.createElement("td");
  nameEnCell.textContent = data.nameEn;
  row.appendChild(nameEnCell);

  const regionCodeCell = document.createElement("td");
  regionCodeCell.textContent = data.oblastCode;
  row.appendChild(regionCodeCell);

  const actionsCell = document.createElement("td");
  const updateBtn = document.createElement("button");
  updateBtn.textContent = "Update";
  updateBtn.addEventListener("click", () => showUpdateForm(data, row));
  actionsCell.appendChild(updateBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteHandler(data, row));
  actionsCell.appendChild(deleteBtn);

  row.appendChild(actionsCell);

  tbody.appendChild(row);
};
