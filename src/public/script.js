import { attachLogoutHandler, getUserStatus } from "./auth.js";
import { createNavigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", async () => {
  const productList = document.getElementById("product-list");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const categoryFilterInput = document.getElementById("category-filter-input");
  const categoryOptions = document.getElementById("category-options");
  const selectedCategoriesDiv = document.getElementById("selected-categories");
  const paginationContainer = document.getElementById("pagination-container");
  const currentPageDisplay = document.getElementById("current-page-display");
  const minPriceInput = document.getElementById("min-price-input");
  const maxPriceInput = document.getElementById("max-price-input");
  const sortPriceSelect = document.getElementById("sort-price");
  const applyFiltersBtn = document.getElementById("apply-filters");
  const resultCountDisplay = document.getElementById("result-count");

  let selectedCategories = [];
  let currentPage = 1;
  const pageSize = 6;
  let sortOption = ""; // Sort option for price ("ASC" or "DESC")
  let minPrice = null;
  let maxPrice = null;
  let userStatus = await getUserStatus();

  // Function to fetch categories from the server
  const fetchCategories = async () => {
    const response = await fetch("/crud/categories");
    const categories = await response.json();
    return categories;
  };

  // Function to render category checkboxes
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

  // Fetch and render categories when the page loads
  const initializeCategories = async () => {
    categoryFilterInput.value = "";
    const categories = await fetchCategories();
    renderCategoryOptions(categories);
  };

  const fetchProducts = async (
    searchTerm = "",
    categories = [],
    page = 1,
    minPrice = null,
    maxPrice = null,
    sortOption = ""
  ) => {
    // Build searchParams with only the keyword
    const searchParams = {};
    if (searchTerm) {
      searchParams.keyword = searchTerm;
    }

    // Build filterParams with categories and price
    const filterParams = {};
    if (categories.length > 0) {
      filterParams.categories = categories;
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

    // Build orderParams
    const orderParams = [];
    if (sortOption) {
      // orderParams.push(["price", sortOption.toUpperCase()]);
      orderParams.push(sortOption);
    }

    // Construct query parameters
    const queryParams = new URLSearchParams();
    if (Object.keys(searchParams).length > 0) {
      queryParams.append("searchParams", JSON.stringify(searchParams));
    }
    if (Object.keys(filterParams).length > 0) {
      queryParams.append("filterParams", JSON.stringify(filterParams));
    }
    if (orderParams.length > 0) {
      queryParams.append("orderParams", JSON.stringify(orderParams));
    }
    queryParams.append("pageSize", pageSize.toString());
    queryParams.append("page", page.toString());

    // Fetch products
    const response = await fetch(`/api/products?${queryParams.toString()}`);
    return await response.json();
  };

  const renderProducts = (products) => {
    productList.innerHTML = "";
    products.slice(0, pageSize).forEach((product) => {
      const productCard = document.createElement("div");
      productCard.classList.add("col-md-4", "product-card");
  
      productCard.innerHTML = `
        <div class="card h-100">
          <div id="carousel-${product.id}" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">
              ${product.images
                .map(
                  (img, index) => `
                <div class="carousel-item ${index === 0 ? "active" : ""}">
                  <img src="${img}" class="d-block w-100" alt="${product.name}">
                </div>
              `
                )
                .join("")}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${
              product.id
            }" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carousel-${
              product.id
            }" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            </button>
          </div>
          <div class="card-body">
            <h5 class="card-title">${product.name}</h5>
            <p class="card-text">${product.short_description}</p>
            <p class="text-muted"><b>Categories</b>: ${product.categories.join(", ")}</p>
            <p class="text-muted">$${product.price}</p>
          </div>
        </div>
      `;
  
      // Attach a click event listener to the card body (excluding carousel buttons)
      const cardBody = productCard.querySelector('.card-body');
      cardBody.addEventListener("click", () => {
        window.location.href = `/product?id=${product.id}`;
      });
  
      // Ensure the carousel controls don't trigger the navigation
      const carousel = productCard.querySelector(`#carousel-${product.id}`);
      carousel.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent the click event from reaching the card body
      });
  
      productList.appendChild(productCard);
    });
  };
  

  const updateProductList = async () => {
    const searchTerm = searchInput.value.trim();
    const resultObject = await fetchProducts(
      searchTerm,
      selectedCategories,
      currentPage,
      minPrice,
      maxPrice,
      sortOption
    );
    renderProducts(resultObject.result);
    resultCountDisplay.textContent = `Found ${resultObject.count} results`;

    if (resultObject.result.length > 0) {
      renderPagination(resultObject.result.length >= pageSize);
    } else {
      currentPageDisplay.textContent = "";
      paginationContainer.innerHTML = "";
    }
  };

  const renderPagination = (hasNextPage) => {
    paginationContainer.innerHTML = "";

    const prevButton = document.createElement("button");
    prevButton.classList.add("btn", "btn-secondary", "me-2");
    prevButton.textContent = "Previous";
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateProductList();
      }
    });

    const nextButton = document.createElement("button");
    nextButton.classList.add("btn", "btn-secondary");
    nextButton.textContent = "Next";
    nextButton.disabled = !hasNextPage;
    nextButton.addEventListener("click", () => {
      if (hasNextPage) {
        currentPage++;
        updateProductList();
      }
    });

    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(nextButton);

    currentPageDisplay.textContent = `Page ${currentPage}`;
  };

  categoryFilterInput.addEventListener("click", () => {
    categoryOptions.style.display =
      categoryOptions.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (
      !categoryFilterInput.contains(e.target) &&
      !categoryOptions.contains(e.target)
    ) {
      categoryOptions.style.display = "none";
    }
  });

  const updateSelectedCategories = () => {
    categoryFilterInput.value =
      selectedCategories.length > 0 ? selectedCategories.join(", ") : "";
  };

  searchBtn.addEventListener("click", () => {
    currentPage = 1;
    updateProductList();
  });

  sortPriceSelect.addEventListener("change", (e) => {
    sortOption = e.target.value.split(" ");
    currentPage = 1;
    updateProductList();
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

    minPrice = minPriceValue !== "" ? parseFloat(minPriceValue) : null;
    maxPrice = maxPriceValue !== "" ? parseFloat(maxPriceValue) : null;

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      alert("Minimum price cannot be greater than maximum price.");
      return;
    }

    currentPage = 1;
    updateProductList();
  });

  updateProductList();
  createNavigation(userStatus);
  await initializeCategories();
  await attachLogoutHandler();
});
