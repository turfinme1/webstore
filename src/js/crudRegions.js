const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");

const deleteHandler = (rowData, row) => {
  console.log("delete rowData", rowData);

  fetch(`/settlements?id=${rowData.id}`, {
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

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const oblastCode = document.getElementById("oblast_code").value;
  const name = document.getElementById("name").value;
  const nameEn = document.getElementById("name_en").value;

  console.log({ name, nameEn, oblastCode });
  fetch("/settlements", {
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
  actionsCell.appendChild(updateBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteHandler(data, row));
  actionsCell.appendChild(deleteBtn);

  row.appendChild(actionsCell);

  tbody.appendChild(row);
};
