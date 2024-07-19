const form = document.getElementById("form");
const search = document.getElementById("searchInput");
const tbody = document.getElementById("tbody");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchValue = search.value.trim();

  fetch("/settlements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ searchValue }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      createTableRows(data);
    });
});

const createTableRows = (data) => {
  // Clear existing rows
  tbody.innerHTML = "";

  // Iterate over the data array and create rows
  data.forEach((item) => {
    const row = document.createElement("tr");

    // Create cells for each property
    const ekatteCell = document.createElement("td");
    ekatteCell.textContent = item.ekatte;
    row.appendChild(ekatteCell);

    const naselenoCell = document.createElement("td");
    naselenoCell.textContent = item.naseleno;
    row.appendChild(naselenoCell);

    const kmetstvoCell = document.createElement("td");
    kmetstvoCell.textContent = item.kmetstvo || "null";
    row.appendChild(kmetstvoCell);

    const obshtinaCell = document.createElement("td");
    obshtinaCell.textContent = item.obshtina || "null";
    row.appendChild(obshtinaCell);

    const oblastCell = document.createElement("td");
    oblastCell.textContent = item.oblast || "null";
    row.appendChild(oblastCell);

    tbody.appendChild(row);
  });
};
