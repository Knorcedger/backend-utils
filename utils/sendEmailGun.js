import formData from 'form-data';
import Mailgun from 'mailgun.js';
import signale from 'signale';

const mailgun = new Mailgun(formData);

let allEmails;
let mg;
let ourEmail;
let emailSignature;
let emailsEnabled;

const setupEmails = (
  emails,
  mailgunApiKey,
  fromEmail,
  signature,
  enableEmails = false
) => {
  allEmails = emails;
  // mailgun = mailgunjs({
  //   apiKey: mailgunApiKey,
  //   domain: mailgunDomain,
  //   host: mailgunHost,
  // });
  mg = mailgun.client({
    username: 'api',
    key: mailgunApiKey,
    url: 'https://api.eu.mailgun.net',
  });

  ourEmail = fromEmail;
  emailSignature = signature;
  emailsEnabled = enableEmails;
};

const sendEmailGun = async (email, emailType, extra = {}) => {
  if (emailsEnabled) {
    signale.info('Sending email', emailType);

    const emailTemplate = allEmails[emailType];

    // replace variables
    // eslint-disable-next-line no-param-reassign
    extra.email = email;
    let replacedMessage = emailTemplate.message;
    Object.keys(extra).forEach((key) => {
      replacedMessage = replacedMessage.replaceAll(`{{${key}}}`, extra[key]);
    });

    let replacedSubject = emailTemplate.subject;
    Object.keys(extra).forEach((key) => {
      replacedSubject = replacedSubject.replaceAll(`{{${key}}}`, extra[key]);
    });

    const data = {
      from: ourEmail,
      to: email,
      subject: replacedSubject,
      html: replacedMessage + emailSignature,
    };

    try {
      const response = await mg.messages.create('sandbox-123.mailgun.org', {
        from: 'Excited User <mailgun@sandbox-123.mailgun.org>',
        to: ['knorcedger@gmail.com'],
        subject: 'Hello',
        text: 'Testing some Mailgun awesomness!',
        html: '<h1>Testing some Mailgun awesomness!</h1>',
      });
      // const response = await mailgun.messages().send(data);
      signale.info(response);
    } catch (error) {
      signale.error('Problem: email sent failed', data);
    }
  }
};

// this is used by the FE to send emails through the contact form
// const emailRoute = (app) => {
//   app.post('/email', async (req, res) => {
//     signale.info('Send email from route');

//     let subject = getNconfInstance().get('CONTACT_FORM_EMAIL_SUBJECT');
//     Object.keys(req.body).forEach((key) => {
//       subject = subject.replaceAll(`{{${key}}}`, req.body[key]);
//     });

//     const data = {
//       from: req.body.email,
//       to: getNconfInstance().get('OUR_EMAIL'),
//       subject,
//       text: req.body.message,
//     };

//     try {
//       await mailgun.messages().send(data);
//       res.send({ status: 'done' });
//     } catch (error) {
//       res.send({ status: 'error' });
//       signale.error('Problem: contact form email not send');
//     }
//   });
// };

export { sendEmailGun, setupEmails };
