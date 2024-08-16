const form = document.getElementById("form");
const search = document.getElementById("searchInput");
const tbody = document.getElementById("tbody");
const errorMessage = document.getElementById("errorMessage");

fetchStatistics();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const searchValue = search.value.trim();

  if (isInputValid(searchValue)) {
    errorMessage.textContent = "";
    errorMessage.classList.remove("errorMessage");

    try {
      const response = await fetch(`/settlements?name=${searchValue}`);
      if (!response.ok) {
        throw new Error("Error while fetching settlements");
      }
      const data = await response.json();
      if (data.length === 0) {
        throw new Error("No settlements found");
      }

      fillAuthorStatisticsTable(data);
    } catch (e) {
      errorMessage.classList.add("errorMessage");
      errorMessage.textContent =
        e.message || "Error while fetching settlements";
    }
  } else {
    errorMessage.classList.add("errorMessage");
    errorMessage.textContent =
      "The settlement name must be at least 3 characters long and contain only cyrillic letters";
  }
});

async function fetchStatistics() {
  try {
    const response = await fetch("/statistics");
    const data = await response.json();
    fillStatistics(data);
  } catch (e) {
    errorMessage.classList.add("errorMessage");
    errorMessage.textContent = "Error while fetching statistics";
  }
}

function fillAuthorStatisticsTable(data) {
  const mainContent = document.getElementById("container");
  mainContent.innerHTML = "";

  if (data.length === 0) {
    return;
  }

  const table = document.createElement("table");
  const columnNames = Object.keys(data[0]);

  generateTableHead(table, columnNames);
  generateTable(table, data);

  mainContent.appendChild(table);
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

function generateTable(table, data) {
  for (let element of data) {
    const row = table.insertRow();
    for (let key in element) {
      const cell = row.insertCell();
      const text = document.createTextNode(element[key] || "----");
      cell.appendChild(text);
    }
  }
}

function fillStatistics(data) {
  const settlementsCount = document.getElementById("settlementsCount");
  const townHallsCount = document.getElementById("townHallsCount");
  const municipalitiesCount = document.getElementById("municipalitiesCount");
  const regionsCount = document.getElementById("regionsCount");

  settlementsCount.textContent = data.countsettlements;
  townHallsCount.textContent = data.counttownhalls;
  municipalitiesCount.textContent = data.countmunicipalities;
  regionsCount.textContent = data.countregions;
}

function isInputValid(input) {
  const regex = /^[а-яА-Я]{3,}$/;
  return regex.test(input);
}
