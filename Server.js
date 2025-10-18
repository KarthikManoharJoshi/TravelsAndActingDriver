const nodemailer = require("nodemailer");
const twilio = require("twilio");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const path = require("path");
const cors = require("cors");
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const DRIVER_PDF = path.join(__dirname, "driver_requests.pdf");
const VEHICLE_PDF = path.join(__dirname, "vehicle_requests.pdf");


// Helper function to append data to a PDF
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
  const fontSize = 12;
  let y = height - 30;

  page.drawText(`Name: ${data.name}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Phone: ${data.phone}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Email: ${data.email || "N/A"}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Purpose: ${data.purpose}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`From: ${data.from}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`To: ${data.to}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Number of Days: ${data.days}`, { x: 30, y, size: fontSize, font });
  y -= 20;
  page.drawText(`Message: ${data.message || "N/A"}`, { x: 30, y, size: fontSize, font });
  y -= 20;

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

app.post("/submit", async (req, res) => {
  try {
    const data = req.body;

    if (data.serviceType === "Acting Driver") {
      await appendToPDF(DRIVER_PDF, data);
    } else if (data.serviceType === "Vehicle Rental") {
      await appendToPDF(VEHICLE_PDF, data);
    } else {
      return res.status(400).send({ message: "Invalid service type" });
    }
    // Send emails
    const mailOptions = {
    from: "your_email@gmail.com",
    to: admins.emails.join(","),
    subject: `New ${data.serviceType} Request`,
    text: `
    A new ${data.serviceType} request has been submitted:

    Name: ${data.name}
    Phone: ${data.phone}
    Email: ${data.email || "N/A"}
    From: ${data.from}
    To: ${data.to}
    Days: ${data.days}
    Purpose: ${data.purpose}
    Message: ${data.message || "N/A"}`
    };

    await transporter.sendMail(mailOptions);

    // Send SMS to admins
    for (const phone of admins.phones) {
        await client.messages.create({
        body: `New ${data.serviceType} Request: ${data.name} (${data.phone}) - ${data.from} → ${data.to}`,
        from: "+14345426782", // your Twilio number
        to: phone
    });
    }

    res.send({ message: "Request saved and notifications sent successfully!" });

    //res.send({ message: "Request saved successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error saving request" });
  }
});

// 📨 Email Configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use Outlook or SMTP instead
  auth: {
    user: "KarthikManoharJoshi.1604064@srec.ac.in",
    pass: gmailPassword // Not your normal password; use an app password
  }
});

// 📱 Twilio SMS Configuration
const accountSid = twilioAccountSid;
const authToken = twilioAuthToken;
const client = twilio(accountSid, authToken);

// Admin contact list
const admins = {
  //emails: ["admin1@gmail.com", "admin2@gmail.com"],
  //phones: ["+91XXXXXXXXXX", "+91XXXXXXXXXX"]
  emails: ["karthikManoharJoshi.1604064@srec.ac.in"],
  phones: ["+917598121302"]
};


//const PORT = 3000;
//app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
//app.listen(3000, '0.0.0.0', () => {
//  console.log('Server running on port 3000');
//});
//const PORT = 3000;
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});



//app.listen(PORT, () => {
//  console.log(`Server running on port ${PORT}`);
//});