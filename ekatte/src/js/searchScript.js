const form = document.getElementById("form");
const search = document.getElementById("searchInput");
const tbody = document.getElementById("tbody");

const fetchStatistics = () => {
  fetch("/statistics")
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      fillStatistics(data);
    });
};
fetchStatistics();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchValue = search.value.trim();

  fetch(`/settlements?name=${searchValue}`)
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
    naselenoCell.textContent = item.settlement;
    row.appendChild(naselenoCell);

    const kmetstvoCell = document.createElement("td");
    kmetstvoCell.textContent = item.town_hall;
    row.appendChild(kmetstvoCell);

    const obshtinaCell = document.createElement("td");
    obshtinaCell.textContent = item.municipality;
    row.appendChild(obshtinaCell);

    const oblastCell = document.createElement("td");
    oblastCell.textContent = item.region;
    row.appendChild(oblastCell);

    tbody.appendChild(row);
  });
};

const fillStatistics = (data) => {
  const settlementsCount = document.getElementById("settlementsCount");
  const townHallsCount = document.getElementById("townHallsCount");
  const municipalitiesCount = document.getElementById("municipalitiesCount");
  const regionsCount = document.getElementById("regionsCount");

  settlementsCount.textContent = data.countsettlements;
  townHallsCount.textContent = data.counttownhalls;
  municipalitiesCount.textContent = data.countmunicipalities;
  regionsCount.textContent = data.countregions;
};
