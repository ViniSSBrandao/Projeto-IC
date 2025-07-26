const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies and enable CORS
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Mocked plant data (static)
const plants = {
    'Planta 1': {
        name: 'Rosa',
        type: 'Flor',
        idealHumidity: 60,
        irrigationType: 'Gotejamento'
    },
    'Planta 2': {
        name: 'Manjericão',
        type: 'Erva',
        idealHumidity: 70,
        irrigationType: 'Aspersão'
    },
    'Planta 3': {
        name: 'Cacto',
        type: 'Suculenta',
        idealHumidity: 30,
        irrigationType: 'Manual'
    }
};

// Mocked dynamic data (will be updated dynamically)
let dynamicData = {
    'Planta 1': {
        currentHumidity: 55,
        timeToIrrigation: 12
    },
    'Planta 2': {
        currentHumidity: 65,
        timeToIrrigation: 8
    },
    'Planta 3': {
        currentHumidity: 25,
        timeToIrrigation: 24
    }
};

// Mocked environmental data
let environmentalData = {
    reservoirLevel: 80,
    luminosity: 500,
    temperature: 25,
    atmosphericHumidity: 60
};

// Simulate dynamic data updates
function updateDynamicData() {
    Object.keys(dynamicData).forEach(plant => {
        // Simulate slight changes in humidity (+/- 5%)
        dynamicData[plant].currentHumidity = Math.max(0, Math.min(100, 
            dynamicData[plant].currentHumidity + (Math.random() * 10 - 5)
        ));
        // Simulate time to irrigation decreasing (reset to 24h if below 0)
        dynamicData[plant].timeToIrrigation = Math.max(0, 
            dynamicData[plant].timeToIrrigation - 0.1
        );
        if (dynamicData[plant].timeToIrrigation === 0) {
            dynamicData[plant].timeToIrrigation = 24;
        }
    });
    // Simulate environmental data changes
    environmentalData.reservoirLevel = Math.max(0, Math.min(100, 
        environmentalData.reservoirLevel + (Math.random() * 2 - 1)
    ));
    environmentalData.luminosity = Math.max(0, Math.min(1000, 
        environmentalData.luminosity + (Math.random() * 50 - 25)
    ));
    environmentalData.temperature = Math.max(15, Math.min(35, 
        environmentalData.temperature + (Math.random() * 2 - 1)
    ));
    environmentalData.atmosphericHumidity = Math.max(0, Math.min(100, 
        environmentalData.atmosphericHumidity + (Math.random() * 10 - 5)
    ));
}

// Update dynamic data every 30 seconds
setInterval(updateDynamicData, 30000);

// Get static plant data
app.get('/getPlantData', (req, res) => {
    const plant = req.query.plant;
    if (!plant || !plants[plant]) {
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    res.json(plants[plant]);
});

// Get dynamic plant data
app.get('/getDynamicData', (req, res) => {
    const plant = req.query.plant;
    if (!plant || !dynamicData[plant]) {
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    res.json(dynamicData[plant]);
});

// Get environmental data
app.get('/getEnvironmentalData', (req, res) => {
    res.json(environmentalData);
});

// Toggle LED for a specific plant
app.post('/toggleLED', (req, res) => {
    const plant = req.query.plant;
    if (!plant || !plants[plant]) {
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    console.log(`Toggling LED for ${plant}`);
    // Simulate irrigation by increasing current humidity
    dynamicData[plant].currentHumidity = Math.min(100, dynamicData[plant].currentHumidity + 10);
    dynamicData[plant].timeToIrrigation = 24; // Reset time to irrigation
    res.json({ message: `Irrigation toggled for ${plant}` });
});

// Set plant name
app.post('/setPlantName', (req, res) => {
    console.log('Renaming plant');
    const { plant, name } = req.body;
    if (!plant || !name || !plants[plant]) {
        return res.status(400).json({ message: 'Plant and name are required' });
    }
    plants[plant].name = name;
    res.json({ message: `Plant ${plant} renamed to ${name}` });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});