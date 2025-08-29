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

function formatCurrency(number) {
  if(!number) {
    return '$0.00';
  }
  return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(number)).replace(',', '.')}`;
}

export { createNavigation, formatCurrency };
