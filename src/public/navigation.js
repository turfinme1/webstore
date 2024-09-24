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
            <a class="navbar-brand" href="/index.html">Product Showcase</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="/index.html">Products</a>
                    </li>
                    ${
                      userStatus.session_type === "Authenticated"
                        ? `
                     <li class="nav-item">
                        <a class="nav-link" href="/user-profile">${userStatus.name}</a>
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
                        <a class="nav-link" href="/forgot-password.html">Forgot Password</a>
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

export { createNavigation };
