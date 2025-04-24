class webpushWrapper {
  constructor() {
    this.webpush = require('web-push');
    this.dryRun = process.env.WEB_PUSH_DRY_RUN === 'true';
  }

  setVapidDetails(subject, publicKey, privateKey) {
    this.webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  sendNotification(subscription, payload, options) {
    if (this.dryRun) {
      console.log('webpushWrapper sendNotification:', subscription, payload, options);
      return;
    }
    return this.webpush.sendNotification(subscription, payload, options);
  }
}

module.exports = new webpushWrapper();