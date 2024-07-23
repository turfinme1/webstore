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
  fetch(`/regions?id=${data.id}`)
    .then((res) => res.json())
    .then((latestData) => {
      console.log("latestData", latestData);
      if (latestData.error) {
        updateErrorMessage.textContent = latestData.error;
      } else {
        document.getElementById("update-id").value = latestData.id;
        document.getElementById("update-oblast_code").value =
          latestData.oblast_code;
        document.getElementById("update-name").value = latestData.name;
        document.getElementById("update-name_en").value = latestData.name_en;

        createForm.style.display = "none";
        updateContainer.style.display = "block";

        updateForm.onsubmit = (e) => {
          e.preventDefault();
          updateHandler(latestData.id, row);
        };

        document.getElementById("cancel-btn").onclick = () => {
          createForm.style.display = "block";
          updateContainer.style.display = "none";
          updateErrorMessage.textContent = "";
        };
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      updateErrorMessage.textContent = "An error occurred while fetching.";
    });
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
    body: JSON.stringify({ name, name_en: nameEn, oblast_code: oblastCode }),
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
    body: JSON.stringify({ name, name_en: nameEn, oblast_code: oblastCode }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      if (data.error) {
        errorMessage.textContent = data.error;
      } else {
        const id = data.id;
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
