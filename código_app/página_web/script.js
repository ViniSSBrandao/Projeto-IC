// --- CONFIGURAÇÃO ---
const arduinoIP = 'http://localhost:3000'; // MANTENHA O IP DO SEU ARDUINO/ESP
const llmApiUrl = 'http://127.0.0.1:8000'; // URL DA SUA API FASTAPI (LLM)
const plants = ['Planta 1'];
const updateInterval = 5000; // 5 segundos

// --- VARIÁVEIS GLOBAIS ---
let requestQueue = [];
let isProcessingQueue = false;
let selectedPlant = '';

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
    // Fecha o pop-up se clicar fora da caixa de conteúdo
    if (event.target === popupOverlay) {
        hidePopup();
    }
});


// --- LÓGICA DE INTERAÇÃO COM APIS ---

/**
 * NOVO: Orquestra a busca de dados da LLM, atualização da UI e envio para o Arduino.
 */
async function submitPlantName() {
    const plantName = plantNameInput.value.trim();
    if (!plantName) {
        responseDiv.innerText = 'Erro: Por favor, insira um nome para a planta.';
        return;
    }

    responseDiv.innerText = `Buscando dados para "${plantName}"...`;
    plantNameContainer.style.display = 'none';

    try {
        // 1. Chama a API da LLM
        const response = await fetch(`${llmApiUrl}/plant-care/${plantName}`);
        console.log(response)
        if (!response.ok) {
            console.log(response)
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao buscar dados da planta.');
        }

        const plantData = await response.json();

        // 2. Mostra o pop-up com o JSON formatado
        const formattedJson = `<pre>${JSON.stringify(plantData, null, 2)}</pre>`;
        showPopup(formattedJson);

        // 3. Atualiza a interface do usuário com os novos dados
        updatePlantCardUI(selectedPlant, plantData, plantName);
        
        // 4. Envia os dados para o Arduino (coloca na fila)
        enqueueRequest(() => sendDataToArduino(selectedPlant, plantData));

        responseDiv.innerText = `Dados de "${plantName}" atualizados e enviados para o Arduino!`;

    } catch (error) {
        console.error('Erro no processo de atualização da planta:', error);
        responseDiv.innerText = `Erro: ${error.message}`;
        showPopup(`<p style="color: red;"><b>Erro:</b> ${error.message}</p>`);
    }
}

/**
 * NOVO: Envia os dados obtidos da LLM para o Arduino.
 * IMPORTANTE: Você precisará criar um endpoint no seu Arduino que aceite um POST em '/setPlantData'.
 */
async function sendDataToArduino(plantId, data) {
    console.log(`Enviando para o Arduino (${plantId}):`, data);
    try {
        const response = await fetch(`${arduinoIP}/setPlantData`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos o identificador da planta e o objeto de dados
            body: JSON.stringify({ plant: plantId, data: data })
        });
        const responseData = await response.json();
        console.log('Resposta do Arduino:', responseData.message);
    } catch (error) {
        console.error('Erro ao enviar dados para o Arduino:', error);
        responseDiv.innerText = 'Erro de comunicação com o Arduino.';
    }
}

/**
 * ATUALIZADO: Atualiza o card da planta na tela com os dados da LLM.
 */
function updatePlantCardUI(plantId, data, plantName) {
    const plantIndex = plants.indexOf(plantId) + 1;
    
    document.getElementById(`plant${plantIndex}-name`).innerText = `${plantName}: ${data.tipo_planta}`;
    
    // Pega o maior valor de umidade do solo dos horários como referência
    const umidadeIdeal = Object.values(data.horarios_umidade_solo)[0] || 'N/A';
    document.getElementById(`plant${plantIndex}-ideal-humidity`).innerText = `${umidadeIdeal}`;

    document.getElementById(`plant${plantIndex}-irrigation-type`).innerText = `Tipo de irrigação: ${data.metodo_irrigacao_ideal}`;
}


// --- FUNÇÕES ORIGINAIS (Adaptadas e Mantidas) ---

// Mostra o campo para digitar o nome da planta
function showPlantNameInput(plant) {
    selectedPlant = plant;
    plantNameContainer.style.display = 'block';
    plantNameInput.value = '';
    plantNameInput.focus();
    responseDiv.innerText = `Digite o nome para a ${plant} e clique em Enviar.`;
}

// Controla o botão de rega manual
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

// Busca dados dinâmicos do Arduino (umidade atual, etc.)
async function fetchDynamicData() {
    for (const plant of plants) {
        await enqueueRequest(async () => {
            try {
                const response = await fetch(`${arduinoIP}/getDynamicData?plant=${encodeURIComponent(plant)}`);
                const data = await response.json();
                const plantIndex = plants.indexOf(plant) + 1;
                document.getElementById(`plant${plantIndex}-current-humidity`).innerText = `${data.currentHumidity}%`;
                document.getElementById(`plant${plantIndex}-time-to-irrigation`).innerText = `Tempo estimado: ${data.timeToIrrigation}`;
                document.getElementById(`plant${plantIndex}-suitable-to-water`).innerText = `${plant} - Adequado para regar: ${data.isSuitableToWater ? 'Sim' : 'Não'}`;
                
                // Busca dados ambientais apenas uma vez por ciclo para evitar requisições redundantes
                if (plant === 'Planta 1') { 
                    const envResponse = await fetch(`${arduinoIP}/getEnvironmentalData`);
                    const envData = await envResponse.json();
                    const reservatorioDiv = document.getElementById('reservatorio-nivel');
                    reservatorioDiv.innerText = `Nível do reservatório: ${envData.reservoirLevel}`;
                    reservatorioDiv.classList.toggle('reservatorio-vazio', envData.reservoirLevel === 'Vazio');
                    document.getElementById('bomba-status').innerText = `Status da bomba: ${envData.pumpStatus}`;
                    document.getElementById('luminosidade').innerText = `Luminosidade: ${envData.luminosity} lx`;
                    document.getElementById('temperatura').innerText = `Temperatura: ${envData.temperature}°C`;
                    document.getElementById('umidade-atmosferica').innerText = `Umidade atmosférica: ${envData.atmosphericHumidity}%`;
                }
            } catch (error) {
                // Não mostra erro aqui para não poluir a tela em caso de falha temporária
                console.error(`Erro ao carregar dados dinâmicos da ${plant}`);
            }
        });
    }
}

// --- INICIALIZAÇÃO DA PÁGINA ---
function initializeApp() {
    // Busca os dados dinâmicos iniciais
    fetchDynamicData();
    // Configura a atualização periódica
    setInterval(fetchDynamicData, updateInterval);
    // Mensagem inicial
    responseDiv.innerText = 'Sistema pronto. Escolha uma planta para configurar.';
}

// Inicia a aplicação quando a página carrega
initializeApp();