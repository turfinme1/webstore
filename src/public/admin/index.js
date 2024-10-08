import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

// Dynamically create buttons based on user status
document.addEventListener("DOMContentLoaded", async () => {
  const actionButtonsDiv = document.getElementById("action-buttons");
  const mainContentDiv = document.getElementById("main-container");

  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  await attachLogoutHandler();

  if (userStatus.session_type === "Authenticated") {
    window.location.href = "/management";
  } else {
    mainContentDiv.style.display = "block";
    actionButtonsDiv.innerHTML = `
            <a href="/login" class="btn btn-primary my-2">Login</a>
        `;
  }
});
