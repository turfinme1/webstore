import { createNavigation } from "./navigation.js";
import { getUserStatus } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userStatus = await getUserStatus();
    createNavigation(userStatus);

    const productId = 48000; // Extract product ID from the URL

    if (!productId) {
      console.error("Product ID not found");
      return;
    }

    const productData = await fetchProductData(productId);

    if (!productData) {
      console.error("Product data not found");
      return;
    }

    populateCarousel(productData.images);
    populateProductInfo(productData);
    populateRatingSection(productData);
    await loadComments(productId);

    attachCommentFormHandler(productId);
    attachRatingHandlers(productId);
  } catch (error) {
    console.error("Error initializing product page:", error);
  }
});

// Get product ID from URL
function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Populate product carousel with images
function populateCarousel(images) {
  const carouselInner = document.getElementById("carousel-inner");
  images.forEach((image, index) => {
    const carouselItem = document.createElement("div");
    carouselItem.className = `carousel-item ${index === 0 ? "active" : ""}`;

    const imgElement = document.createElement("img");
    imgElement.src = image;
    imgElement.className = "d-block w-100";
    imgElement.alt = `Product Image ${index + 1}`;

    carouselItem.appendChild(imgElement);
    carouselInner.appendChild(carouselItem);
  });
}

// Populate product information section
function populateProductInfo(product) {
  const productInfo = document.getElementById("product-info");
  const productInfoHtml = `
    <h2>${product.name}</h2>
    <h4 class="text-muted">$${product.price}</h4>
    <p>${product.long_description}</p>
    <p>Categories: ${product.categories.join(", ")}</p>
  `;
  productInfo.innerHTML = productInfoHtml;
}

// Populate rating section
function populateRatingSection(product) {
  const ratingSection = document.getElementById("rating-section");
  const averageRating = product.average_rating || 0;
  const totalRatings = product.total_ratings || 0;
  const ratingHtml = `
    <h4>Average Rating: ${averageRating.toFixed(
      1
    )} / 5 (${totalRatings} ratings)</h4>
    <div id="user-rating">
      <h5>Rate this product:</h5>
      <div class="star-rating">
        ${generateStarRatingInputs()}
      </div>
    </div>
  `;
  ratingSection.innerHTML = ratingHtml;
}

// Generate star rating inputs dynamically
function generateStarRatingInputs() {
  let stars = "";
  for (let i = 5; i >= 1; i--) {
    stars += `
      <input id="star${i}" name="rating" type="radio" value="${i}">
      <label for="star${i}"><i class="fas fa-star"></i></label>
    `;
  }
  return stars;
}

// Attach event listeners for submitting the rating
function attachRatingHandlers(productId) {
  const ratingInputs = document.querySelectorAll(".star-rating input");
  ratingInputs.forEach((input) => {
    input.addEventListener("change", async (event) => {
      const selectedRating = event.target.value;
      try {
        await submitRating(productId, selectedRating);
        alert("Rating submitted successfully!");
        // Optionally refresh average rating
      } catch (error) {
        console.error("Error submitting rating:", error);
        alert("Failed to submit rating.");
      }
    });
  });
}

// Attach event listener for the comment form submission
function attachCommentFormHandler(productId) {
  const commentForm = document.getElementById("comment-form");
  if (commentForm) {
    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const commentText = document.getElementById("comment-text").value;
      try {
        await submitComment(productId, commentText);
        alert("Comment submitted successfully!");
        await loadComments(productId); // Refresh comments
      } catch (error) {
        console.error("Error submitting comment:", error);
        alert("Failed to submit comment.");
      }
    });
  }
}

// Fetch product data
export async function fetchProductData(productId) {
  try {
    const response = await fetch(`/crud/products/${productId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product data");
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Submit product rating
export async function submitRating(productId, rating) {
  try {
    const response = await fetch("/api/products/rating", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, rating }),
    });
    if (!response.ok) {
      throw new Error("Failed to submit rating");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Load product comments
export async function loadComments(productId) {
  try {
    const response = await fetch(`/crud/products/${productId}/comments`);
    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }
    const comments = await response.json();
    displayComments(comments);
  } catch (error) {
    console.error(error);
  }
}

// Display comments on the page
function displayComments(comments) {
  const commentsSection = document.getElementById("comments-section");
  let commentsHtml = "<h4>Comments:</h4>";
  comments.forEach((comment) => {
    commentsHtml += `
        <div class="media mb-3">
          <div class="media-body">
            <h5 class="mt-0">${
              comment.user_name
            } <small class="text-muted">${formatDate(
      comment.created_at
    )}</small></h5>
            ${comment.comment}
          </div>
        </div>
      `;
  });

  commentsHtml += `
      <h5>Add a comment:</h5>
      <form id="comment-form">
        <div class="form-group">
          <textarea class="form-control" id="comment-text" rows="3" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    `;

  commentsSection.innerHTML = commentsHtml;
}

// Submit a new comment
export async function submitComment(productId, comment) {
  try {
    const response = await fetch("/api/products/comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, comment }),
    });
    if (!response.ok) {
      throw new Error("Failed to submit comment");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Helper to format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
