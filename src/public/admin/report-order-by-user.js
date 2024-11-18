import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";

const state = {
  userStatus: null,
}

const elements = {
  form: document.getElementById("report-form"),
  table: document.getElementById("report-table"),
  rowCount: document.getElementById("row-count"),
};

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  state.userStatus = userStatus;
  createNavigation(userStatus);
  await attachLogoutHandler();
  createBackofficeNavigation(userStatus);

  elements.form.addEventListener("submit", handleFilterFormSubmit);
});

async function handleFilterFormSubmit(event) {
  event.preventDefault();
  const userName = document.getElementById("user_name").value;
  const userId = document.getElementById("user_id").value;
  const orderTotalMin = document.getElementById("order_total_min").value;
  const orderTotalMax = document.getElementById("order_total_max").value;

  const response = await fetch("/api/reports/orders-by-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_name: userName,
      user_id: userId,
      order_total_min: orderTotalMin,
      order_total_max: orderTotalMax,
    }),
  });

  const data = await response.json();
  if (response.ok) {
    const tbody = document.querySelector("#report-table tbody");
    tbody.innerHTML = "";
    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
              <td>${row.user_name}</td>
              <td style="text-align: right">${row.user_id}</td>
              <td style="text-align: right">${row.orders_last_day}</td>
              <td style="text-align: right">${formatCurrency(row.total_last_day)}</td>
              <td style="text-align: right">${row.orders_last_week}</td>
              <td style="text-align: right">${formatCurrency(row.total_last_week)}</td>
              <td style="text-align: right">${row.orders_last_month}</td>
              <td style="text-align: right">${formatCurrency(row.total_last_month)}</td>
              <td style="text-align: right">${row.orders_last_year}</td>
              <td style="text-align: right">${formatCurrency(row.total_last_year)}</td>
          `;
      tbody.appendChild(tr);
    });
    elements.rowCount.textContent = `Showing ${data.length} rows`;
  } else {
    alert("Error: " + data.error);
  }
}

function formatCurrency(number) {
  if(!number) {
    return '$0.00';
  }
  return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(number)).replace(',', '.')}`;
}