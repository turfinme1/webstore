const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

const deleteHandler = (rowData, row) => {
  console.log("delete rowData", rowData);

  fetch(`/regions?id=${rowData.id}`, {
    method: "DELETE",
  })
    .then((res) => {
      console.log(res);
      return res.json();
    })
    .then((data) => {
      if (data[0].id === rowData.id) {
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
  document.getElementById("update-oblast_code").value = data.oblastCode;
  document.getElementById("update-name").value = data.name;
  document.getElementById("update-name_en").value = data.nameEn;

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
  const oblastCode = document.getElementById("update-oblast_code").value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name_en").value;

  fetch(`/regions?id=${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ oblastCode, name, nameEn }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        updateErrorMessage.textContent = data.error;
      } else {
        row.cells[0].textContent = oblastCode;
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
  const oblastCode = document.getElementById("oblast_code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name_en").value;

  console.log({ name, nameEn, oblastCode });
  fetch("/regions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, nameEn, oblastCode }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      if (data.error) {
        errorMessage.textContent = data.error;
      } else {
        const id = data[0].id;
        createTableRow({ id, name, nameEn, oblastCode });
      }
    });
});

const createTableRow = (data) => {
  const row = document.createElement("tr");

  const oblastCodeCell = document.createElement("td");
  oblastCodeCell.textContent = data.oblastCode;
  row.appendChild(oblastCodeCell);

  const nameCell = document.createElement("td");
  nameCell.textContent = data.name;
  row.appendChild(nameCell);

  const nameEnCell = document.createElement("td");
  nameEnCell.textContent = data.nameEn;
  row.appendChild(nameEnCell);

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
