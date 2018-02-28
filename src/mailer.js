// Import the sendgrid lib
const helper = require('sendgrid').mail;

// Define from address and initialize sendgrid
const fromEmail = new helper.Email('reminder@forget-me-not-sob3966.herokuapp.com');
const sendgrid = require('sendgrid')(process.env.SENDGRID_API_KEY || undefined);

// Sends an email to the specified address, using the given subject and content,
// and then calls a callback
const sendEmail = (address, subject, content, success, failure) => {
  // If the sendgrid API key is missing, abort operation
  if (!process.env.SENDGRID_API_KEY) {
    return;
  }

  // Construct email components
  const toEmail = new helper.Email(address);
  const body = new helper.Content('text/plain', content);
  const email = new helper.Mail(fromEmail, subject, toEmail, body);

  const request = sendgrid.emptyRequest({ method: 'POST', path: '/v3/mail/send', body: email.toJSON() });

  // Send the email, and run the failure callback if there's an error,
  // or the success callback otherwise
  sendgrid.API(request, (err) => {
    if (err) {
      failure();
    } else {
      success();
    }
  });
};

// Export the sendEmail function
module.exports = {
  sendEmail,
};
