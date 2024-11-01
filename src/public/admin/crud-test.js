import { CrudPageBuilder } from "./builder.js";

document.addEventListener("DOMContentLoaded", async () => {
  const schema = await fetch("/adminUserSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/admin-users";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container"
  );
  crudPageBuilder.initialize();
});
