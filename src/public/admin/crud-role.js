import { CrudPageBuilder } from "./builder.js";

document.addEventListener("DOMContentLoaded", async () => {
  const schema = await fetch("/permissionsSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/permissions";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container"
  );
  crudPageBuilder.initialize();
});
