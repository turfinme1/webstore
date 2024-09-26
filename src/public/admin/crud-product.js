import { getUserStatus, attachLogoutHandler } from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
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

  let categoryChoices;
  let categoryUpdateChoices;
  let currentPage = 1;
  const pageSize = 10;
  let searchParams = {};

  productForm.reset();
  const userStatus = await getUserStatus();
  createNavigation(userStatus);

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
    const categories = await response.json();

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
      const queryParams = new URLSearchParams();
      if (Object.keys(searchParams).length > 0) {
        queryParams.append("searchParams", JSON.stringify(searchParams));
      }
      queryParams.append("pageSize", pageSize.toString());
      queryParams.append("page", currentPage.toString());

      const response = await fetch(`/api/products?${queryParams.toString()}`);
      const data = await response.json();
      const products = data.result;
      const totalProducts = parseInt(data.count);

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
            if(!image) {
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
      const productResponse = await fetch(`/crud/products/${productId}`);
      const product = await productResponse.json();

      if (!product) {
        console.error("Product not found");
        return;
      }

      // Show the form container
      formUpdateContainer.style.display = "block";
      formContainer.style.display = "none";

      // Populate form fields with product data
      productUpdateForm["name"].value = product.name;
      productUpdateForm["price"].value = product.price;
      productUpdateForm["short_description"].value = product.short_description;
      productUpdateForm["long_description"].value = product.long_description;

      // Fetch categories and populate them, marking selected ones
      const categoriesResponse = await fetch("/crud/categories");
      const categories = await categoriesResponse.json();

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
        const categories = Array.from(
          productUpdateCategorySelect.selectedOptions
        ).map((option) => option.value);
        formData.set("categories", JSON.stringify(categories)); // Add selected categories to the form data

        // Handle image deletions
        const imagesToDelete = [
          ...imageContainer.querySelectorAll(".selected"),
        ].map((img) => img.dataset.imageUrl);
        formData.set("imagesToDelete", JSON.stringify(imagesToDelete));

        try {
          const response = await fetch(`/crud/products/${productId}`, {
            method: "PUT",
            body: formData,
          });

          if (response.ok) {
            alert("Product updated successfully!");
            productUpdateForm.reset();
            formUpdateContainer.style.display = "none";
          } else {
            const errorData = await response.json();
            console.error("Error:", errorData);
            alert("Failed to update product.");
          }
        } catch (error) {
          console.error("Error submitting the form:", error);
          alert("Failed to update product.");
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
        const response = await fetch(`/crud/products/${productId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Product deleted successfully!");
          loadProducts(currentPage); // Reload the product list after deletion
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
