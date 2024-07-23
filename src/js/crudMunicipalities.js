const createForm = document.getElementById("create-form");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("error-message");
const updateContainer = document.getElementById("update-container");
const updateForm = document.getElementById("update-form");
const updateErrorMessage = document.getElementById("update-error-message");

document.addEventListener("DOMContentLoaded", () => {
  fetchRegions();
});

const fetchRegions = () => {
  fetch("/regions")
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        errorMessage.textContent = data.error;
      } else {
        const regionSelect = document.getElementById("region_id");
        const updateRegionSelect = document.getElementById("update-region_id");

        data.forEach((region) => {
          const option = document.createElement("option");
          option.value = region.id;
          option.textContent = region.name;
          regionSelect.appendChild(option);

          const updateOption = document.createElement("option");
          updateOption.value = region.id;
          updateOption.textContent = region.name;
          updateRegionSelect.appendChild(updateOption);
        });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      errorMessage.textContent = "An error occurred while fetching regions.";
    });
};

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
  fetch(`/municipalities?id=${data.id}`)
    .then((res) => res.json())
    .then((latestData) => {
      console.log("latestData", latestData);
      if (latestData.error) {
        updateErrorMessage.textContent = latestData.error;
      } else {
        document.getElementById("update-id").value = latestData.id;
        document.getElementById("update-municipality_code").value =
          latestData.obshtina_code;
        document.getElementById("update-name").value = latestData.name;
        document.getElementById("update-name_en").value = latestData.name_en;
        document.getElementById("update-region_id").value =
          latestData.oblast_id;

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
  const municipalityCode = document.getElementById(
    "update-municipality_code"
  ).value;
  const name = document.getElementById("update-name").value;
  const nameEn = document.getElementById("update-name_en").value;
  const regionId = document.getElementById("update-region_id").value;
  const select = document.getElementById("update-region_id");
  const regionName = select.options[select.selectedIndex].text;

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
        row.cells[3].textContent = regionName;
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
  const regionId = document.getElementById("region_id").value;
  const select = document.getElementById("region_id");
  const regionName = select.options[select.selectedIndex].text;

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
          oblastCode: regionName,
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

  const regionNameCell = document.createElement("td");
  regionNameCell.textContent = data.oblastCode;
  row.appendChild(regionNameCell);

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
