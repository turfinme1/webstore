import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);

  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = `
    <div id="dashboard-container"></div>
    <div class="charts-container mb-5">
      <h1 class='mb-4'>Order Charts</h1>
      <div class="chart-section">
        <h2>Orders Last 6 Months
          <div id="spinner-6-months" class="spinner-border text-primary ms-3" role="status" style="display: none;">
            <span class="visually-hidden">Loading...</span>
          </div>
        </h2>
        <canvas id='orderChart' width='400' height='200'></canvas>
      </div>
      
      <div class="chart-section mt-5">
        <h2>Orders Last 2 Days
          <div id="spinner-2-days" class="spinner-border text-primary ms-3" role="status" style="display: none;">
            <span class="visually-hidden">Loading...</span>
          </div>
        </h2>
        <canvas id='orderChartLastTwoDays' width='400' height='200'></canvas>
      </div>
    </div>
  `;

  await Promise.any([
    renderOrderChartLastSixMonths(),
    renderOrderChartLastTwoDays(),
    renderDashboard()
  ]);
});

async function renderOrderChartLastSixMonths() {
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
            label: "Total Price without VAT ($)",
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
            title: { display: true, text: "Total Price without VAT ($)" },
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
            label: "Total Price without VAT ($)",
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
            title: { display: true, text: "Total Price without VAT ($)" },
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

async function renderDashboard() {
  const dashboardContainer = document.getElementById("dashboard-container");
  const response = await fetch('/api/reports/store-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const metrics = await response.json();
  
  dashboardContainer.innerHTML += `
    <div class="container mt-4">
      <h2 class="mb-4">Dashboard Overview</h2>
      <div class="row g-4">
        ${metrics.map(metric => `
          <div class="col-md-6">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted mb-3">${metric.name}</h5>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h3 class="mb-0">${formatNumber(metric.current)}</h3>
                    <span class="change-indicator ${metric.change >= 0 ? 'text-success' : 'text-danger'}">
                      <i class="bi ${metric.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                      ${Math.abs(metric.change).toFixed(1)}%
                    </span>
                    <small class="text-muted ms-2">vs last week</small>
                  </div>
                  <div style="width: 150px; height: 50px;">
                    <canvas id="chart-${metric.name.toLowerCase().replace(/\s+/g, '-')}"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Render sparkline charts
  metrics.forEach(metric => {
    const ctx = document.getElementById(`chart-${metric.name.toLowerCase().replace(/\s+/g, '-')}`).getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(metric.trend.length).fill(''),
        datasets: [{
          data: metric.trend,
          borderColor: getMetricColor(metric.name),
          borderWidth: 2,
          fill: {
            target: 'origin',
            above: `${getMetricColor(metric.name)}15`
          },
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => formatNumber(context.parsed.y)
            }
          }
        },
        scales: {
          x: { display: false },
          y: { 
            display: false,
            min: Math.min(...metric.trend) * 0.95,
            max: Math.max(...metric.trend) * 1.05
          }
        }
      }
    });
  });
}

function formatNumber(value) {
  if (typeof value !== 'number') return '0';
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function getMetricColor(metricName) {
  const colors = {
    'Registered Users': '#4CAF50',
    'Users with Orders': '#2196F3',
    'Average Order Price': '#FF9800',
    'Average User Spend': '#9C27B0',
    'Net Revenue': '#F44336',
    'User Net Revenue': '#795548'
  };
  return colors[metricName] || '#666666';
}