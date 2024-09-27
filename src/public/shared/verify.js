document.addEventListener("DOMContentLoaded", () => {
  const resendBtn = document.getElementById("resend-btn");
  const resendConfirmation = document.getElementById("resend-confirmation");

  resendBtn.addEventListener("click", async () => {
    resendBtn.disabled = true;
    try {
      // Call backend API to resend the verification email
      const response = await fetch("/api/resend-verification-email", {
        method: "POST",
      }); 

      if (response.ok) {
        resendConfirmation.style.display = "block";
      } else {
        alert("Failed to resend email. Please try again later.");
      }
    } catch (error) {
      console.error(error);
      alert("Error while resending the email.");
    } finally {
      resendBtn.disabled = false;
    }
  });
});