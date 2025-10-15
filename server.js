// The final, intelligent server.js

const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// The new, intelligent parsing function
function parseDataContent(data) {
    const lines = data.split('\n');
    const parsedData = [];
    const siteIdMap = new Map();
    let currentFullSiteId = null;

    // --- PASS 1: Find all long-form IDs and map them ---
    for (const line of lines) {
        const longIdMatch = line.trim().match(/^(I-KO-KLKT-ENB-(\w+))$/);
        if (longIdMatch) {
            const fullId = longIdMatch[1]; // e.g., "I-KO-KLKT-ENB-0132"
            const shortId = longIdMatch[2]; // e.g., "0132"
            siteIdMap.set(shortId, fullId);
        }
    }

    // --- PASS 2: Parse the data using the map ---
    for (const line of lines) {
        // Check if the line is a short ID marker
        const shortIdMatch = line.trim().match(/^([A-Z]?\d{3,4})$/);
        if (shortIdMatch && siteIdMap.has(shortIdMatch[1])) {
            // Look up the full ID from our map
            currentFullSiteId = siteIdMap.get(shortIdMatch[1]);
            continue; // Move to the next line, which contains the data
        }

        // If we don't have a valid site ID yet, skip
        if (!currentFullSiteId) continue;

        // Use the flexible regex to find data parts
        const latLongMatch = line.match(/(\d{2}\.\d+)\s*°?\s*(\d{2,3}\.\d+)/);
        const angleMatch = line.match(/(\d+)\s*d(e|E)?g/i);
        const distanceMatch = line.match(/(\d+)\s*m/i);
        const buildingMatch = line.match(/(B\d)/i);

        if (latLongMatch && angleMatch && distanceMatch) {
            parsedData.push({
                siteId: currentFullSiteId, // Use the correct full ID
                lat: latLongMatch[1],
                long: latLongMatch[2].replace(/^0+/, ''),
                angle: angleMatch[1],
                distance: distanceMatch[1],
                building: buildingMatch ? buildingMatch[1].toUpperCase() : 'N/A',
            });
        }
    }
    return parsedData;
}

// The upload endpoint remains the same
app.post('/upload', upload.single('dataFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const jsonData = parseDataContent(fileContent);

    res.json(jsonData);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
