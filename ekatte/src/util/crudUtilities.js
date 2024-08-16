export async function fetchData(url, method = "GET", body = null) {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
    };
    const res = await fetch(url, options);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    return { error: error.message };
  }
}

export function createTableRow(data, onUpdate, onDelete) {
  const row = document.createElement("tr");
  row.setAttribute("data-id", data.id);

  for (const key of Object.keys(data)) {
    if (key !== "id") {
      const cell = document.createElement("td");
      cell.textContent = data[key];
      row.appendChild(cell);
    }
  }

  const actionsCell = document.createElement("td");
  const updateBtn = createActionButton("Edit", onUpdate, "edit-btn", data);
  const deleteBtn = createActionButton("Delete", onDelete, "delete-btn", data);

  actionsCell.appendChild(updateBtn);
  actionsCell.appendChild(deleteBtn);

  row.appendChild(actionsCell);

  return row;
}

export function createActionButton(text, onClick, className, data) {
  const button = document.createElement("button");
  button.classList.add(className);
  button.textContent = text;
  button.addEventListener("click", () => onClick(data));
  return button;
}
