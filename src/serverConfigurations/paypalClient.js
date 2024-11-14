const paypal = require("@paypal/checkout-server-sdk");

const paypalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(
        "Aa3N2FW_E6sIybxEbJ5ioVPY8Z9x8do7NEy1CjJ6TW08FR4dSVi7fj7wsP-V5D23wTu5yVh1P4L3-Nzr",
        "EAe1aPRgNqf7dFVM3440ZeUghaF2SIfEafX3NB-6jS-cw0QVp9hmML14_iJNKUWrspXsiXMtzc4FqQD1"
    )
);

module.exports = paypalClient;