import { hasPermission } from "./auth.js";

function createNavigation(userStatus) {
  const navBar = document.createElement("nav");
  navBar.classList.add(
    "navbar",
    "navbar-expand-lg",
    "navbar-light",
    "bg-light"
  );

  navBar.innerHTML = `
          <div class="container-fluid">
              <a class="navbar-brand" href="/index.html">Backoffice</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                  aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                  <span class="navbar-toggler-icon"></span>
              </button>
              <div class="collapse navbar-collapse" id="navbarNav">
                  <ul class="navbar-nav ms-auto">
                      
                      ${
                        userStatus.session_type === "Authenticated"
                          ? `
                       <li class="nav-item">
                          <a class="nav-link" href="/management">Management</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link logout-btn" href="/logout">Logout</a>
                      </li>
                      `
                          : `
                      <li class="nav-item">
                          <a class="nav-link" href="/register.html">Register</a>
                      </li>
                      <li class="nav-item">
                          <a class="nav-link" href="/login.html">Login</a>
                      </li>
                      `
                      }
                  </ul>
              </div>
          </div>
      `;

  document.body.prepend(navBar);
}

function createBackofficeNavigation(userStatus) {
  const navContainer = document.getElementById("dynamic-nav");
  navContainer.innerHTML = ""; // Clear previous content

  const navItems = [
    {
      id: "settings-link",
      text: "Site Settings",
      href: "/site-settings",
      permission: "view",
      interface: "site-settings",
    },
    {
      id: "crud-product-link",
      text: "CRUD Products",
      href: "/crud-product",
      permission: "view",
      interface: "products",
    },
    {
      id: "crud-user-link",
      text: "CRUD Users",
      href: "/crud-user",
      permission: "view",
      interface: "users",
    },
    {
      id: "crud-staff-user-link",
      text: "CRUD Staff Users",
      href: "/crud-staff-user",
      permission: "view",
      interface: "admin-users",
    },
    {
      id: "crud-order-link",
      text: "CRUD Orders",
      href: "/crud-order",
      permission: "view",
      interface: "orders",
    },
    {
      id: "crud-role-link",
      text: "CRUD Roles",
      href: "/crud-role",
      permission: "view",
      interface: "roles",
    },
    {
      id: "logs-link",
      text: "Report Logs",
      href: "/logs",
      permission: "view",
      interface: "report-logs",
    },
    {
      id: "report-order-link",
      text: "Report Orders",
      href: "/report-order",
      permission: "view",
      interface: "report-orders",
    },
    {
      id: "upload-products-link",
      text: "Upload Products from CSV",
      href: "/upload-products",
      permission: "create",
      interface: "products",
    },
    {
      id: "email-templates-link",
      text: "Email Templates",
      href: "/email-templates",
      permission: "view",
      interface: "email-templates",
    },
  ];

  navItems.forEach((item) => {
    if (hasPermission(userStatus, item.permission, item.interface)) {
      const li = document.createElement("li");
      li.classList.add("nav-item");
      const a = document.createElement("a");
      a.classList.add("nav-link");
      a.id = item.id;
      a.href = item.href;
      a.textContent = item.text;
      li.appendChild(a);
      navContainer.appendChild(li);
    }
  });
}

function formatCurrency(number) {
  if(!number) {
    return '$0.00';
  }
  return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(number)).replace(',', '.')}`;
}

export { createNavigation, createBackofficeNavigation, formatCurrency };
