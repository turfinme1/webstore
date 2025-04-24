class webpushWrapper {
  constructor() {
    this.webpush = require('web-push');
  }

  setVapidDetails(subject, publicKey, privateKey) {
    this.webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  sendNotification(subscription, payload, options) {
    return this.webpush.sendNotification(subscription, payload, options);
  }
}

module.exports = new webpushWrapper();