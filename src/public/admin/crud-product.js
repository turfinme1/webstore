import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const createProductButton = document.getElementById("create-product-btn");
  const formContainer = document.getElementById("form-container");
  const productCategorySelect = document.getElementById("product-category");
  const categoryErrorMessage = document.getElementById(
    "category-error-message"
  );
  const productForm = document.getElementById("product-form");
  const cancelButton = document.getElementById("cancel-btn");
  const productListContainer = document.getElementById("product-list");
  const paginationContainer = document.getElementById("pagination-container");
  const currentPageDisplay = document.getElementById("current-page-display");

  let currentPage = 6069; // Current page number
  const pageSize = 10; // Number of products per page

  cancelButton.addEventListener("click", () => {
    formContainer.style.display = "none";
  });

  const userStatus = await getUserStatus();
  createNavigation(userStatus);

  if (productForm) {
    // productForm.reset();
  }

  // Fetch categories from the backend and populate the multi-select
  try {
    const response = await fetch("/crud/categories");
    const categories = await response.json();

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      productCategorySelect.appendChild(option);
    });

    // Initialize Choices.js on the multi-select element
    const categoryChoices = new Choices("#product-category", {
      removeItemButton: true,
      shouldSort: false,
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  // Load and render the form on clicking "Create Product"
  createProductButton.addEventListener("click", () => {
    formContainer.style.display = "block"; // Show the form
    // Load categories from the backend when the form is displayed
  });

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
      const response = await fetch("/crud/products", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Product created successfully!");
        productForm.reset();
        formContainer.style.display = "none";
      } else {
        const errorData = await response.json();
        console.error("Error:", errorData);
        alert("Failed to create product.");
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      alert("Failed to create product.");
    }
  });

  async function loadProducts(currentPage) {
    try {
      const response = await fetch(`/api/products?pageSize=${pageSize}&page=${currentPage}`);
      const data = await response.json();
      const products = data.result;
      const totalProducts = data.count;

      productListContainer.innerHTML = ""; // Clear the existing product list

      // Display products
      products.forEach((product) => {
        const productRow = document.createElement("tr");

        // Name Column
        const nameCell = document.createElement("td");
        nameCell.textContent = product.name;
        productRow.appendChild(nameCell);

        // Price Column
        const priceCell = document.createElement("td");
        priceCell.textContent = product.price;
        productRow.appendChild(priceCell);

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
            if (index < 3) {
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
        actionCell.appendChild(updateButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("btn", "btn-danger");
        deleteButton.addEventListener("click", () =>
          handleDeleteProduct(product.id)
        );
        actionCell.appendChild(deleteButton);

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

    paginationContainer.innerHTML = ""; // Clear existing pagination buttons
    currentPageDisplay.innerHTML = `Page ${page} of ${totalPages}`;

    // Previous Button
    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.classList.add("btn", "btn-secondary", "me-2");
    prevButton.disabled = page === 1; // Disable if on the first page
    prevButton.addEventListener("click", () => loadProducts(page - 1));
    paginationContainer.appendChild(prevButton);

    // Next Button
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.classList.add("btn", "btn-secondary", "ms-2");
    nextButton.disabled = page === totalPages; // Disable if on the last page
    nextButton.addEventListener("click", () => loadProducts(page + 1));
    paginationContainer.appendChild(nextButton);
  }

  // Function to handle product updates
  function handleUpdateProduct(productId) {
    // Logic to update the product can go here (e.g., loading form with product details)
    alert(`Update product with ID: ${productId}`);
  }

  // Function to handle product deletions
  async function handleDeleteProduct(productId) {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetch(`/products/${productId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Product deleted successfully!");
          loadProducts(); // Reload the product list after deletion
        } else {
          alert("Failed to delete product.");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product.");
      }
    }
  }

  loadProducts(currentPage);
});
