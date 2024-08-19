document.addEventListener("DOMContentLoaded", () => {
  const schema = getSchemaBasedOnUrl();

  const formContainer = document.getElementById("form-container");

  document.getElementById("create-btn").addEventListener("click", () => {
    formContainer.innerHTML = ""; 
    const createFormElement = createForm(schema, "create-form");
    formContainer.appendChild(createFormElement);

    const event = new Event("formCreated");
    document.dispatchEvent(event);
  });

  document.getElementById("search-btn").addEventListener("click", () => {
    formContainer.innerHTML = ""; 
    const searchFormElement = createSearchForm(schema, "search-form");
    formContainer.appendChild(searchFormElement);

    const event = new Event("searchFormCreated");
    document.dispatchEvent(event);
  });

  renderTable(schema);
});
