// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// PDFs stored in /tmp for cloud deployment
const DRIVER_PDF = '/tmp/driver_requests.pdf';
const VEHICLE_PDF = '/tmp/vehicle_requests.pdf';

// Admin contact info
const admins = {
  emails: ['karthikManoharJoshi.1604064@srec.ac.in'],
  phones: ['+917598121302']
};

// Nodemailer transporter using SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: process.env.SENDGRID_USERNAME, // your SendGrid username
    pass: process.env.SENDGRID_PASSWORD  // your SendGrid password
  }
});

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to append data to PDF
async function appendToPDF(filePath, data) {
  let pdfDoc;
  if (fs.existsSync(filePath)) {
    const existingPdfBytes = fs.readFileSync(filePath);
    pdfDoc = await PDFDocument.load(existingPdfBytes);
  } else {
    pdfDoc = await PDFDocument.create();
  }

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = height - 30;

  const fields = [
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email || 'N/A'}`,
    `Purpose: ${data.purpose}`,
    `From: ${data.from}`,
    `To: ${data.to}`,
    `Days: ${data.days}`,
    `Message: ${data.message || 'N/A'}`
  ];

  fields.forEach(field => {
    page.drawText(field, { x: 30, y, size: 12, font });
    y -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

// POST /submit route
app.post('/submit', async (req, res) => {
  try {
    const data = req.body;

    // Append to correct PDF
    if (data.serviceType === 'Acting Driver') {
      await appendToPDF(DRIVER_PDF, data);
    } else if (data.serviceType === 'Vehicle Rental') {
      await appendToPDF(VEHICLE_PDF, data);
    } else {
      return res.status(400).send({ message: 'Invalid service type' });
    }

    // Send Email
    await transporter.sendMail({
      from: 'noreply@yourdomain.com', // can be any verified sender in SendGrid
      to: admins.emails.join(','),
      subject: `New ${data.serviceType} Request`,
      text: `
New ${data.serviceType} request:

Name: ${data.name}
Phone: ${data.phone}
Email: ${data.email || 'N/A'}
From: ${data.from}
To: ${data.to}
Days: ${data.days}
Purpose: ${data.purpose}
Message: ${data.message || 'N/A'}
      `
    });

    // Send SMS to admins
    for (const phone of admins.phones) {
      await client.messages.create({
        body: `New ${data.serviceType} request: ${data.name} (${data.phone})`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    }

    res.send({ message: 'Request saved and notifications sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error saving request', error: error.message });
  }
});

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic PORT for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
