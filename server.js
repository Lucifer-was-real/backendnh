// The final server.js using the Vertex AI API

const express = require('express');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();
const port = process.env.PORT || 3000;

// --- Initialize Vertex AI ---
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID, // Your Google Cloud Project ID
  location: 'asia-southeast1', // A common location
});

const model = 'gemini-1.5-flash-001'; // The model name

const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
});

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// --- The AI Parsing Function ---
async function parseWithAI(text) {
    const prompt = `
        You are a highly intelligent data extraction engine...
        // The detailed prompt from before remains exactly the same
    `;

    const req = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    try {
        const result = await generativeModel.generateContent(req);
        const response = result.response;
        const jsonText = response.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error with AI parsing:", error);
        return [{ siteId: "Error", latitude: "Could not parse file", longitude: "", angle: "", distance: "", building: "" }];
    }
}

// The upload endpoint remains the same
app.post('/upload', upload.single('dataFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const fileContent = req.file.buffer.toString('utf8');
    const jsonData = await parseWithAI(fileContent);
    res.json(jsonData);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



