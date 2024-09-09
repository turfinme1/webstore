document.addEventListener("DOMContentLoaded", () => {
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

  let selectedCategories = [];
  let currentPage = 1;
  const pageSize = 6;
  let sortOption = ""; // Sort option for price (asc or desc)
  let minPrice = null;
  let maxPrice = null;

  const fetchProducts = async (searchTerm = "", categories = [], page = 1, minPrice = null, maxPrice = null, sortOption = "") => {
    let searchParams = { keyword: searchTerm };
    
    if (categories.length > 0) {
      searchParams.categories = categories;
    }
    if (minPrice || maxPrice) {
      searchParams.price = { min: minPrice, max: maxPrice };
    }
  
    const queryParams = new URLSearchParams();
    queryParams.append('searchParams', JSON.stringify(searchParams));
    
    if (sortOption) {
      queryParams.append('orderParams', JSON.stringify([["price", sortOption]]));
    }
    
    queryParams.append('pageSize', pageSize + 1);
    queryParams.append('page', page);
  
    const response = await fetch(`http://localhost:3000/api/products?${queryParams.toString()}`);
    return await response.json();
  };

  const renderProducts = (products) => {
    productList.innerHTML = "";
    products.slice(0, pageSize).forEach((product) => {
      const productCard = document.createElement("div");
      productCard.classList.add("col-md-4", "product-card");
      productCard.innerHTML = `
        <div class="card h-100">
            <div id="carousel-${
              product.id
            }" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${product.images
                      .map(
                        (img, index) => `
                        <div class="carousel-item ${
                          index === 0 ? "active" : ""
                        }">
                            <img src="${img}" class="d-block w-100" alt="${
                          product.name
                        }">
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
                <p class="text-muted">$${product.price}</p>
            </div>
        </div>
    `;
      productList.appendChild(productCard);
    });
  };

  const updateProductList = async () => {
    const searchTerm = searchInput.value.toLowerCase();
    const products = await fetchProducts(
      searchTerm,
      selectedCategories,
      currentPage,
      minPrice,
      maxPrice,
      sortOption
    );
    renderProducts(products);

    renderPagination(products.length > pageSize);
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

  categoryOptions.addEventListener("change", (e) => {
    const value = e.target.value;

    if (e.target.checked) {
      selectedCategories.push(value);
    } else {
      selectedCategories = selectedCategories.filter((cat) => cat !== value);
    }

    updateSelectedCategories();
    updateProductList();
  });

  const updateSelectedCategories = () => {
    selectedCategoriesDiv.innerHTML = "";

    selectedCategories.forEach((category) => {
      const tag = document.createElement("div");
      tag.classList.add("category-tag");
      tag.innerText = category;

      tag.addEventListener("click", () => {
        selectedCategories = selectedCategories.filter(
          (cat) => cat !== category
        );
        document.querySelector(`input[value="${category}"]`).checked = false;
        updateSelectedCategories();
        updateProductList();
      });

      selectedCategoriesDiv.appendChild(tag);
    });

    categoryFilterInput.value =
      selectedCategories.length > 0 ? selectedCategories.join(", ") : "";
  };

  searchBtn.addEventListener("click", () => {
    currentPage = 1;
    updateProductList();
  });

  applyFiltersBtn.addEventListener("click", () => {
    minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
    sortOption = sortPriceSelect.value;
    currentPage = 1; // Reset to the first page
    updateProductList();
  });

  updateProductList();
});
