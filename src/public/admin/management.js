import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showErrorMessage } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  await createBackofficeNavigation(userStatus);

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
        <div class="col-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">User groups chart
                <div id="spinner-user-groups" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </h5>
              <canvas id="userGroupChart"></canvas>
            </div>
          </div>
        </div>

        <div class="col-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Campaign chart
                <div id="spinner-target-groups" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </h5>
              <canvas id="targetGroupChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="row mb-4" style="display: none;" id="user-group-details">
        <div class="col-6">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h5 class="card-title mb-4">User Group Details</h5>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th scope="col" class="border-0">Group Name</th>
                      <th scope="col" class="border-0 text-end">User Count</th>
                    </tr>
                  </thead>
                  <tbody id="user-group-table" class="border-top">
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      showErrorMessage('Date range must be 7 days');
      return;
    }

    if (new Date(end_date) > new Date()) {
      showErrorMessage('End date must be in the past');
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
    renderTargetGroupChart(),
    renderUserGroupsChart(),
  ]);
});

async function renderOrderChartLastSixMonths() {
  const spinner = document.getElementById("spinner-6-months");
  try {

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

    const response = await fetchWithErrorHandling('api/reports/monthly-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit_filter_value: 6,
      })
    })
    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }

    const data = await response.data.rows;

    // Parse data for chart
    const labels = data
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      )
      .reverse();
    const orderCounts = data.map((item) => Number(item.count)).reverse();
    const orderPrices = data
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
    console.error("Error fetching order data:", error);
    spinner.style.display = "none";
  }
}

async function renderOrderChartLastTwoDays() {
  const spinner = document.getElementById("spinner-2-days");
  try {
    
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

    const response = await fetchWithErrorHandling('api/reports/daily-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit_filter_value: 2,
      })
    })
    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }

    const data = await response.data.rows;

    // Parse data for 2-day chart
    const labels = data
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      )
      .reverse();
    const orderCounts = data.map((item) => Number(item.count)).reverse();
    const orderPrices = data
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
      body: JSON.stringify({ start_date_filter_value: startDate, end_date_filter_value: endDate })
    });

    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }
    const data = await response.data;
    const metrics = data.rows[0].dashboard_data;
    const yearBefore = new Date(endDate);
    yearBefore.setFullYear(yearBefore.getFullYear() - 1);
    dashboardContainer.innerHTML = `
      <div class="container mt-4">
      <h2 class="mb-4">Overall KPI</h2>
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
      body: JSON.stringify({ start_date_filter_value: startDate, end_date_filter_value: endDate })
    });

    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }

    const data = await response.data;
    const metrics = data.rows[0].campaign_data;

    dashboardContainer.innerHTML = `
      <div class="col-12">
       <h2 class="mb-4">Campaigns KPI</h2>
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

async function renderUserGroupsChart() {
  const spinner = document.getElementById("spinner-user-groups");
  const chartColorPalette = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#9b59b6', // Purple
    '#f39c12', // Orange
    '#1abc9c', // Teal
    '#fd79a8', // Pink
    '#34495e', // Dark Gray
    
    '#2980b9', // Blue
    '#c0392b', // Red
    '#27ae60', // Green
    '#8e44ad', // Purple
    '#f1c40f', // Yellow
    '#48c9b0', // Teal
    '#e84393', // Pink
    '#7f8c8d', // Gray
    
    '#5dade2', // Light Blue
    '#f1948a', // Light Red
    '#52be80', // Light Green
    '#d2b4de', // Light Purple
    '#f5b041', // Light Orange
    '#76d7c4', // Light Teal
    '#ff9ff3', // Light Pink
    '#95a5a6', // Light Gray
    
    '#1f618d', // Dark Blue
    '#a93226', // Dark Red
    '#229954', // Dark Green
    '#7d3c98', // Dark Purple
    '#d35400', // Dark Orange
    '#138d75', // Dark Teal
    '#d63031', // Dark Pink
    '#2c3e50', // Dark Gray
    
    '#154360', // Darker Blue
    '#922b21', // Darker Red
    '#1e8449', // Darker Green
    '#6c3483', // Darker Purple
    '#a04000', // Darker Orange
    '#0e6655', // Darker Teal
    '#ff6b6b', // Vibrant Red
    '#bdc3c7', // Silver
    
    '#85c1e9', // Sky Blue 
    '#cd6155', // Brick Red
    '#16a085', // Sea Green
    '#af7ac5', // Lavender
    '#f8c471', // Pale Orange
    '#48dbfb', // Bright Blue
    '#ee5253', // Coral
    '#7f8fa6', // Steel Blue
    
    '#4a86e8', // Royal Blue
    '#d98880', // Salmon
    '#0b5345', // Forest Green
    '#9c27b0', // Bright Purple
    '#e67e22', // Carrot Orange
    '#0abde3', // Sky Blue
    '#ff793f', // Tangerine
    '#718093', // Slate Gray
    
    '#2874a6', // Cerulean
    '#7b241c', // Mahogany
    '#0fb9b1', // Turquoise
    '#5b2c6f', // Indigo
    '#eb984e', // Sandy Brown
    '#00d2d3', // Cyan
    '#b71540', // Ruby
    '#dcdde1', // Gainsboro
    
    '#21618c', // Yale Blue
    '#641e16', // Maroon
    '#117a65', // Jungle Green
    '#4a235a', // Dark Violet
    '#e59866', // Peach
    '#2bcbba', // Aquamarine
    '#eb2f06', // Fire Engine Red
    '#353b48', // Charcoal
    
    '#1b4f72', // Navy Blue
    '#e6b0aa', // Light Coral
    '#0b5345', // Deep Green
    '#f368e0', // Hot Pink
    '#e8f8f5', // Mint
    '#273c75', // Dark Navy
    '#f9e79f', // Cream
    '#0a3d62'  // Marine Blue
  ];
  try {
    spinner.style.display = "inline-block";

    const appSettings = await fetchWithErrorHandling("/app-config/settings");

    if (!appSettings.ok) {
      showErrorMessage(appSettings.error);
      return;
    }

    const userGroups = await fetchWithErrorHandling(`/crud/user-groups/filtered?filterParams={}&pageSize=${appSettings.data.user_group_chart_count}&page=1`);
    if (!userGroups.ok) {
      showErrorMessage(userGroups.error);
      return;
    }

    const data = await userGroups.data;
    const labels = data.result.map(g => g.name);
    const counts = data.result.map(g => Number(g.users_count));

    const colors = labels.map((_, index) => chartColorPalette[index % chartColorPalette.length]);

    const ctx = document.getElementById('userGroupChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{
        label: 'User Count',
        data: counts,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('60%', '40%')),
        borderWidth: 1
      }]},
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'logarithmic',
            title: { display: true, text: 'Users' },
            ticks: {
              callback: value => {
                const n = Math.round(value);
                return formatNumber(n, false);
              },
              maxTicksLimit: 10
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const n = Math.round(ctx.raw);
                return `${ctx.dataset.label}: ${formatNumber(n, false)}`;
              }
            }
          }
        }
      }
    });

    const userGroupDetails = document.getElementById('user-group-details');
    const userGroupTable = document.getElementById('user-group-table');
    userGroupTable.innerHTML = data.result.map((group, index) => `
      <tr class="align-middle table-row-hover">
        <td>
          <div class="d-flex align-items-center">
            <span class="color-indicator me-3" style="display: inline-block; width: 14px; height: 14px; background-color: ${colors[index]}; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.8), 0 0 0 3px ${colors[index]}22;"></span>
            <span class="fw-medium">${group.name}</span>
          </div>
        </td>
        <td class="text-end">
          <a href="/report?report=report-users&filters=${encodeURIComponent(JSON.stringify(group.filters))}" 
            class="btn btn-sm btn-outline-primary rounded-pill px-3" 
            target="_blank"
            style="min-width: 120px;" 
            rel="noopener noreferrer">
            <i class="bi bi-bar-chart-line me-1"></i>
            ${formatNumber(Number(group.users_count), false)}
          </a>
        </td>
      </tr>
    `).join('');

  if(data.result.length > 0) {
    userGroupDetails.style.display = 'block';
  } else {
    userGroupDetails.style.display = 'none';
  }
  
  } catch(err) {
    console.error('Failed to load user groups chart', err);
  } finally {
    spinner.style.display = 'none';
  }
}

async function renderTargetGroupChart(){
  const spinner = document.getElementById("spinner-target-groups");
  const chartColorPalette = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#9b59b6', // Purple
    '#f39c12', // Orange
    '#1abc9c', // Teal
    '#fd79a8', // Pink
    '#34495e', // Dark Gray
    
    '#2980b9', // Blue
    '#c0392b', // Red
    '#27ae60', // Green
    '#8e44ad', // Purple
    '#f1c40f', // Yellow
    '#48c9b0', // Teal
    '#e84393', // Pink
    '#7f8c8d', // Gray
    
    '#5dade2', // Light Blue
    '#f1948a', // Light Red
    '#52be80', // Light Green
    '#d2b4de', // Light Purple
    '#f5b041', // Light Orange
    '#76d7c4', // Light Teal
    '#ff9ff3', // Light Pink
    '#95a5a6', // Light Gray
    
    '#1f618d', // Dark Blue
    '#a93226', // Dark Red
    '#229954', // Dark Green
    '#7d3c98', // Dark Purple
    '#d35400', // Dark Orange
    '#138d75', // Dark Teal
    '#d63031', // Dark Pink
    '#2c3e50', // Dark Gray
    
    '#154360', // Darker Blue
    '#922b21', // Darker Red
    '#1e8449', // Darker Green
    '#6c3483', // Darker Purple
    '#a04000', // Darker Orange
    '#0e6655', // Darker Teal
    '#ff6b6b', // Vibrant Red
    '#bdc3c7', // Silver
    
    '#85c1e9', // Sky Blue 
    '#cd6155', // Brick Red
    '#16a085', // Sea Green
    '#af7ac5', // Lavender
    '#f8c471', // Pale Orange
    '#48dbfb', // Bright Blue
    '#ee5253', // Coral
    '#7f8fa6', // Steel Blue
    
    '#4a86e8', // Royal Blue
    '#d98880', // Salmon
    '#0b5345', // Forest Green
    '#9c27b0', // Bright Purple
    '#e67e22', // Carrot Orange
    '#0abde3', // Sky Blue
    '#ff793f', // Tangerine
    '#718093', // Slate Gray
    
    '#2874a6', // Cerulean
    '#7b241c', // Mahogany
    '#0fb9b1', // Turquoise
    '#5b2c6f', // Indigo
    '#eb984e', // Sandy Brown
    '#00d2d3', // Cyan
    '#b71540', // Ruby
    '#dcdde1', // Gainsboro
    
    '#21618c', // Yale Blue
    '#641e16', // Maroon
    '#117a65', // Jungle Green
    '#4a235a', // Dark Violet
    '#e59866', // Peach
    '#2bcbba', // Aquamarine
    '#eb2f06', // Fire Engine Red
    '#353b48', // Charcoal
    
    '#1b4f72', // Navy Blue
    '#e6b0aa', // Light Coral
    '#0b5345', // Deep Green
    '#f368e0', // Hot Pink
    '#e8f8f5', // Mint
    '#273c75', // Dark Navy
    '#f9e79f', // Cream
    '#0a3d62'  // Marine Blue
  ];

  try {
    spinner.style.display = "inline-block";
    const response = await fetchWithErrorHandling('api/reports/target-group-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if(!response.ok) {
      showErrorMessage(response.error);
      return;
    }

    const data = await response.data;
    const labels = data.rows.map(g => g.name);
    const counts = data.rows.map(g => Number(g.users_count));
    const conversionRates = data.rows.map(g => Number(g.conversion_rate || 0));
    const colors = labels.map((_, index) => chartColorPalette[index % chartColorPalette.length]);

    // Create the chart
    const ctx = document.getElementById('targetGroupChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { 
        labels: labels, 
        datasets: [
          {
            label: 'User Count',
            data: counts,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('60%', '40%')),
            borderWidth: 1,
            order: 2,
            yAxisID: 'y'
          },
          {
            label: 'Conversion Rate (%)',
            data: conversionRates,
            type: 'line',
            borderColor: '#ff6384',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            pointRadius: 6,
            pointBackgroundColor: '#ff6384',
            pointStyle: 'rectRounded',
            fill: false,
            order: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'logarithmic',
            position: 'left',
            title: { display: true, text: 'Users' },
            ticks: {
              callback: value => {
                const n = Math.round(value);
                return formatNumber(n, false);
              },
              maxTicksLimit: 10
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Conversion %' },
            min: 0,
            max: Math.max(100, Math.max(...conversionRates) * 1.1),
            ticks: {
              callback: value => `${value.toFixed(1)}%`
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              filter: (legendItem) => legendItem.text === 'Conversion Rate (%)'
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                if (ctx.dataset.label === 'User Count') {
                  const n = Math.round(ctx.raw);
                  return `${ctx.dataset.label}: ${formatNumber(n, false)}`;
                } else {
                  return `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`;
                }
              }
            }
          }
        }
      }
    });
  } catch(err) {
    console.error('Failed to load target groups chart', err);
  } finally {
    spinner.style.display = 'none';
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

function formatNumber(value, formatAsCurrency = true) {
  if (typeof value !== 'number') return '0';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  if (formatAsCurrency) {
    return `${value.toFixed(2)}`;
  }

  return `${value}`;
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
