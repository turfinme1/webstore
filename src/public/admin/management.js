import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

const { metrics } = {
  "metrics": [
    {
      "name": "Registered Users",
      "trend": [
        11,
        11,
        11,
        11,
        11,
        11,
        11,
        12,
        12,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        63,
        1417,
        2812,
        4235,
        5643
      ],
      "change": 30.92,
      "current": 5848,
      "previous": 4467
    },
    {
      "name": "Users with Orders",
      "trend": [
        11,
        11,
        11,
        11,
        11,
        11,
        11,
        11,
        11,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        12,
        0,
        1,
        1,
        0,
        0,
        0,
        2,
        6,
        164,
        266,
        437,
        159
      ],
      "change": 44.98,
      "current": 722,
      "previous": 498
    },
    {
      "name": "Average Order Price",
      "trend": [
        15248.33,
        15332.05,
        15111.94,
        15406.8,
        15298.26,
        15289.46,
        15283.96,
        15311.96,
        15488.03,
        15407.34,
        15068.51,
        15264.1,
        15258.19,
        15143.01,
        15173.39,
        14988.41,
        15141.84,
        15355.3,
        15288.2,
        15259.1,
        15288.61,
        15301.66,
        15420.4,
        15116.97,
        15423.15,
        15262.76,
        15402.48,
        15159.53,
        15351.21,
        15101.73,
        15385.8,
        15366.01,
        15239.92,
        15240.82,
        15344.67,
        15348.36,
        15181.32,
        15386.98,
        15394.71,
        15084.64,
        15228.13,
        15205.41,
        0,
        3017.23,
        2078.08,
        0,
        0,
        0,
        2170.86,
        24200.68,
        21341.44,
        20765.32,
        21134.69,
        19359.17
      ],
      "change": 5.67,
      "current": 21217.27,
      "previous": 20078.19
    },
    {
      "name": "Average User Spend",
      "trend": [
        7014233.62,
        6949601.42,
        7082004.29,
        7262207.42,
        7048324.35,
        6988672.33,
        7023672.27,
        6996175.28,
        7203342.91,
        7137451.06,
        6934026.12,
        7046925.09,
        7250185.38,
        6850949.98,
        6967112.64,
        6958371.6,
        6921084.65,
        7213153.04,
        6911538.76,
        6878038.24,
        7114299.44,
        7139497.28,
        7358103.06,
        6955068.16,
        7080509.15,
        6997976.79,
        7259704.41,
        6896324.89,
        7183085.52,
        7017269.85,
        7139009.16,
        7012024.64,
        6927813.59,
        7127624.95,
        6906379.54,
        7092219.19,
        7044132.07,
        7071600.22,
        7073869.49,
        7040754.85,
        7119149.17,
        7078119.79,
        null,
        3017.23,
        2078.08,
        null,
        null,
        null,
        3021.57,
        24200.68,
        21341.44,
        21061.32,
        21134.69,
        19359.17
      ],
      "change": -23.99,
      "current": 21599.3,
      "previous": 28415.26
    },
    {
      "name": "Net Revenue",
      "trend": [
        77156569.85,
        76445615.66,
        77902047.24,
        79884281.57,
        77531567.84,
        76875395.67,
        77260394.93,
        76957928.1,
        79236771.97,
        85649412.77,
        83208313.43,
        84563101.06,
        87002224.55,
        82211399.8,
        83605351.63,
        83500459.18,
        83053015.76,
        86557836.42,
        82938465.1,
        82536458.84,
        85371593.24,
        85673967.34,
        88297236.67,
        83460817.9,
        84966109.84,
        83975721.43,
        87116452.95,
        82755898.64,
        86197026.26,
        84207238.22,
        85668109.9,
        84144295.64,
        83133763.12,
        85531499.36,
        82876554.42,
        85106630.29,
        84529584.85,
        84859202.67,
        84886433.82,
        84489058.18,
        85429790.03,
        84937437.45,
        0,
        3017.23,
        2078.08,
        0,
        0,
        0,
        6043.13,
        145204.05,
        3499996.78,
        5602310.32,
        9235859.73,
        3078108.64
      ],
      "change": 10.2,
      "current": 15594691.15,
      "previous": 14150798.47
    },
    {
      "name": "User Net Revenue",
      "trend": [
        7014233.62,
        6949601.42,
        7082004.29,
        7262207.42,
        7048324.35,
        6988672.33,
        7023672.27,
        6413160.68,
        6603064.33,
        6588416.37,
        6400639.49,
        6504853.93,
        6692478.81,
        6323953.83,
        6431180.89,
        6423112.24,
        6388693.52,
        6658295.11,
        6379881.93,
        6348958.37,
        6567045.63,
        6590305.18,
        6792095.13,
        6420062.92,
        6535854.6,
        6459670.88,
        6701265.61,
        6365838.36,
        6630540.48,
        6477479.86,
        6589854.61,
        6472638.13,
        6394904.86,
        6579346.1,
        6375119.57,
        6546663.87,
        6502275.76,
        6527630.97,
        6529725.68,
        6499158.32,
        6571522.31,
        6533649.03,
        0,
        232.09,
        159.85,
        0,
        0,
        0,
        464.86,
        2304.83,
        2470,
        1992.29,
        2180.84,
        545.47
      ],
      "change": -15.82,
      "current": 2666.67,
      "previous": 3167.85
    }
  ]
};

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