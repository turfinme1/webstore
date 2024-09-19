import { createNavigation } from "./navigation.js";
import { getUserStatus } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    createNavigation(await getUserStatus());
    const productId = getProductIdFromURL();

    if (!productId) {
      console.error("Product ID not found");
      return;
    }
    const productData = await fetchProductData(productId);

    if (!productData) {
      console.error("Product data not found");
      return;
    }

    populateProductData(productData);
    await renderRatingSection(productData);
    await renderCommentSection(productId);

    const commentForm = document.getElementById("comment-form");
    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const commentText = document.getElementById("comment-text").value;
      try {
        await submitComment(productId, commentText);
        // alert("Comment submitted successfully!");
        await renderCommentSection(productId); // Refresh comments
      } catch (error) {
        console.error("Error submitting comment:", error);
        alert("Failed to submit comment.");
      }
    });
  } catch (error) {
    console.error("Error initializing product page:", error);
  }
});

function populateProductData(product) {
  const carouselInner = document.getElementById("carousel-inner");
  const productInfo = document.getElementById("product-info");

  carouselInner.innerHTML = "";
  product.images.forEach((image, index) => {
    const carouselItem = document.createElement("div");
    carouselItem.className = `carousel-item ${index === 0 ? "active" : ""}`;

    const imgElement = document.createElement("img");
    imgElement.src = image;
    imgElement.className = "d-block w-100";
    imgElement.alt = `Product Image ${index + 1}`;

    carouselItem.appendChild(imgElement);
    carouselInner.appendChild(carouselItem);
  });

  const productInfoHtml = `
  <h2>${product.name}</h2>
  <h4 class="text-muted">$${product.price}</h4>
  <p>${product.long_description}</p>
  <p>Categories: ${product.categories.join(", ")}</p>
`;
  productInfo.innerHTML = productInfoHtml;
}

async function renderRatingSection(product) {
  const ratingSection = document.getElementById("rating-section");
  let averageRating = 0;
  let totalRatings = 0;
  const ratingResponse = await fetch(`/api/products/${product.id}/ratings`);
  const ratingData = await ratingResponse.json();
  console.log(ratingData);

  if (ratingData.length > 0) {
    averageRating = parseFloat(ratingData[0].average_rating).toFixed(2);
    totalRatings = ratingData[0].rating_count;
  }
  const ratingHtml = `
      <h4>Average Rating: ${averageRating} / 5 (${totalRatings} ratings)</h4>
      <div id="user-rating">
        <h5>Rate this product:</h5>
          <div class="star-rating">
          <input id="star5" name="rating" type="radio" value="5">
          <label for="star5"><i class="fas fa-star"></i></label>
           <input id="star4" name="rating" type="radio" value="4">
          <label for="star4"><i class="fas fa-star"></i></label>
          <input id="star3" name="rating" type="radio" value="3">
          <label for="star3"><i class="fas fa-star"></i></label>
          <input id="star2" name="rating" type="radio" value="2">
          <label for="star2"><i class="fas fa-star"></i></label>
           <input id="star1" name="rating" type="radio" value="1">
          <label for="star1"><i class="fas fa-star"></i></label>
        </div>
      </div>
    `;
  ratingSection.innerHTML = ratingHtml;

  const ratingInputs = document.querySelectorAll(".star-rating input");
  ratingInputs.forEach((input) => {
    input.addEventListener("change", async (event) => {
      const selectedRating = event.target.value;
      console.log("Selected rating:", selectedRating);
      try {
        await submitRating(product.id, selectedRating);
        await renderRatingSection(product);
      } catch (error) {
        console.error("Error submitting rating:", error);
        alert("Failed to submit rating.");
      }
    });
  });
}

async function renderCommentSection(productId) {
  const commentsSection = document.getElementById("comments-section");
  commentsSection.innerHTML = "";
  // Clear any previous form
  commentsSection.innerHTML = `
    <h5>Add a comment:</h5>
    <form id="comment-form">
      <div class="form-group">
        <textarea class="form-control" id="comment-text" rows="3" required></textarea>
      </div>
      <button type="submit" class="btn btn-primary">Submit</button>
    </form>
  `;

  const comments = await fetchProductComments(productId);

  if (comments.length === 0) {
    const noCommentsMessage = "<p>No comments available for this product.</p>";
    commentsSection.innerHTML += noCommentsMessage;
    return;
  }

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
          <p>${comment.comment}</p>
        </div>
      </div>
    `;
  });
  // Append the comments below the form
  commentsSection.innerHTML += commentsHtml;
}

async function fetchProductData(productId) {
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

async function submitRating(productId, rating) {
  try {
    const response = await fetch(`/api/products/${productId}/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating }),
    });
    if (!response.ok) {
      throw new Error("Failed to submit rating");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function submitComment(productId, comment) {
  const response = await fetch(`/api/products/${productId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  const result = await response.json();
  console.log(result);
  if (!response.ok) {
    throw new Error("Failed to submit comment");
  }
}

async function fetchProductComments(productId) {
  const response = await fetch(`/api/products/${productId}/comments`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return await response.json();
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}
