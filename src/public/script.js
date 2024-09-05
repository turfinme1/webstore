document.addEventListener('DOMContentLoaded',async () => {
    const productList = document.getElementById('product-list');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    
    const response = await fetch('http://localhost:3000/crud/products')
    const products = await response.json()
    console.log(products)
    const renderProducts = (filteredProducts) => {
      productList.innerHTML = '';
      filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('col-md-4');
        productCard.classList.add('product-card');
        productCard.innerHTML = `
          <div class="card h-100">
            <div id="carousel-${product.id}" class="carousel slide" data-bs-ride="carousel">
              <div class="carousel-inner">
                ${product.images.map((img, index) => `
                  <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${img}" class="d-block w-100" alt="${product.name}">
                  </div>
                `).join('')}
              </div>
              <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="next">
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
  
    // Initial render of all products
    renderProducts(products);
  
    // Filter products by search input
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchTerm));
      renderProducts(filteredProducts);
    });
  
    // Filter products by category
    categoryFilter.addEventListener('change', (e) => {
      const selectedCategory = e.target.value;
      const filteredProducts = selectedCategory
        ? products.filter(product => product.categories.includes(selectedCategory))
        : products;
      renderProducts(filteredProducts);
    });
  });
  