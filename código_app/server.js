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
        tipo_planta: 'Rosa (Rosa alba)',
        metodo_irrigacao_ideal: 'Gotejamento',
        horarios_umidade_solo: {
            '00:00': 60,
            '06:00': 60,
            '12:00': 60,
            '18:00': 60
        }
    },
    'Planta 2': {
        tipo_planta: 'Manjericão (Ocimum basilicum)',
        metodo_irrigacao_ideal: 'Aspersão',
        horarios_umidade_solo: {
            '00:00': 70,
            '06:00': 70,
            '12:00': 70,
            '18:00': 70
        }
    },
    'Planta 3': {
        tipo_planta: 'Cacto (Cactaceae)',
        metodo_irrigacao_ideal: 'Manual',
        horarios_umidade_solo: {
            '00:00': 30,
            '06:00': 30,
            '12:00': 30,
            '18:00': 30
        }
    }
};

// Mocked dynamic data (will be updated dynamically)
let dynamicData = {
    'Planta 1': {
        currentHumidity: 55,
        timeToIrrigation: 12.0,
        isSuitableToWater: true
    },
    'Planta 2': {
        currentHumidity: 65,
        timeToIrrigation: 8.0,
        isSuitableToWater: true
    },
    'Planta 3': {
        currentHumidity: 25,
        timeToIrrigation: 24.0,
        isSuitableToWater: false
    }
};

// Mocked environmental data
let environmentalData = {
    reservoirLevel: 'Cheio',
    pumpStatus: 'Desligada',
    luminosity: 500,
    temperature: 25,
    atmosphericHumidity: 60,
    uvLedStatus: false // Added UV LED status
};

// Format time to HH:mm
function formatTime(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Simulate dynamic data updates
function updateDynamicData() {
    Object.keys(dynamicData).forEach(plant => {
        // Simulate slight changes in humidity (+/- 5%)
        dynamicData[plant].currentHumidity = Math.max(0, Math.min(100, 
            Math.round(dynamicData[plant].currentHumidity + (Math.random() * 10 - 5))
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
    environmentalData.luminosity = Math.round(Math.max(0, Math.min(1000, 
        environmentalData.luminosity + (Math.random() * 50 - 25)
    )));
    // Update per-plant watering suitability (suitable if luminosity is between 200 and 800 lx)
    Object.keys(dynamicData).forEach(plant => {
        dynamicData[plant].isSuitableToWater = environmentalData.luminosity >= 200 && environmentalData.luminosity <= 800;
    });
    environmentalData.temperature = Math.round(Math.max(15, Math.min(35, 
        environmentalData.temperature + (Math.random() * 2 - 1)
    )));
    environmentalData.atmosphericHumidity = Math.round(Math.max(0, Math.min(100, 
        environmentalData.atmosphericHumidity + (Math.random() * 10 - 5)
    )));
    // Simulate reservoir level (binary: Cheio if > 20%, Vazio otherwise)
    const reservoirNumeric = environmentalData.reservoirLevel === 'Cheio' ? 80 : 10;
    const newReservoirNumeric = Math.max(0, Math.min(100, 
        reservoirNumeric + (Math.random() * 10 - 5)
    ));
    environmentalData.reservoirLevel = newReservoirNumeric > 20 ? 'Cheio' : 'Vazio';
    // Simulate UV LED status (randomly toggle for simulation)
    environmentalData.uvLedStatus = Math.random() > 0.5;
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
    res.json({
        currentHumidity: dynamicData[plant].currentHumidity,
        timeToIrrigation: formatTime(dynamicData[plant].timeToIrrigation),
        isSuitableToWater: dynamicData[plant].isSuitableToWater
    });
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
    // Simulate irrigation by increasing current humidity and setting pump status
    dynamicData[plant].currentHumidity = Math.min(100, dynamicData[plant].currentHumidity + 10);
    dynamicData[plant].timeToIrrigation = 24;
    environmentalData.pumpStatus = 'Operando';
    // Simulate pump turning off after 5 seconds
    setTimeout(() => {
        environmentalData.pumpStatus = 'Desligada';
    }, 5000);
    res.json({ message: `Irrigation toggled for ${plant}` });
});

// Toggle UV LED for a specific plant
app.post('/toggleUVLED', (req, res) => {
    const plant = req.query.plant;
    if (!plant || !plants[plant]) {
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    console.log(`Toggling UV LED for ${plant}`);
    // Toggle UV LED status
    environmentalData.uvLedStatus = !environmentalData.uvLedStatus;
    res.json({ message: `UV LED toggled for ${plant}, now ${environmentalData.uvLedStatus ? 'Ligado' : 'Desligado'}` });
});

// Set plant data
app.post('/setPlantData', (req, res) => {
    const { plant, data } = req.body;
    if (!plant || !data || !plants[plant]) {
        return res.status(400).json({ message: 'Plant and data are required' });
    }
    console.log(`Setting plant data for ${plant}:`, data);
    // Update plant data with the provided fields
    plants[plant] = {
        tipo_planta: data.tipo_planta,
        metodo_irrigacao_ideal: data.metodo_irrigacao_ideal,
        horarios_umidade_solo: data.horarios_umidade_solo
    };
    res.json({ message: `Plant data updated for ${plant}` });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
