void controle_irrigacao(valorSensorUmidade, dados_IA_Baixa, dados_IA_Alta){
  int valor_Sensor_umidade = analogRead(sensorSoloPin);

  Serial.print("Leitura do Sensor");
  Serial.println(valor_Sensor_umidade);

  int porcentagemUmdade = map(valor_Sensor_umidade, 550, 200, 0, 100);
  porcentagemUmidade = constrain(porcentagemUmidade, 0, 100);

  Serial.print("Umidade do solo: ")
  Serial.print(pocentagemUmidade);
  Serial.println("%");

  if (porcentagemUmidade < dados_IA_Baixa){
    Serial.println("Solo muito seco! Hora de regar.");
    digitalWrite = true;
  } else if (porcentagemUmidade < dados_IA_Alta){
    Serial.println("Solo com umidade adequada.");
  } else {
    Serial.println("Solo muito úmido.");
  }
}