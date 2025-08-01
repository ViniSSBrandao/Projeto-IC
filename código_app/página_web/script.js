// --- CONFIGURAÇÃO ---
const arduinoIP = 'http://localhost:3000'; // MANTENHA O IP DO SEU ARDUINO/ESP
const llmApiUrl = 'http://127.0.0.1:8000'; // URL DA SUA API FASTAPI (LLM)
const plants = ['Planta 1'];
const updateInterval = 5000; // 5 segundos

// --- VARIÁVEIS GLOBAIS ---
let requestQueue = [];
let isProcessingQueue = false;
let selectedPlant = '';
let plantIdealLuminosity = { min: 10000, max: 25000 }; // Valores padrão para evitar erros

// --- ELEMENTOS DO DOM ---
const responseDiv = document.getElementById('response');
const plantNameInput = document.getElementById('plant-name-input');
const plantNameContainer = document.getElementById('plant-name-container');
const popupOverlay = document.getElementById('popup-overlay');
const popupData = document.getElementById('popup-data');
const popupCloseBtn = document.getElementById('popup-close');

// --- FILA DE REQUISIÇÕES (para não sobrecarregar o Arduino) ---
async function enqueueRequest(requestFn) {
    requestQueue.push(requestFn);
    if (!isProcessingQueue) {
        processQueue();
    }
}

async function processQueue() {
    if (requestQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    isProcessingQueue = true;
    const requestFn = requestQueue.shift();
    await requestFn();
    setTimeout(processQueue, 100); // Pequeno delay entre requisições
}

// --- LÓGICA DO POP-UP ---
function showPopup(contentHtml) {
    popupData.innerHTML = contentHtml;
    popupOverlay.style.display = 'flex';
}

function hidePopup() {
    popupOverlay.style.display = 'none';
}

popupCloseBtn.addEventListener('click', hidePopup);
popupOverlay.addEventListener('click', (event) => {
    if (event.target === popupOverlay) {
        hidePopup();
    }
});

// --- LÓGICA DE INTERAÇÃO COM APIS ---

async function submitPlantName() {
    const plantName = plantNameInput.value.trim();
    if (!plantName) {
        responseDiv.innerText = 'Erro: Por favor, insira um nome para a planta.';
        return;
    }

    responseDiv.innerText = `Buscando dados para "${plantName}"...`;
    plantNameContainer.style.display = 'none';

    try {
        const response = await fetch(`${llmApiUrl}/plant-care/${plantName}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.erro || 'Erro ao buscar dados da planta.');
        }

        const plantData = await response.json();
        const formattedJson = `<pre>${JSON.stringify(plantData, null, 2)}</pre>`;
        showPopup(formattedJson);
        updatePlantCardUI(selectedPlant, plantData);
        enqueueRequest(() => sendDataToArduino(selectedPlant, plantData));
        responseDiv.innerText = `Dados de "${plantData.nome_nome_cientifico}" atualizados e enviados para o Arduino!`;
    } catch (error) {
        console.warn('LLM indisponível. Usando dados falsos.');
        responseDiv.innerText = `⚠️ LLM indisponível. Dados simulados serão utilizados.`;

        const fakeData = {
            "nome_nome_cientifico": "Manjericão (Ocimum basilicum): Hortaliça",
            "luminosidade_ideal": "Sol pleno",
            "umidade_ar_ideal": "50-60%",
            "metodo_irrigacao_ideal": "gotejamento",
            "horarios_umidade_solo": {
                "06:00": "70%",
                "12:00": "50%",
                "18:00": "70%",
                "23:00": "40%"
            },
            "temperatura_ideal_celsius": "20-28°C",
            "tipo_planta": "Hortaliça",
            "luminosidade_ideal_lux": {
                min: 10000,
                max: 25000
            }
        };

        const formattedJson = `<pre>${JSON.stringify(fakeData, null, 2)}</pre>`;
        showPopup(formattedJson);
        updatePlantCardUI(selectedPlant, fakeData);
        enqueueRequest(() => sendDataToArduino(selectedPlant, fakeData));
    }
}


async function sendDataToArduino(plantId, data) {
    console.log(`Enviando para o Arduino (${plantId}):`, data);
    try {
        const response = await fetch(`${arduinoIP}/setPlantData`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plant: plantId, data: data })
        });
        const responseData = await response.json();
        console.log('Resposta do Arduino:', responseData.message);
    } catch (error) {
        console.error('Erro ao enviar dados para o Arduino:', error);
        responseDiv.innerText = 'Erro de comunicação com o Arduino.';
    }
}

function updatePlantCardUI(plantId, data) {
    const plantIndex = plants.indexOf(plantId) + 1;
    document.getElementById(`plant${plantIndex}-name`).innerText = data.nome_nome_cientifico;
    const umidadeIdeal = Object.values(data.horarios_umidade_solo)[0] || 'N/A';
    document.getElementById(`plant${plantIndex}-ideal-humidity`).innerText = `Umidade do solo Ideal${umidadeIdeal}`;
    document.getElementById(`plant${plantIndex}-irrigation-type`).innerText = `Tipo de irrigação: ${data.metodo_irrigacao_ideal}`;
    // Atualiza a luminosidade ideal
    plantIdealLuminosity = data.luminosidade_ideal_lux;
    document.getElementById('luminosidade-ideal').innerText = `Luminosidade Ideal: ${data.luminosidade_ideal_lux.min}-${data.luminosidade_ideal_lux.max} lx`;
}

// --- CONTROLE DO LED UV ---
async function toggleUVLED(plant) {
    enqueueRequest(async () => {
        try {
            const response = await fetch(`${arduinoIP}/toggleUVLED?plant=${encodeURIComponent(plant)}`, { method: 'POST' });
            const data = await response.json();
            responseDiv.innerText = `Resposta do Arduino (LED UV): ${data.message}`;
        } catch (error) {
            responseDiv.innerText = `Erro: Não foi possível conectar ao Arduino para o LED UV de ${plant}`;
        }
    });
}

// --- FUNÇÕES ORIGINAIS (Adaptadas e Mantidas) ---
function showPlantNameInput(plant) {
    selectedPlant = plant;
    plantNameContainer.style.display = 'block';
    plantNameInput.value = '';
    plantNameInput.focus();
    responseDiv.innerText = `Digite o nome para a ${plant} e clique em Enviar.`;
}

async function toggleLED(plant) {
    enqueueRequest(async () => {
        try {
            const response = await fetch(`${arduinoIP}/toggleLED?plant=${encodeURIComponent(plant)}`, { method: 'POST' });
            const data = await response.json();
            responseDiv.innerText = `Resposta do Arduino: ${data.message}`;
        } catch (error) {
            responseDiv.innerText = `Erro: Não foi possível conectar ao Arduino para ${plant}`;
        }
    });
}

async function fetchDynamicData() {
    for (const plant of plants) {
        await enqueueRequest(async () => {
            try {
                const response = await fetch(`${arduinoIP}/getDynamicData?plant=${encodeURIComponent(plant)}`);
                console.log(response);
                const data = await response.json();
                const plantIndex = plants.indexOf(plant) + 1;
                document.getElementById(`plant${plantIndex}-current-humidity`).innerText = `Umidade do solo atual: ${data.currentHumidity}%`;
                document.getElementById(`plant${plantIndex}-time-to-irrigation`).innerText = `Tempo estimado: ${data.timeToIrrigation}`;
                document.getElementById(`plant${plantIndex}-suitable-to-water`).innerText = `${plant} - Adequado para regar: ${data.isSuitableToWater ? 'Sim' : 'Não'}`;
                
                if (plant === 'Planta 1') { 
                    const envResponse = await fetch(`${arduinoIP}/getEnvironmentalData`);
                    const envData = await envResponse.json();
                    const reservatorioDiv = document.getElementById('reservatorio-nivel');
                    reservatorioDiv.innerText = `Nível do reservatório: ${envData.reservoirLevel}`;
                    reservatorioDiv.classList.toggle('reservatorio-vazio', envData.reservoirLevel === 'Vazio');
                    document.getElementById('bomba-status').innerText = `Status da bomba: ${envData.pumpStatus}`;
                    document.getElementById('luminosidade').innerText = `Luminosidade: ${envData.luminosity} lx`;
                    document.getElementById('uv-led-status').innerText = `Status do LED UV: ${envData.uvLedStatus ? 'Ligado' : 'Desligado'}`;
                    document.getElementById('temperatura').innerText = `Temperatura: ${envData.temperature}°C`;
                    document.getElementById('umidade-atmosferica').innerText = `Umidade atmosférica: ${envData.atmosphericHumidity}%`;
                    // Atualiza o status da luminosidade
                    let luminosityStatus = 'Carregando...';
                    if (envData.luminosity < plantIdealLuminosity.min) {
                        luminosityStatus = 'Abaixo';
                    } else if (envData.luminosity > plantIdealLuminosity.max) {
                        luminosityStatus = 'Acima';
                    } else {
                        luminosityStatus = 'OK';
                    }
                    document.getElementById('luminosidade-status').innerText = `Status da Luminosidade: ${luminosityStatus}`;
                }
            } catch (error) {
                console.error(`Erro ao carregar dados dinâmicos da ${plant}`);
            }
        });
    }
}

function initializeApp() {
    fetchDynamicData();
    setInterval(fetchDynamicData, updateInterval);
    responseDiv.innerText = 'Sistema pronto. Escolha uma planta para configurar.';
}

initializeApp();