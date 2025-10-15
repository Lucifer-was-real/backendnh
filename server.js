// The new, more robust server.js

const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
// Render will set the port, so we make it flexible
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// The new, smarter parsing function
function parseDataContent(data) {
    const lines = data.split('\n');
    const parsedData = [];
    let currentSiteId = null;
    let lineBuffer = ""; // Holds incomplete lines (like a split latitude)

    for (let line of lines) {
        // Step 1: Handle lines split across two parts
        // If we have something in the buffer, add the current line to it.
        if (lineBuffer) {
            line = lineBuffer + " " + line.trim();
            lineBuffer = ""; // Clear the buffer
        }

        // Check for lines that end with a latitude, indicating it might be split
        if (line.trim().match(/(\d{2}\.\d+)$/)) {
            lineBuffer = line.trim();
            continue; // Skip to the next line to get the rest of the data
        }

        // Step 2: A more flexible Site ID check
        const siteIdMatch = line.trim().match(/(^[A-Z]?\d{3,4}$)|(I-KO-KLKT-ENB-\w+)/);
        if (siteIdMatch) {
            currentSiteId = siteIdMatch[0].replace('I-KO-KLKT-ENB-', ''); // Keep only the number part for long IDs
            continue;
        }

        if (!currentSiteId) continue;

        // Step 3: More flexible regex to find all data parts
        const latLongMatch = line.match(/(\d{2}\.\d+)\s*°?\s*(\d{2,3}\.\d+)/);
        const angleMatch = line.match(/(\d+)\s*d(e|E)?g/i); // Matches deg, DEG, dg
        const distanceMatch = line.match(/(\d+)\s*m/i); // Matches m, M
        const buildingMatch = line.match(/(B\d)/i);

        if (latLongMatch && angleMatch && distanceMatch) {
            parsedData.push({
                siteId: currentSiteId,
                lat: latLongMatch[1],
                long: latLongMatch[2].replace(/^0+/, ''), // Remove leading zeros
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
