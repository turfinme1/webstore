import { CrudPageBuilder } from "./builder.js";
import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, hasPermission, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);
  const schema = await fetch("/campaignSchema.json").then((res) => res.json());
  const querySchema = await fetch("/campaignQueryParamsSchema.json").then((res) => res.json());
  const apiEndpoint = "/crud/campaigns";
  const crudPageBuilder = new CrudPageBuilder(
    schema,
    apiEndpoint,
    "crud-container",
    userStatus,
    querySchema
  );
  crudPageBuilder.initialize();
});
