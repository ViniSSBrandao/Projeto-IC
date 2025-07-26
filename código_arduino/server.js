const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies and enable CORS
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Simulate toggleLED endpoint
app.post('/toggleLED', (req, res) => {
    console.log('toggle led')
    res.json({ message: 'LED toggled successfully' });
});

// Simulate readSensor endpoint
app.get('/readSensor', (req, res) => {
    // Simulate a random sensor value between 0 and 100
    console.log('read sensor')
    const sensorValue = Math.floor(Math.random() * 100);
    res.json({ value: sensorValue });
});

// Simulate setPlantName endpoint
app.post('/setPlantName', (req, res) => {
    console.log('rename plant')

    const { plant, name } = req.body;
    if (!plant || !name) {
        return res.status(400).json({ message: 'Plant and name are required' });
    }
    res.json({ message: `Plant ${plant} renamed to ${name}` });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});