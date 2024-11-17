document
  .getElementById("report-form")
  .addEventListener("submit", async function (event) {
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
                <td>${row.user_id}</td>
                <td>${row.orders_last_day}</td>
                <td>${row.total_last_day}</td>
                <td>${row.orders_last_week}</td>
                <td>${row.total_last_week}</td>
                <td>${row.orders_last_month}</td>
                <td>${row.total_last_month}</td>
                <td>${row.orders_last_year}</td>
                <td>${row.total_last_year}</td>
            `;
        tbody.appendChild(tr);
      });
    } else {
      alert("Error: " + data.error);
    }
  });
