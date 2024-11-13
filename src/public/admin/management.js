import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  await attachLogoutHandler();
  createBackofficeNavigation(userStatus);

   renderOrderChartLastSixMonths();
   renderOrderChartLastTwoDays();
});

async function renderOrderChartLastSixMonths() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = `
    <h1 class='mb-4'>Order Charts</h1>
    <h2>Orders Last 6 Months
      <div id="spinner-6-months" class="spinner-border text-primary ms-3" role="status" style="display: none;">
        <span class="visually-hidden">Loading...</span>
      </div>
    </h2>
    <canvas id='orderChart' width='400' height='200'></canvas>
    
    <h2 style="margin-top: 10rem;">Orders Last 2 Days
      <div id="spinner-2-days" class="spinner-border text-primary ms-3" role="status" style="display: none;">
        <span class="visually-hidden">Loading...</span>
      </div>
    </h2>
    <canvas id='orderChartLastTwoDays' width='400' height='200'></canvas>`;

  try {
    const spinner = document.getElementById("spinner-6-months");

    let date = new Date();
    date.setMonth(date.getMonth() - 6);
    const isoDate = date.toISOString().split("T")[0];
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify({ created_at: { min: isoDate } }),
      groupParams: JSON.stringify([
        { column: "created_at", granularity: "month" },
      ]),
      pageSize: "6",
      page: "1",
    });

    spinner.style.display = "inline-block";
    const response = await fetch(
      `/crud/orders/filtered?${queryParams.toString()}`
    );
    const data = await response.json();

    // Parse data for chart
    const labels = data.result
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      )
      .reverse();
    const orderCounts = data.result.map((item) => Number(item.count)).reverse();
    const orderPrices = data.result
      .map((item) => parseFloat(item.total_price))
      .reverse();

    // Render chart using Chart.js
    const ctx = document.getElementById("orderChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Order Count",
            data: orderCounts,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            yAxisID: "y1",
          },
          {
            label: "Total Price ($)",
            data: orderPrices,
            backgroundColor: "rgba(255, 159, 64, 0.6)",
            borderColor: "rgba(255, 159, 64, 1)",
            borderWidth: 1,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y1: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: { display: true, text: "Order Count" },
          },
          y2: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: { display: true, text: "Total Price ($)" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    spinner.style.display = "none";
  } catch (error) {
    spinner.style.display = "none";
    console.error("Error fetching order data:", error);
    contentArea.innerHTML =
      "<p class='text-danger'>Failed to load order chart. Please try again later.</p>";
  }
}

async function renderOrderChartLastTwoDays() {
  const contentArea = document.getElementById("content-area");
  try {
    const spinner = document.getElementById("spinner-2-days");
    
    let date = new Date();
    date.setDate(date.getDate() - 2);
    const isoDate = date.toISOString().split("T")[0];
    const queryParams = new URLSearchParams({
      filterParams: JSON.stringify({ created_at: { min: isoDate } }),
      groupParams: JSON.stringify([
        { column: "created_at", granularity: "day" },
      ]),
      pageSize: "2",
      page: "1",
    });

    spinner.style.display = "inline-block";
    const response = await fetch(
      `/crud/orders/filtered?${queryParams.toString()}`
    );
    const data = await response.json();

    // Parse data for 2-day chart
    const labels = data.result
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      )
      .reverse();
    const orderCounts = data.result.map((item) => Number(item.count)).reverse();
    const orderPrices = data.result
      .map((item) => parseFloat(item.total_price))
      .reverse();

    // Render 2-day chart using Chart.js
    const ctx = document
      .getElementById("orderChartLastTwoDays")
      .getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Order Count",
            data: orderCounts,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            yAxisID: "y1",
          },
          {
            label: "Total Price ($)",
            data: orderPrices,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y1: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: { display: true, text: "Order Count" },
          },
          y2: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: { display: true, text: "Total Price ($)" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
    spinner.style.display = "none";
  } catch (error) {
    spinner.style.display = "none";
    console.error("Error fetching last 2 days order data:", error);
    contentArea.innerHTML =
      "<p class='text-danger'>Failed to load 2-day order chart. Please try again later.</p>";
  }
}
