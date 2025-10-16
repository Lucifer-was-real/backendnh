// A robust, non-AI server for parsing any text file

const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// The intelligent, rule-based parsing function
function parseDataContent(data) {
    const lines = data.split('\n');
    const parsedData = [];
    const siteIdMap = new Map();
    let currentFullSiteId = null;

    // --- PASS 1: Find all long-form IDs and create a map ---
    // This allows us to associate short IDs (like 0132) with their full names.
    for (const line of lines) {
        const longIdMatch = line.trim().match(/^(I-KO-KLKT-ENB-([\w\d]+))$/);
        if (longIdMatch) {
            const fullId = longIdMatch[1];
            const shortId = longIdMatch[2];
            siteIdMap.set(shortId, fullId);
        }
    }

    // --- PASS 2: Go through the file again to extract data for each ID ---
    for (let line of lines) {
        // First, clean up the line by removing any timestamps or chat prefixes
        line = line.replace(/.*- Titli❤️:\s*/, '').trim();
        if (!line || line.startsWith('<Media omitted>')) continue;

        // Find a short Site ID (e.g., "0132" or "A123") at the start of a line
        const shortIdMatch = line.match(/^\b([A-Z]?\d{3,4})\b/);
        if (shortIdMatch) {
            const shortId = shortIdMatch[1];
            // If this short ID was in our map, use the full version
            if (siteIdMap.has(shortId)) {
                currentFullSiteId = siteIdMap.get(shortId);
            } else {
                // Otherwise, just use the short ID itself
                currentFullSiteId = shortId;
            }
            continue; // Go to the next line, which should contain the data
        }

        if (!currentFullSiteId) continue; // Skip until we have a Site ID

        // Use flexible patterns to find the data points, regardless of order
        const latLongMatch = line.match(/(\d{2}\.\d+)\s*°?\s*(\d{2,3}\.\d+)/);
        const angleDistanceMatch = line.match(/\b(\d{1,3})\b(?:[\s,]*deg)?(?:[\s,]+)(\d+)\s*m/i);
        const buildingMatch = line.match(/(B\d)/i);
        
        if (latLongMatch && angleDistanceMatch) {
            parsedData.push({
                siteId: currentFullSiteId,
                lat: latLongMatch[1],
                long: latLongMatch[2].replace(/^0+/, ''),
                angle: angleDistanceMatch[1],
                distance: angleDistanceMatch[2],
                building: buildingMatch ? buildingMatch[1].toUpperCase() : 'N/A',
            });
        }
    }
    return parsedData;
}


// The upload endpoint
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
