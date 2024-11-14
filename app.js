const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx'); // For parsing Excel files
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Gemini API client

const app = express();
const genAI = new GoogleGenerativeAI('AIzaSyASBgeQsfFEMjFomIUbO_5oiGdyB5yz2yE'); // Replace with your API key

// Set up storage for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Function to convert Excel to JSON format
function parseExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
}

// Send question and data to Gemini API
async function queryGemini(data, question) {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent([question, JSON.stringify(data)]);
    const response = await result.response;
    return response.text();
}

// Handle upload requests
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const question = req.body.question;
        const excelData = parseExcel(req.file.path);
        const answer = await queryGemini(excelData, question);
        res.json({ answer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process request' });
    } finally {
        fs.unlinkSync(req.file.path); // Remove uploaded file after processing
    }
});

// Serve the HTML file
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'page2.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
