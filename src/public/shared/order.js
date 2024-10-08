// order.js
document.addEventListener('DOMContentLoaded', () => {
    const orderForm = document.getElementById('order-form');
    
    orderForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const formData = new FormData(orderForm);
      const orderDetails = {
        address: formData.get('address'),
        paymentMethod: formData.get('payment-method'),
      };
  
      try {
        const response = await fetch('/api/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderDetails),
        });
  
        if (response.ok) {
          alert('Order placed successfully!');
          window.location.href = '/order-summary'; // Redirect to order summary or confirmation page
        } else {
          throw new Error('Failed to place order');
        }
      } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order, please try again.');
      }
    });
  });
  