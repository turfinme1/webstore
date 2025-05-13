import { CrudPageBuilder } from "./builder.js";
import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  const schema = await fetch("/voucherSchema.json").then((res) => res.json());
  const querySchema = await fetch("/voucherQueryParamsSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/vouchers";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container",
    userStatus,
    querySchema
  );
  crudPageBuilder.initialize();
});
