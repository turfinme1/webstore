import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);

  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = `
    <div class="container-fluid">
      <div class="row mb-4">
        <div class="col-12">
          <h1>Management Dashboard</h1>
        </div>
      </div>

      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Orders Last 6 Months
                <div id="spinner-6-months" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </h5>
              <canvas id="orderChart"></canvas>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Orders Last 2 Days
                <div id="spinner-2-days" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </h5>
              <canvas id="orderChartLastTwoDays"></canvas>
            </div>
          </div>
        </div>
      </div>

      <h2 class="mb-4">Overview</h2>

      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-auto">
                  <label class="form-label">Date Range (1 week):</label>
                </div>
                <div class="col-auto">
                  <input type="date" id="start-date" class="form-control">
                </div>
                <div class="col-auto">
                  <span>to</span>
                </div>
                <div class="col-auto">
                  <input type="date" id="end-date" class="form-control">
                </div>
                <div class="col-auto">
                  <button id="filter-dashboard" class="btn btn-primary">Apply Filter</button>
                </div>
                <div id="spinner-dashboard" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="campaign-dashboard-container" class="row mb-4"></div>
      
      <div id="dashboard-container" class="row mb-4"></div>

    </div>
  `;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const startDateElement = document.getElementById('start-date');
  const endDateElement = document.getElementById('end-date');
  startDateElement.value = startDate.toISOString().split('T')[0];
  endDateElement.value = endDate.toISOString().split('T')[0];

  document.getElementById('filter-dashboard').addEventListener('click', async () => {
    const start_date = startDateElement.value;
    const end_date = endDateElement.value;

    if (new Date(end_date) - new Date(start_date) !== 6 * 24 * 60 * 60 * 1000) {
      showToastMessage('Date range must be 7 days', 'error');
      return;
    }
    
    await Promise.all([
      renderDashboard(start_date, end_date),
      renderCampaignDashboard(start_date, end_date),
    ])
  });

  await Promise.any([
    renderOrderChartLastSixMonths(),
    renderOrderChartLastTwoDays(),
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
      .map((item) => parseFloat(item.paid_amount))
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
            label: "Total Price with VAT ($)",
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
            title: { display: true, text: "Total Price with VAT ($)" },
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
            label: "Total Price with VAT ($)",
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
            title: { display: true, text: "Total Price with VAT ($)" },
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

async function renderDashboard(startDate, endDate) {
  const spinner = document.getElementById("spinner-dashboard");
  const filterButton = document.getElementById("filter-dashboard");
  const dashboardContainer = document.getElementById("dashboard-container");
  try {
      spinner.style.display = "inline-block";
      filterButton.disabled = true;
    
    const response = await fetchWithErrorHandling('/api/reports/store-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate })
    });

    if(!response.ok) {
      showToastMessage(response.error, "error");
      return;
    }
    const data = await response.data;
    const metrics = data.rows[0].dashboard_data;
    const yearBefore = new Date(endDate);
    yearBefore.setFullYear(yearBefore.getFullYear() - 1);
    dashboardContainer.innerHTML = `
      <div class="container mt-4">
        <div class="row g-4">
          ${metrics.map((metric, index) => `
            <div class="col-md-4">
              <div class="card h-100 shadow-sm">
                <div class="card-body">
                  <h5 class="card-title text-muted mb-3">${metric.name}</h5>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 class="mb-1 text-muted">${formatHumanReadableDate(startDate)} - ${formatHumanReadableDate(endDate)}</h6>
                      <h3 class="mb-0">${metric.name === 'Active Users' || metric.name === 'Registered Users' ? metric.current : formatCurrency(metric.current)}</h3>
                      <span class="change-indicator ${metric.change >= 0 ? 'text-success' : 'text-danger'}">
                        <i class="bi ${metric.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                        ${Math.abs(metric.change).toFixed(1)}%
                      </span>
                      <small class="text-muted ms-2">vs last week</small>
                    </div>
                    <div>
                      <h6 class="mb-1 text-muted">${formatHumanReadableDate(yearBefore)} - ${formatHumanReadableDate(endDate)}</h6>
                      <div style="width: 150px; height: 60px;">
                        <canvas id="chart-${metric.name.toLowerCase().replace(/\s+/g, '-')}"></canvas>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

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
                label: (context) => formatCurrency(context.parsed.y)
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
  } finally {
    spinner.style.display = "none";
    filterButton.disabled = false;
  }
}

async function renderCampaignDashboard(startDate, endDate) {
  const spinner = document.getElementById("spinner-dashboard");
  const filterButton = document.getElementById("filter-dashboard");
  const dashboardContainer = document.getElementById("campaign-dashboard-container");
  
  try {
    spinner.style.display = "inline-block";
    filterButton.disabled = true;
    
    const response = await fetchWithErrorHandling('/api/reports/campaign-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate })
    });

    if(!response.ok) {
      showToastMessage(response.error, "error");
      return;
    }

    const data = await response.data;
    const metrics = data.rows[0].campaign_data;

    dashboardContainer.innerHTML = `
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-borderless mb-0">
                <thead>
                  <tr>
                    ${metrics.map(metric => `
                      <th class="text-center py-3" style="min-width: 200px;">
                        ${metric.name}
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    ${metrics.map(metric => `
                      <td class="p-3">
                        <div class="card h-100 border-0 shadow-sm">
                          <div class="card-body">
                            <div class="d-flex flex-column align-items-center">
                              <h3 class="mb-2">
                                ${formatMetricValue(metric.name, metric.current)}
                              </h3>
                              <div class="text-muted mb-2">
                                Previous: ${formatMetricValue(metric.name, metric.previous)}
                              </div>
                              <span class="badge ${getChangeClass(metric.change)} px-2 py-1">
                                <i class="bi ${metric.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                                ${Math.abs(metric.change).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    `).join('')}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    dashboardContainer.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });

  } finally {
    spinner.style.display = "none"; 
    filterButton.disabled = false;
  }
}

function formatMetricValue(metricName, value) {
  if (metricName.includes('Revenue')) {
    return formatCurrency(value);
  }
  return value;
}

function getChangeClass(change) {
  if (change > 0) return 'bg-success';
  if (change < 0) return 'bg-danger';
  return 'bg-secondary';
}

function formatCurrency(value) {
  if (typeof value !== 'number') return '$0.00';
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatNumber(value) {
  if (typeof value !== 'number') return '0';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return `${value.toFixed(2)}`;
}

function getMetricColor(metricName) {
  const colors = {
    'Registered Users': '#4CAF50',
    'Active Users': '#2196F3',
    'Average Order Price': '#FF9800',
    'Average Amount Spent by User': '#9C27B0',
    'Net Revenue': '#F44336',
    'Net Revenue by User': '#795548'
  };
  return colors[metricName] || '#666666';
}

function formatHumanReadableDate(inputDate) {
  const date = new Date(inputDate);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
