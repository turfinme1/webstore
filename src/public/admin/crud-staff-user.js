import { CrudPageBuilder } from "./builder.js";
import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  await attachLogoutHandler();
  const schema = await fetch("/adminUserSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/admin-users";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container",
    userStatus
  );
  crudPageBuilder.initialize();
});
