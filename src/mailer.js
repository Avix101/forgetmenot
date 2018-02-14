const helper = require('sendgrid').mail;
const from_email = new helper.Email('reminder@forget-me-not-sob3966.herokuapp.com');
const sendgrid = require('sendgrid')(process.env.SENDGRID_API_KEY || undefined);

const sendEmail = (address, subject, content) => {
	if(!process.env.SENDGRID_API_KEY){
		console.log("API Key invalid. Cannot send email.");
		return;
	}
	
	const to_email = new helper.Email(address);
	const body = new helper.Content('text/plain', content);
	const email = new helper.Mail(from_email, subject, to_email, body);
	
	const request = sendgrid.emptyRequest({method: 'POST', path: '/v3/mail/send', body: email.toJSON()});
	
	sendgrid.API(request, (err, res) => {
		if(err){
			console.log(err);
		}
	});
};

module.exports = {
	sendEmail
};