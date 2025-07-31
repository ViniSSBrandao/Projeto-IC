#include "DHT.h" // baixar bib

#define DHTPIN A1 // Mudar o pino quando conectar no ard
#define DHTTYPE DHT11 // DHT 11

// Conecte pino 1 do sensor (esquerda) ao +5V
// Conecte pino 2 do sensor ao pino de dados definido em seu Arduino
// Conecte pino 4 do sensor ao GND
// Conecte o resistor de 10K entre pin 2 (dados) 
// e ao pino 1 (VCC) do sensor

DHT dht(DHTPIN, DHTTYPE);

void setup() 
{
  Serial.begin(9600);
  Serial.println("DHT teste!");
  dht.begin();
}

void loop() 
{
  // A leitura da temperatura e umidade pode levar 250ms
  // e atraso do sensor pode chegar a 2 segundos
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  // testa se retorno é valido
  if (isnan(t) || isnan(h)) 
  {
    Serial.println("Falha ao ler DHT");
  } 
  else 
  {
    Serial.print("Umidade: ");
    Serial.print(h);
    Serial.print(" %t");
    Serial.print("Temperatura: ");
    Serial.print(t);
    Serial.println(" *C");
  }
}