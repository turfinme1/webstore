import { createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showToastMessage, hasPermission, getUrlParams, updateUrlParams } from "./page-utility.js";

document.addEventListener("DOMContentLoaded", async () => {
  const mainContainer = document.getElementById("main-container");
  const createProductButton = document.getElementById("create-product-btn");
  const formContainer = document.getElementById("form-container");
  const formUpdateContainer = document.getElementById("form-update-container");
  const productCategorySelect = document.getElementById("product-category");
  const productUpdateCategorySelect = document.getElementById(
    "product-update-category"
  );
  const categoryErrorMessage = document.getElementById(
    "category-error-message"
  );
  const productForm = document.getElementById("product-form");
  const productUpdateForm = document.getElementById("product-update-form");
  const cancelButton = document.getElementById("cancel-btn");
  const cancelUpdateButton = document.getElementById("cancel-update-btn");
  const productListContainer = document.getElementById("product-list");
  const paginationContainer = document.getElementById("pagination-container");
  const currentPageDisplay = document.getElementById("current-page-display");
  const searchButton = document.getElementById("search-btn");
  const resultCountDisplay = document.getElementById("result-count");

  const categoryOptions = document.getElementById("category-options");
  const applyFiltersBtn = document.getElementById("apply-filters");
  const minPriceInput = document.getElementById("min-price-input");
  const maxPriceInput = document.getElementById("max-price-input");
  const categoryFilterInput = document.getElementById("category-filter-input");
  const searchInput = document.getElementById("search-input");
  const orderbyInput = document.getElementById("order_by");

  let categories;
  let categoryChoices;
  let categoryUpdateChoices;
  let currentPage = 1;
  let pageSize = 10;
  let searchParams = {};
  let orderParams = [];
  let filterParams = {};
  let selectedCategories = [];
  let minPrice = null;
  let maxPrice = null;

  const urlParams = getUrlParams();
  currentPage = urlParams.page || 1;
  pageSize = urlParams.pageSize || 10;
  filterParams = urlParams.filterParams || {};
  orderParams = urlParams.orderParams || [];
  searchParams = urlParams.searchParams || {};

  productForm.reset();
  const userStatus = await getUserStatus();
  createNavigation(userStatus);
  createBackofficeNavigation(userStatus);

  if (!hasPermission(userStatus, "read", "products")) {
    mainContainer.innerHTML = "<h1>Product Management</h1>";
    return;
  }

  if (!hasPermission(userStatus, "create", "products")) {
    createProductButton.style.display = "none";
  }

  cancelButton.addEventListener("click", () => {
    formContainer.style.display = "none";
  });

  cancelUpdateButton.addEventListener("click", () => {
    formUpdateContainer.style.display = "none";
  });

  searchButton.addEventListener("click", async () => {
    const searchInput = document.getElementById("search-input");
    searchParams.keyword = searchInput.value.trim();
    currentPage = 1;
    formContainer.style.display = "none";
    formUpdateContainer.style.display = "none";
    loadProducts(currentPage);
  });

  orderbyInput.addEventListener("change", () => {
    currentPage = 1;
    loadProducts(currentPage);
  });

  document.addEventListener("click", (e) => {
    if (
      !categoryFilterInput.contains(e.target) &&
      !categoryOptions.contains(e.target)
    ) {
      categoryOptions.style.display = "none";
    }
  });

  // Load and render the form on clicking "Create Product"
  createProductButton.addEventListener("click", () => {
    formContainer.style.display = "block";
    formUpdateContainer.style.display = "none";
    productForm.reset();
    categoryChoices.removeActiveItems();
  });

  // Fetch categories from the backend and populate the multi-select
  try {
    const response = await fetch("/crud/categories");
    categories = await response.json();

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      productCategorySelect.appendChild(option);
      productUpdateCategorySelect.appendChild(option.cloneNode(true));
    });

    categoryChoices = new Choices("#product-category", {
      removeItemButton: true,
      shouldSort: false,
    });
    categoryUpdateChoices = new Choices("#product-update-category", {
      removeItemButton: true,
      shouldSort: false,
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  function validateCategories() {
    const selectedCategories = Array.from(
      productCategorySelect.selectedOptions
    );
    if (selectedCategories.length === 0) {
      productCategorySelect.classList.add("is-invalid");
      categoryErrorMessage.style.display = "block";
      return false;
    } else {
      productCategorySelect.classList.remove("is-invalid");
      categoryErrorMessage.style.display = "none";
      return true;
    }
  }

  function separateFormData(formData) {
    const jsonData = {};
    jsonData["categories"] = [];
    const fileData = new FormData();

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        fileData.append(key, value);
      } else {
        if (key === "categories") {
          jsonData[key].push(value);
        } else {
          jsonData[key] = value;
        }
      }
    }

    return { jsonData, fileData };
  }

  // Handle form submission
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateCategories()) {
      return; // Prevent form submission if validation fails
    }

    const formData = new FormData(productForm);
    const categories = Array.from(productCategorySelect.selectedOptions).map(
      (option) => option.value
    );
    formData.set("categories", JSON.stringify(categories)); // Add selected categories to the form data
    console.log(formData);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Product created successfully!");
        productForm.reset();
        loadProducts(currentPage);
        formContainer.style.display = "none";
      } else {
        const error = await response.json();
        console.error("Error:", error);
        alert(`Failed to create product: ${error.error}`);
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      alert("Failed to create product.");
    }
  });

  async function loadProducts(currentPage) {
    try {
      filterParams = filterParams || {};
      if (selectedCategories.length > 0) {
        filterParams.categories = selectedCategories;
      }
      if (minPrice !== null || maxPrice !== null) {
        filterParams.price = {};
        if (minPrice !== null) {
          filterParams.price.min = minPrice;
        }
        if (maxPrice !== null) {
          filterParams.price.max = maxPrice;
        }
      }
      const queryParams = new URLSearchParams();
      if (Object.keys(searchParams).length > 0) {
        queryParams.append("searchParams", JSON.stringify(searchParams));
      }
      if (Object.keys(filterParams).length > 0) {
        queryParams.append("filterParams", JSON.stringify(filterParams));
      }
      if (orderbyInput.value) {
        queryParams.append("orderParams", JSON.stringify([ orderbyInput.value.split(" ") ]));
      } else {
        queryParams.append("orderParams", JSON.stringify([["id", "DESC"]]));
      }
      queryParams.append("pageSize", pageSize.toString());
      queryParams.append("page", currentPage.toString());

      updateUrlParams({ currentPage, pageSize, searchParams, filterParams, orderParams });
      const response = await fetchWithErrorHandling(`/api/products?${queryParams.toString()}`);

      if(!response.ok) {
        showToastMessage(response.error, "error");
        return;
      }
      const data = await response.data;
      const products = data.result;
      const totalProducts = parseInt(data.count);

      productListContainer.innerHTML = ""; // Clear the existing product list

      // Display products
      products.forEach((product) => {
        const productRow = document.createElement("tr");

        // Code Column
        const codeCell = document.createElement("td");
        codeCell.textContent = product.code;
        productRow.appendChild(codeCell);

        // Name Column
        const nameCell = document.createElement("td");
        nameCell.textContent = product.name;
        productRow.appendChild(nameCell);

        // Price Column
        const priceCell = document.createElement("td");
        priceCell.textContent = `$${product.price}`;
        priceCell.style.textAlign = "right";
        productRow.appendChild(priceCell);
        
        // Price with VAT Column
        const priceWithVatCell = document.createElement("td");
        priceWithVatCell.textContent = `$${product.price_with_vat}`;
        priceWithVatCell.style.textAlign = "right";
        productRow.appendChild(priceWithVatCell);

        // Short Description Column
        const shortDescCell = document.createElement("td");
        shortDescCell.textContent = product.short_description;
        productRow.appendChild(shortDescCell);

        // Long Description Column
        const longDescCell = document.createElement("td");
        longDescCell.textContent = product.long_description;
        productRow.appendChild(longDescCell);

        // Categories Column
        const categoryCell = document.createElement("td");
        categoryCell.textContent = product.categories.join(", ");
        productRow.appendChild(categoryCell);

        // Images Column
        const imageCell = document.createElement("td");
        if (product.images && product.images.length > 0) {
          product.images.forEach((image, index) => {
            if (!image) {
              return;
            }
            if (index < 10) {
              const imgElement = document.createElement("img");
              imgElement.src = image;
              imgElement.alt = `Product Image ${index + 1}`;
              imgElement.style.width = "50px";
              imgElement.style.height = "auto";
              imgElement.classList.add("me-2");
              imageCell.appendChild(imgElement);
            }
          });
        }
        productRow.appendChild(imageCell);

        // Actions Column
        const actionCell = document.createElement("td");
        const updateButton = document.createElement("button");
        updateButton.textContent = "Update";
        updateButton.classList.add("btn", "btn-warning", "me-2");
        updateButton.addEventListener("click", () =>
          handleUpdateProduct(product.id)
        );
        if (hasPermission(userStatus, "update", "products")) {
          actionCell.appendChild(updateButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("btn", "btn-danger");
        deleteButton.addEventListener("click", () =>
          handleDeleteProduct(product.id)
        );
        if (hasPermission(userStatus, "delete", "products")) {
          actionCell.appendChild(deleteButton);
        }

        productRow.appendChild(actionCell);
        productListContainer.appendChild(productRow);
      });

      // Update pagination UI
      updatePagination(totalProducts, currentPage);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  function updatePagination(totalProducts, page) {
    const totalPages = Math.ceil(totalProducts / pageSize);
    paginationContainer.innerHTML = "";
    currentPageDisplay.innerHTML = "";
    resultCountDisplay.textContent = `Found ${totalProducts} results`;
    if (totalProducts === 0) {
      return;
    }

    currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;

    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.classList.add("btn", "btn-secondary", "me-2");
    prevButton.disabled = page === 1; // Disable if on the first page
    prevButton.addEventListener("click", () => loadProducts(page - 1));
    paginationContainer.appendChild(prevButton);

    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.classList.add("btn", "btn-secondary", "ms-2");
    nextButton.disabled = page >= totalPages; // Disable if on the last page
    nextButton.addEventListener("click", () => loadProducts(page + 1));
    paginationContainer.appendChild(nextButton);
  }

  // Function to handle product updates
  async function handleUpdateProduct(productId) {
    try {
      // Fetch product details by ID from the backend
      const productResponse = await fetchWithErrorHandling(`/crud/products/${productId}`);
      
      if (!productResponse.ok) {
        console.error("Product not found");
        showToastMessage(productResponse.error, "error");
        return;
      }
      const product = await productResponse.data;
      
      // Show the form container
      formUpdateContainer.style.display = "block";
      formContainer.style.display = "none";

      // Populate form fields with product data
      productUpdateForm["name"].value = product.name;
      productUpdateForm["price"].value = product.price;
      productUpdateForm["short_description"].value = product.short_description;
      productUpdateForm["long_description"].value = product.long_description;

      // Fetch categories and populate them, marking selected ones
      const categoriesResponse = await fetchWithErrorHandling("/crud/categories");
      const categories = await categoriesResponse.data;

      // Populate categories and mark selected categories
      categories.forEach((category) => {
        if (product.categories.includes(category.id)) {
          option.selected = true;
        }
      });

      categoryUpdateChoices.removeActiveItems();
      // Populate categories and mark selected categories
      categories.forEach((category) => {
        // Add the category to the select dropdown
        const option = new Option(category.name, category.id);
        productUpdateCategorySelect.add(option);

        // Check if the category is part of the product's selected categories
        if (product.categories.includes(category.name)) {
          // Mark it as selected
          categoryUpdateChoices.setChoiceByValue(String(category.id)); // Convert ID to string for consistency
        }
      });

      // Display existing images with clickable removal
      const imageContainer = document.getElementById("existing-images");
      imageContainer.innerHTML = ""; // Clear previous images
      product.images.forEach((image, index) => {
        if (!image) {
          return;
        }
        const imgElement = document.createElement("img");
        imgElement.src = image;
        imgElement.alt = `Product Image ${index + 1}`;
        imgElement.style.width = "200px"; // Set width as needed
        imgElement.style.cursor = "pointer"; // Indicate clickability
        imgElement.classList.add("me-2", "existing-image");
        imgElement.dataset.imageUrl = image; // Store image URL for reference
        imageContainer.appendChild(imgElement);

        // Add click event to mark for deletion
        imgElement.addEventListener("click", () => {
          imgElement.classList.toggle("selected"); // Toggle selection
          imgElement.style.border = imgElement.classList.contains("selected")
            ? "6px solid red"
            : ""; // Visual feedback
        });
      });

      productUpdateForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(productUpdateForm);

        // Handle image deletions
        const imagesToDelete = [
          ...imageContainer.querySelectorAll(".selected"),
        ].map((img) => img.dataset.imageUrl);
        formData.set("imagesToDelete", JSON.stringify(imagesToDelete));

        const { jsonData, fileData } = separateFormData(formData);
        const categories = Array.from(
          productUpdateCategorySelect.selectedOptions
        ).map((option) => option.value);
        formData.set("categories", JSON.stringify(categories)); // Add selected categories to the form data

        try {
          const response = await fetchWithErrorHandling(`/api/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonData),
          });

          if (response.ok) {
            const imageUploadResponse = await fetchWithErrorHandling(
              `/api/products/${productId}/images`,
              {
                method: "POST",
                body: formData,
              }
            );

            if (imageUploadResponse.ok) {
              showToastMessage("Product updated successfully!", "success");
              await new Promise((resolve) => setTimeout(resolve, 1000));
              productUpdateForm.reset();
              window.location.reload();
              // loadProducts(currentPage);
              formUpdateContainer.style.display = "none";
            } else {
              const error = await imageUploadResponse.json();
              console.error("Error:", error);
              alert(`Failed to update product: ${error.error}`);
            }
          } else {
            console.error("Error:", error);
            showToastMessage(`Failed to update product: ${response.error}`, "error");
          }
        } catch (error) {
          console.error("Error submitting the form:", error);
          showToastMessage("Failed to update product.", "error");
        }
      });
    } catch (error) {
      console.error("Error fetching product or categories:", error);
    }
  }

  // Function to handle product deletions
  async function handleDeleteProduct(productId) {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetchWithErrorHandling(`/api/products/${productId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Product deleted successfully!");
          showToastMessage("Product deleted successfully!", "success");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          window.location.reload();
          loadProducts(currentPage); // Reload the product list after deletion
        } else {
          showToastMessage(`Failed to delete product: ${response.error}`, "error");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product.");
      }
    }
  }

  const renderCategoryOptions = (categories) => {
    categoryOptions.innerHTML = ""; // Clear existing options

    categories.forEach((category) => {
      const label = document.createElement("label");

      // Create input element (checkbox)
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = category.name;

      // Append checkbox and text to label
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${category.name}`));

      // Append label to the category options container
      categoryOptions.appendChild(label);

      // Add event listener for category checkbox
      checkbox.addEventListener("change", (e) => {
        const value = e.target.value;

        if (e.target.checked) {
          selectedCategories.push(value);
        } else {
          selectedCategories = selectedCategories.filter(
            (cat) => cat !== value
          );
        }

        updateSelectedCategories();
      });
    });
  };

  const updateSelectedCategories = () => {
    categoryFilterInput.value =
      selectedCategories.length > 0 ? selectedCategories.join(", ") : "";
  };

  categoryFilterInput.addEventListener("click", () => {
    categoryOptions.style.display =
      categoryOptions.style.display === "block" ? "none" : "block";
  });

  applyFiltersBtn.addEventListener("click", () => {
    const minPriceValue = minPriceInput.value.trim();
    const maxPriceValue = maxPriceInput.value.trim();

    if (minPriceValue && isNaN(minPriceValue)) {
      alert("Minimum price must be a number.");
      return;
    }
    if (maxPriceValue && isNaN(maxPriceValue)) {
      alert("Maximum price must be a number.");
      return;
    }
    
    if(minPriceValue < 0 || maxPriceValue < 0) {
      alert("Price cannot be negative.");
      return;
    }

    minPrice = minPriceValue !== "" ? parseFloat(minPriceValue) : null;
    maxPrice = maxPriceValue !== "" ? parseFloat(maxPriceValue) : null;

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      alert("Minimum price cannot be greater than maximum price.");
      return;
    }

    currentPage = 1;
    loadProducts(currentPage);
  });

  loadProducts(currentPage);
  renderCategoryOptions(categories);
});

///
