// The final, universal server.js powered by an expert AI prompt

const express = require('express');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config(); // Loads the API key from the .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// --- Initialize the AI ---
// Make sure you have your GEMINI_API_KEY in your Render environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// --- The AI Parsing Function with a More Powerful Prompt ---
async function parseWithAI(text) {
    const prompt = `
        You are a highly intelligent data extraction engine. Your task is to analyze unstructured text from any source (like chat logs, notes, etc.) and extract specific data points.
        The output MUST be a valid JSON array of objects. Each object represents a single data entry and must have these exact keys: "siteId", "latitude", "longitude", "angle", "distance", "building".

        Follow these rules precisely:

        1.  **Site ID Logic:**
            - A 'Site ID' is the primary identifier. It can appear in several formats: a 4-digit number (e.g., "0937"), an alphanumeric code (e.g., "A123"), or a long-form ID (e.g., "I-KO-KLKT-ENB-0132").
            - The data that follows a Site ID belongs to it until a new Site ID is found.
            - **Crucially:** The text might provide a list of long-form IDs first. Later, a short 4-digit number is used to refer to one of them. You must correctly associate the data with the full long-form ID. For example, if "I-KO-KLKT-ENB-0132" is listed and later "0132" appears, all following data belongs to "I-KO-KLKT-ENB-0132".
            - If a short ID appears that was not in the initial list, use the short ID itself as the "siteId".

        2.  **Data Point Extraction:**
            - "latitude" and "longitude" are pairs of decimal numbers (e.g., 22.601152 88.431620).
            - "angle" is a number representing degrees, usually followed by "deg" or "DEG", but sometimes the unit is missing.
            - "distance" is a number followed by "m".
            - "building" is a code like "B1", "b2", etc. If not present for a data line, the value MUST be the string "N/A".
            - The data points for a single entry can be on the same line, in any order.

        3.  **Noise Reduction:**
            - Ignore all irrelevant text, such as timestamps (e.g., "[02:44, 16/10/2025] Titli❤️:"), notes ("NEI DATA"), or system messages ("<Media omitted>").

        4.  **Output Format:**
            - Your entire response MUST be ONLY the JSON array. Do not include any introductory text, explanations, or markdown formatting like \`\`\`json.

        Here is the text to analyze:
        ---
        ${text}
        ---
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Clean up the AI's response to ensure it's valid JSON
        const jsonText = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText); // Convert the text to actual JSON
    } catch (error) {
        console.error("Error with AI parsing:", error);
        // If the AI fails or returns invalid JSON, send back an error message in the correct format
        return [{ siteId: "Error", latitude: "Could not parse file", longitude: "", angle: "", distance: "", building: "" }];
    }
}

// The upload endpoint remains the same
app.post('/upload', upload.single('dataFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const fileContent = req.file.buffer.toString('utf8');
    
    // Call our new AI function
    const jsonData = await parseWithAI(fileContent);
    
    res.json(jsonData);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
