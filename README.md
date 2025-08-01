# Plant Care IoT System

## Overview

The **Plant Care IoT System** is a user-friendly smart gardening solution that makes plant care effortless and engaging. Perfect for gardeners of all levels, this system integrates a sleek web interface with ESP-based hardware and a FastAPI backend to deliver personalized plant care instructions. By simply entering a plant's name (e.g., "Rose" or "Rosa alba"), you receive tailored guidance on ideal light levels, soil moisture schedules, temperature, and more, powered by the Google Gemini API. ESP/Arduino devices monitor real-time conditions using sensors and control irrigation or UV LEDs, while the intuitive UI keeps you informed and in control.

The web dashboard allows you to select plants, view care details, monitor environmental data (e.g., soil moisture, light, temperature), and trigger actions like watering or UV LED activation with a single click. With clear visual feedback and automated controls, this system ensures your plants thrive while simplifying your gardening experience.

## Features

- **Intuitive Web Interface**: A modern, responsive dashboard to select plants, view care instructions, and monitor real-time conditions.
- **Tailored Plant Care**: Enter a plant’s name to get detailed care data, including:
  - Common and scientific name (e.g., "Rosa Branca (Rosa alba): Flor")
  - Ideal light range in lux (e.g., 10,000–25,000 lx)
  - Air humidity range (e.g., 60–80%)
  - Irrigation method (drip or scheduled)
  - Soil moisture schedule (up to four daily targets, e.g., 70% at 06:00)
  - Temperature range (e.g., 18–25°C)
  - Plant type (e.g., flower, herb, succulent)
- **Real-Time Monitoring**: Displays current soil moisture, light, temperature, atmospheric humidity, reservoir level, pump status, and UV LED status, updated every 5 seconds.
- **Automated Plant Care**: ESP devices use sensor data to manage irrigation and UV LEDs based on care schedules.
- **Interactive Controls**: Start irrigation or toggle UV LEDs directly from the UI, with instant feedback.
- **Visual Feedback**: Color-coded alerts (e.g., green for optimal light, red for low reservoir) make it easy to spot issues.
- **Robust Fallback**: Uses mock data if the Gemini API is unavailable, ensuring continuous operation.

## How It Works

1. **Choose a Plant**: Select a plant (e.g., "Planta 1") from the dropdown and enter its name in the input field.
2. **Get Care Instructions**: Submit the name to view detailed care data in a pop-up, fetched from the Gemini API via FastAPI.
3. **Monitor Your Plant**: The dashboard shows real-time sensor readings (e.g., soil moisture, light) compared to ideal values.
4. **Take Action**: Click "Regar Planta" to water or "Ligar/Desligar LED UV" to toggle the UV LED, with confirmations like "Irrigation toggled for Planta 1."
5. **Stay Informed**: Visual indicators highlight when conditions are optimal or need attention (e.g., red for low light).

## System Architecture

- **Web UI**: Built with HTML (`planta.html`), CSS (`styles.css`), and JavaScript (`script.js`), providing a dashboard for user interaction.
- **FastAPI Backend** (`main.py`): Queries the Google Gemini API for plant care data and serves it as JSON to the UI and ESP devices.
- **ESP Hardware** (`esp_plant_monitor.ino`): Runs an AsyncWebServer to handle API requests, interfaces with sensors (light, soil moisture, temperature, humidity), and controls actuators (pump, UV LED).
- **Mock Server** (`server.js`): Simulates ESP responses for testing without hardware.
- **Google Gemini API**: Provides botanical data for accurate care instructions.

## Getting Started

### Prerequisites

- **Hardware**:
  - ESP32/ESP8266 with Wi-Fi capability
  - Sensors: Light (e.g., BH1750), soil moisture, DHT11/DHT22 (humidity/temperature)
  - Actuators: Water pump/solenoid valve, UV LED
- **Software**:
  - Python 3.8+ (for FastAPI)
  - Node.js (for mock server and UI hosting)
  - Arduino IDE or PlatformIO (for ESP programming)
  - Google Cloud account with Gemini API key
- **Network**: Stable Wi-Fi for ESP and server communication
- **Browser**: Modern web browser (e.g., Chrome, Firefox)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ViniSSBrandao/Projeto-IC
   cd plant-care-iot
   ```

2. **Set Up the FastAPI Server**:
   - Create a virtual environment (optional):
     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows: venv\Scripts\activate
     ```
   - Install Python dependencies:
     ```bash
     pip install -r requirements.txt
     ```
     Ensure `requirements.txt` includes:
     ```
     fastapi
     uvicorn
     python-dotenv
     google-generativeai
     pydantic
     ```
   - Create a `.env` file in the project root:
     ```
     GOOGLE_API_KEY=your-google-api-key
     ```
   - Run the server:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port 8000
     ```

3. **Set Up the Mock Server (for Testing)**:
   - Install Node.js dependencies:
     ```bash
     npm install express cors
     ```
   - Run the mock server:
     ```bash
     node server.js
     ```
     Access at `http://localhost:3000`.

4. **Configure ESP Hardware**:
   - Install Arduino libraries: `ESPAsyncWebServer`, `ArduinoJson`, `HTTPClient`, sensor-specific libraries (e.g., `BH1750`, `DHT`).
   - Open `codigo_esp/esp_plant_monitor.ino` in Arduino IDE/PlatformIO.
   - Update the following in the sketch:
     - Wi-Fi credentials:
       ```cpp
       const char* ssid = "YourWiFiSSID";
       const char* password = "YourWiFiPassword";
       ```
     - FastAPI server URL in `script.js` (if ESP fetches data directly):
       ```javascript
       const llmApiUrl = 'http://<server-ip>:8000';
       ```
   - Connect sensors and actuators:
     - Light sensor (e.g., BH1750) for luminosity
     - Soil moisture sensor
     - DHT11/DHT22 for temperature and humidity
     - Water pump/solenoid valve (via relay)
     - UV LED (via relay or transistor)
   - Upload the sketch to your ESP32/ESP8266.
   - Note: The ESP code assumes serial communication with an Arduino for sensor data (`GET_SENSORS`). If using only ESP, modify the code to read sensors directly.

5. **Deploy the Front-End**:
   - Place `planta.html`, `styles.css`, and `script.js` in a web server directory.
   - Update `script.js` with correct server IPs:
     ```javascript
     const arduinoIP = 'http://<esp-ip>:80'; // ESP web server IP
     const llmApiUrl = 'http://<server-ip>:8000'; // FastAPI server
     ```
   - Run a local web server:
     ```bash
     npx http-server
     ```
   - Access the UI at `http://localhost:8080/planta.html` (adjust port as needed).

## Using the System

### Accessing the Dashboard
- Open the UI in your browser (e.g., `http://localhost:8080/planta.html`).
- The dashboard shows:
  - A control panel for "Planta 1" (extendable for more plants)
  - Environmental data (reservoir, pump, light, etc.)
  - A response area for system feedback

### Selecting a Plant
- Click "Trocar o tipo de planta" and select "Planta 1".
- Enter a plant name (e.g., "Rosa alba") in the input field.
- Click "Enviar" to fetch care data via FastAPI and Gemini.
- A pop-up displays the care details (close with "×" or click outside).

### Monitoring Conditions
- Updates every 5 seconds with:
  - **Soil Moisture**: Current vs. ideal (e.g., 55% vs. 70%)
  - **Time to Irrigation**: Time until next scheduled watering
  - **Watering Suitability**: "Sim" or "Não" based on light levels
  - **Environmental Data**: Reservoir level, pump status, light, temperature, humidity, UV LED status
- Luminosity status is color-coded:
  - Green: Within ideal range (e.g., 10,000–25,000 lx)
  - Red: Too low or high

### Controlling the System
- **Regar Planta 1**: Starts irrigation, activating the pump briefly. Feedback: "Irrigation toggled for Planta 1."
- **Ligar/Desligar LED UV**: Toggles the UV LED. Feedback: "UV LED toggled, now Ligado/Desligado."
- Actions are processed by the ESP’s web server, which communicates with sensors/actuators.

### Example Output
After entering "Rosa alba":
- **Pop-Up**:
  ```json
  {
    "nome_nome_cientifico": "Rosa Branca (Rosa alba): Flor",
    "luminosidade_ideal_lux": { "min": 10000, "max": 25000 },
    "umidade_ar_ideal": "60-80%",
    "metodo_irrigacao_ideal": "agendado",
    "horarios_umidade_solo": { "06:00": "70%", "12:00": "50%", "18:00": "70%", "23:00": "40%" },
    "temperatura_ideal_celsius": "18-25°C",
    "tipo_planta": "Flor"
  }
  ```
- **Dashboard**:
  - Plant: Rosa Branca (Rosa alba)
  - Ideal Soil Moisture: 70% (06:00)
  - Current Soil Moisture: 55%
  - Time to Irrigation: 12:00
  - Luminosity: 15,000 lx (Status: OK, green)
  - Reservoir: Cheio

## Troubleshooting

- **"Planta não encontrada"**: Verify the plant name or Gemini API connectivity.
- **ESP Communication Error**: Ensure the ESP is on Wi-Fi and `arduinoIP` in `script.js` matches the ESP’s IP (check Serial Monitor for IP).
- **No Data Updates**: Confirm FastAPI (`main.py`) and ESP are running. Check browser console for errors.
- **Reservoir Vazio**: Refill the reservoir; the UI highlights it in red when empty.
- **Sensor Issues**: If `GET_SENSORS` fails, ensure Arduino serial communication is set up or modify `esp_plant_monitor.ino` for direct sensor reads.

## Extending the System

- **Multiple Plants**: Add plants to `script.js` (`plants` array) and extend `planta.html` with additional control panels.
- **Custom Sensors**: Update `esp_plant_monitor.ino` to support sensors like pH or nutrient monitors.
- **Mobile App**: Build a mobile UI using React Native, replacing `planta.html`.
- **Advanced Automation**: Enhance `esp_plant_monitor.ino` to automate irrigation based on sensor thresholds without UI input.

## Contributing

We welcome contributions! To contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please document UI or hardware changes to maintain a seamless user experience.

## License

This system is open for modification and personal. No formal licensing is provided.
