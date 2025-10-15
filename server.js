// This is the correct code for your server.js file

const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 3000; // Render will manage the port, but this is good for local testing

// Setup Middleware
app.use(cors()); // Allows your Netlify frontend to communicate with this server
const upload = multer({ storage: multer.memoryStorage() }); // Tells multer to handle file uploads in memory

// This is the parsing logic, moved from your frontend to the backend
function parseDataContent(data) {
    const lines = data.split('\n');
    const parsedData = [];
    let currentSiteId = null;

    for (const line of lines) {
        if (line.trim().length === 0) continue;

        const siteIdMatch = line.trim().match(/^[A-Z]?\d{4}$/);
        if (siteIdMatch) {
            currentSiteId = siteIdMatch[0];
            continue;
        }

        if (!currentSiteId) continue;

        const latLongMatch = line.match(/(\d{2}\.\d+)\s*°?\s*(\d{2,3}\.\d+)/);
        const angleMatch = line.match(/(\d+)\s*deg/i);
        const distanceMatch = line.match(/(\d+)\s*m/i);
        const buildingMatch = line.match(/(B\d)/i);

        if (latLongMatch && angleMatch && distanceMatch) {
            parsedData.push({
                siteId: currentSiteId,
                lat: latLongMatch[1],
                long: latLongMatch[2].replace(/^0+/, ''), // Removes leading zeros from longitude
                angle: angleMatch[1],
                distance: distanceMatch[1],
                building: buildingMatch ? buildingMatch[1].toUpperCase() : 'N/A',
            });
        }
    }
    return parsedData;
}

// The main upload endpoint
app.post('/upload', upload.single('dataFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const jsonData = parseDataContent(fileContent);

    // Send the structured data back to the frontend
    res.json(jsonData);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});