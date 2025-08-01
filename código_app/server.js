
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
        nome_nome_cientifico: 'Rosa Branca (Rosa alba)',
        tipo_planta: 'Flor',
        metodo_irrigacao_ideal: 'Gotejamento',
        horarios_umidade_solo: {
            '00:00': 60,
            '06:00': 60,
            '12:00': 60,
            '18:00': 60
        },
        luminosidade_ideal_lux: { min: 10000, max: 25000 },
        umidade_ar_ideal: '60-80%',
        temperatura_ideal_celsius: '18-25°C'
    },
    'Planta 2': {
        nome_nome_cientifico: 'Manjericão (Ocimum basilicum)',
        tipo_planta: 'Erva',
        metodo_irrigacao_ideal: 'Aspersão',
        horarios_umidade_solo: {
            '00:00': 70,
            '06:00': 70,
            '12:00': 70,
            '18:00': 70
        },
        luminosidade_ideal_lux: { min: 15000, max: 30000 },
        umidade_ar_ideal: '50-70%',
        temperatura_ideal_celsius: '20-30°C'
    },
    'Planta 3': {
        nome_nome_cientifico: 'Cacto (Cactaceae)',
        tipo_planta: 'Suculenta',
        metodo_irrigacao_ideal: 'Manual',
        horarios_umidade_solo: {
            '00:00': 30,
            '06:00': 30,
            '12:00': 30,
            '18:00': 30
        },
        luminosidade_ideal_lux: { min: 20000, max: 40000 },
        umidade_ar_ideal: '20-40%',
        temperatura_ideal_celsius: '25-35°C'
    }
};

// Mocked dynamic data (will be updated dynamically)
let dynamicData = {
    'Planta 1': {
        currentHumidity: 55,
        timeToIrrigation: 12.0,
        isSuitableToWater: true,

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
    uvLedStatus: false
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
        if (!plants[plant]) return; // Skip if plant not found
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
        // Update watering suitability based on plant-specific luminosity range
        const plantData = plants[plant];
        dynamicData[plant].isSuitableToWater = environmentalData.luminosity >= plantData.luminosidade_ideal_lux.min && 
                                              environmentalData.luminosity <= plantData.luminosidade_ideal_lux.max;
    });
    // Simulate environmental data changes
    environmentalData.luminosity = Math.round(Math.max(0, Math.min(40000, 
        environmentalData.luminosity + (Math.random() * 50 - 25)
    )));
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
    console.log(`[GET] /getPlantData | Plant: ${plant}`);
    if (!plant || !plants[plant]) {
        console.error(`Error: Plant ${plant} not found in plants`);
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    res.json(plants[plant]);
});

// Get dynamic plant data
app.get('/getDynamicData', (req, res) => {
    const plant = req.query.plant;
    // console.log(`[GET] /getDynamicData | Plant: ${plant}`);
    if (!plant || !dynamicData[plant]) {
        console.error(`Error: Plant ${plant} not found in dynamicData`);
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    try {
        const response = {
            currentHumidity: dynamicData[plant].currentHumidity,
            timeToIrrigation: formatTime(dynamicData[plant].timeToIrrigation),
            isSuitableToWater: dynamicData[plant].isSuitableToWater
        };
        console.log(`[GET] /getDynamicData | Response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`Error in /getDynamicData for ${plant}:`, error);
        res.status(500).json({ message: `Internal server error for ${plant}` });
    }
});

// Get environmental data
app.get('/getEnvironmentalData', (req, res) => {
    console.log(`[GET] /getEnvironmentalData`);
    try {
        res.json(environmentalData);
    } catch (error) {
        console.error(`Error in /getEnvironmentalData:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Toggle LED for a specific plant
app.post('/toggleLED', (req, res) => {
    const plant = req.query.plant;
    console.log(`[POST] /toggleLED | Plant: ${plant}`);
    if (!plant || !plants[plant]) {
        console.error(`Error: Plant ${plant} not found in plants`);
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    try {
        dynamicData[plant].currentHumidity = Math.min(100, dynamicData[plant].currentHumidity + 10);
        dynamicData[plant].timeToIrrigation = 24;
        environmentalData.pumpStatus = 'Operando';
        setTimeout(() => {
            environmentalData.pumpStatus = 'Desligada';
            console.log(`Pump status set to Desligada for ${plant}`);
        }, 5000);
        res.json({ message: `Irrigation toggled for ${plant}` });
    } catch (error) {
        console.error(`Error in /toggleLED for ${plant}:`, error);
        res.status(500).json({ message: `Internal server error for ${plant}` });
    }
});

// Toggle UV LED for a specific plant
app.post('/toggleUVLED', (req, res) => {
    const plant = req.query.plant;
    console.log(`[POST] /toggleUVLED | Plant: ${plant}`);
    if (!plant || !plants[plant]) {
        console.error(`Error: Plant ${plant} not found in plants`);
        return res.status(400).json({ message: `Plant ${plant} not found` });
    }
    try {
        environmentalData.uvLedStatus = !environmentalData.uvLedStatus;
        console.log(`UV LED toggled for ${plant} → ${environmentalData.uvLedStatus ? 'Ligado' : 'Desligado'}`);
        res.json({ message: `UV LED toggled for ${plant}, now ${environmentalData.uvLedStatus ? 'Ligado' : 'Desligado'}` });
    } catch (error) {
        console.error(`Error in /toggleUVLED for ${plant}:`, error);
        res.status(500).json({ message: `Internal server error for ${plant}` });
    }
});

// Set plant data
app.post('/setPlantData', (req, res) => {
    console.log(`[POST] /setPlantData`);
    const { plant, data } = req.body;
    if (!plant || !data || !plants[plant]) {
        console.error(`Error: Invalid request for ${plant}, data: ${JSON.stringify(data)}`);
        return res.status(400).json({ message: 'Plant and data are required' });
    }
    try {
        console.log(`Setting data for ${plant}:`, data);
        plants[plant] = {
            nome_nome_cientifico: data.nome_nome_cientifico,
            tipo_planta: data.tipo_planta,
            metodo_irrigacao_ideal: data.metodo_irrigacao_ideal,
            horarios_umidade_solo: data.horarios_umidade_solo,
            luminosidade_ideal_lux: data.luminosidade_ideal_lux,
            umidade_ar_ideal: data.umidade_ar_ideal,
            temperatura_ideal_celsius: data.temperatura_ideal_celsius
        };
        res.json({ message: `Plant data updated for ${plant}` });
    } catch (error) {
        console.error(`Error in /setPlantData for ${plant}:`, error);
        res.status(500).json({ message: `Internal server error for ${plant}` });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
