// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// PDF storage (for Render/Vercel)
const DRIVER_PDF = '/tmp/driver_requests.pdf';
const VEHICLE_PDF = '/tmp/vehicle_requests.pdf';

// Admin email(s)
const admins = {
  emails: ['rockforttravels@zohomail.in']
};

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// --------------------
// Helper: Append data to PDF
// --------------------
async function appendToPDF(filePath, data) {
  let pdfDoc;
  if (fs.existsSync(filePath)) {
    const existingPdfBytes = fs.readFileSync(filePath);
    pdfDoc = await PDFDocument.load(existingPdfBytes);
  } else {
    pdfDoc = await PDFDocument.create();
  }

  const page = pdfDoc.addPage();
  const { height } = page.getSize();
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

// --------------------
// Helper: Send emails via Resend
// --------------------
async function sendEmails(formData) {
  try {
    // 1️⃣ Confirmation email to user
    await resend.emails.send({
      from: 'Rockfort Travels <enjoy@rockforttravels.com>',
      to: formData.email,
      subject: `Your ${formData.serviceType} Request Received`,
      html: `
        <h3>Thank you, ${formData.name}!</h3>
        <p>Your <strong>${formData.serviceType}</strong> request has been received successfully.</p>
        <p><b>Details:</b></p>
        <ul>
          <li><b>Phone:</b> ${formData.phone}</li>
          <li><b>Email:</b> ${formData.email}</li>
          <li><b>From:</b> ${formData.from}</li>
          <li><b>To:</b> ${formData.to}</li>
          <li><b>Days:</b> ${formData.days}</li>
          <li><b>Purpose:</b> ${formData.purpose}</li>
          <li><b>Message:</b> ${formData.message || 'N/A'}</li>
        </ul>
        <p>We’ll contact you soon to confirm your booking.</p>
        <p>– Rockfort Travels</p>
      `,
    });

    // 2️⃣ Notification email to admin
    await resend.emails.send({
      from: 'Rockfort Travels <enjoy@rockforttravels.com>',
      to: admins.emails,
      subject: `New ${formData.serviceType} Request Received`,
      html: `
        <h3>New ${formData.serviceType} Request</h3>
        <ul>
          <li><b>Name:</b> ${formData.name}</li>
          <li><b>Phone:</b> ${formData.phone}</li>
          <li><b>Email:</b> ${formData.email || 'N/A'}</li>
          <li><b>From:</b> ${formData.from}</li>
          <li><b>To:</b> ${formData.to}</li>
          <li><b>Days:</b> ${formData.days}</li>
          <li><b>Purpose:</b> ${formData.purpose}</li>
          <li><b>Message:</b> ${formData.message || 'N/A'}</li>
        </ul>
      `,
    });

    console.log('✅ Emails sent successfully (user + admin)');
  } catch (error) {
    console.error('❌ Error sending emails:', error);
  }
}

// --------------------
// POST /submit route
// --------------------
app.post('/submit', async (req, res) => {
  try {
    const data = req.body;

    // Save to appropriate PDF
    if (data.serviceType === 'Acting Driver') {
      await appendToPDF(DRIVER_PDF, data);
    } else if (data.serviceType === 'Vehicle Rental') {
      await appendToPDF(VEHICLE_PDF, data);
    } else {
      return res.status(400).send({ message: 'Invalid service type' });
    }

    // Send emails
    await sendEmails(data);

    res.send({ message: 'Request saved and emails sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error saving request', error: error.message });
  }
});

// --------------------
// Serve Frontend
// --------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});