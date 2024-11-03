import { CrudPageBuilder } from "./builder.js";

document.addEventListener("DOMContentLoaded", async () => {
  const schema = await fetch("/roleSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/roles";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container"
  );
  crudPageBuilder.initialize();
});
