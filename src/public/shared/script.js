import * as Utils from "./page-utility.js";

class ProductState {
  constructor() {
    this.searchTerm = '';
    this.selectedCategories = [];
    this.currentPage = 1;
    this.pageSize = 6;
    this.minPrice = null;
    this.maxPrice = null;
    this.sortOption = [];
    this.filterParams = {};
    this.orderParams = [];
  }

  initFromUrl(urlParams) {
    this.currentPage = parseInt(urlParams.page) || 1;
    this.searchTerm = urlParams.searchParams?.keyword || '';
    this.selectedCategories = urlParams.filterParams?.categories || [];
    this.minPrice = urlParams.filterParams?.price?.min || null;
    this.maxPrice = urlParams.filterParams?.price?.max || null;
    this.sortOption = urlParams.orderParams?.[0] || [];
    this.filterParams = urlParams.filterParams || {};
    this.orderParams = urlParams.orderParams || [];
  }

  updateUrl() {
    const urlParamData = {
      searchParams: this.searchTerm ? { keyword: this.searchTerm } : {},
      filterParams: this.filterParams,
      orderParams: this.orderParams,
      pageSize: this.pageSize,
      page: this.currentPage,
      currentPage: this.currentPage
    };
    Utils.updateUrlParams(urlParamData);
  }

  setSort(sortOption) {
    this.sortOption = sortOption;
    this.orderParams = sortOption.length && sortOption[0] ? [sortOption] : [];
    this.currentPage = 1;
  }

  setPrice(min, max) {
    this.minPrice = min;
    this.maxPrice = max;
    this.filterParams.price = {};
    if (min !== null) this.filterParams.price.min = min;
    if (max !== null) this.filterParams.price.max = max;
    this.currentPage = 1;
  }

  setCategories(categories) {
    this.selectedCategories = categories;
    if (categories.length) {
      this.filterParams.categories = categories;
    } else {
      delete this.filterParams.categories;
    }
    this.currentPage = 1;
  }

  getQueryParams() {
    const queryParams = new URLSearchParams();
    if (this.searchTerm) {
      queryParams.append("searchParams", JSON.stringify({ keyword: this.searchTerm }));
    }
    if (Object.keys(this.filterParams).length > 0) {
      queryParams.append("filterParams", JSON.stringify(this.filterParams));
    }
    if (this.orderParams.length > 0) {
      queryParams.append("orderParams", JSON.stringify(this.orderParams));
    }
    queryParams.append("pageSize", this.pageSize.toString());
    queryParams.append("page", this.currentPage.toString());
    return queryParams;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Get DOM elements
  const elements = {
    productList: document.getElementById("product-list"),
    searchInput: document.getElementById("search-input"),
    searchBtn: document.getElementById("search-btn"),
    categoryFilterInput: document.getElementById("category-filter-input"),
    categoryOptions: document.getElementById("category-options"),
    selectedCategoriesDiv: document.getElementById("selected-categories"),
    paginationContainer: document.getElementById("pagination-container"),
    currentPageDisplay: document.getElementById("current-page-display"),
    minPriceInput: document.getElementById("min-price-input"),
    maxPriceInput: document.getElementById("max-price-input"),
    sortPriceSelect: document.getElementById("sort-price"),
    applyFiltersBtn: document.getElementById("apply-filters"),
    resultCountDisplay: document.getElementById("result-count")
  };

  // Initialize state
  const state = new ProductState();
  state.initFromUrl(Utils.getUrlParams());

  // Sync UI with initial state
  elements.searchInput.value = state.searchTerm;
  elements.minPriceInput.value = state.minPrice || '';
  elements.maxPriceInput.value = state.maxPrice || '';
  if (state.sortOption.length) {
    elements.sortPriceSelect.value = state.sortOption.join(' ');
  }

  const initializeCategories = async () => {
    elements.categoryFilterInput.value = "";
    const categories = await fetchCategories();
    renderCategoryOptions(categories);
  };

  // Function to fetch categories from the server
  const fetchCategories = async () => {
    const response = await Utils.fetchWithErrorHandling("/crud/categories");
    if(!response.ok){
      Utils.showErrorMessage(response.error);
    }
    return await response.data;
  };

  const renderCategoryOptions = (categories) => {
    elements.categoryOptions.innerHTML = "";
    categories.forEach((category) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = category.name;
      checkbox.checked = state.selectedCategories.includes(category.name);
      
      checkbox.addEventListener("change", (e) => {
        const newCategories = e.target.checked
          ? [...state.selectedCategories, e.target.value]
          : state.selectedCategories.filter(cat => cat !== e.target.value);
        
        state.setCategories(newCategories);
        updateSelectedCategories();
        updateProductList();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${category.name}`));
      elements.categoryOptions.appendChild(label);
    });
  };

  const updateSelectedCategories = () => {
    elements.categoryFilterInput.value = state.selectedCategories.join(", ");
  };

  const fetchProducts = async () => {
    const queryParams = state.getQueryParams();
    state.updateUrl();
    const response = await Utils.fetchWithErrorHandling(`/api/products?${queryParams.toString()}`);
    if (!response.ok) {
      Utils.showErrorMessage(response.error);
    }
    return response.data;
  };

  const renderProducts = (products) => {
    elements.productList.innerHTML = "";
    products.slice(0, state.pageSize).forEach((product) => {
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
            <p class="text-muted">Price: $${product.price}</p>
            <p class="text-muted">Price with VAT: $${product.price_with_vat}</p>
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
  
      elements.productList.appendChild(productCard);
    });
  };

  const updateProductList = async () => {
    const resultObject = await fetchProducts();
    renderProducts(resultObject.result);
    elements.resultCountDisplay.textContent = `Found ${resultObject.count} results`;

    if (resultObject.result.length > 0) {
      renderPagination(resultObject.result.length >= state.pageSize);
    } else {
      elements.currentPageDisplay.textContent = "";
      elements.paginationContainer.innerHTML = "";
    }
  };

  const renderPagination = (hasNextPage) => {
    elements.paginationContainer.innerHTML = "";

    const prevButton = document.createElement("button");
    prevButton.classList.add("btn", "btn-secondary", "me-2");
    prevButton.textContent = "Previous";
    prevButton.disabled = state.currentPage === 1;
    prevButton.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        updateProductList();
      }
    });

    const nextButton = document.createElement("button");
    nextButton.classList.add("btn", "btn-secondary");
    nextButton.textContent = "Next";
    nextButton.disabled = !hasNextPage;
    nextButton.addEventListener("click", () => {
      if (hasNextPage) {
        state.currentPage++;
        updateProductList();
      }
    });

    elements.paginationContainer.appendChild(prevButton);
    elements.paginationContainer.appendChild(nextButton);

    elements.currentPageDisplay.textContent = `Page ${state.currentPage}`;
  };

  elements.categoryFilterInput.addEventListener("click", () => {
    elements.categoryOptions.style.display =
      elements.categoryOptions.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (
      !elements.categoryFilterInput.contains(e.target) &&
      !elements.categoryOptions.contains(e.target)
    ) {
      elements.categoryOptions.style.display = "none";
    }
  });

  elements.searchBtn.addEventListener("click", () => {
    state.searchTerm = elements.searchInput.value.trim();
    state.currentPage = 1;
    updateProductList();
  });

  elements.sortPriceSelect.addEventListener("change", (e) => {
    state.setSort(e.target.value.split(" "));
    updateProductList();
  });

  elements.applyFiltersBtn.addEventListener("click", () => {
    const minPriceValue = elements.minPriceInput.value.trim();
    const maxPriceValue = elements.maxPriceInput.value.trim();

    if (minPriceValue && isNaN(minPriceValue)) {
      alert("Minimum price must be a number.");
      return;
    }
    if (maxPriceValue && isNaN(maxPriceValue)) {
      alert("Maximum price must be a number.");
      return;
    }

    const minPrice = minPriceValue !== "" ? parseFloat(minPriceValue) : null;
    const maxPrice = maxPriceValue !== "" ? parseFloat(maxPriceValue) : null;

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      alert("Minimum price cannot be greater than maximum price.");
      return;
    }

    state.setPrice(minPrice, maxPrice);
    updateProductList();
  });

  // Initialize
  await Utils.initializePage();
  const userStatus = await Utils.getUserStatus();
  Utils.createNavigation(userStatus);
  await initializeCategories();
  updateSelectedCategories();
  await updateProductList();
});
