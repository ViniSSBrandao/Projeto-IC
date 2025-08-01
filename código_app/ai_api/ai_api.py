import os
import google.generativeai as genai
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Carrega as variáveis de ambiente (sua chave de API) do arquivo .env
load_dotenv()

# --- Configuração da API do Gemini ---
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash') # Usando um modelo rápido e eficiente
except KeyError:
    raise RuntimeError("A variável de ambiente GOOGLE_API_KEY não foi definida. Crie um arquivo .env.")


# --- Modelos de Dados (Pydantic) para validação e documentação automática ---
class HorariosUmidade(BaseModel):
    # Usamos Field para fornecer exemplos na documentação
    horario_1: str = Field(..., description="Umidade alvo em um horário. Ex: '06:00: 70%'", alias="06:00")
    horario_2: str = Field(..., description="Umidade alvo em um horário. Ex: '12:00: 50%'", alias="12:00")
    horario_3: str = Field(..., description="Umidade alvo em um horário. Ex: '18:00: 70%'", alias="18:00")
    horario_4: str = Field(..., description="Umidade alvo em um horário. Ex: '23:00: 40%'", alias="23:00")
    
    class Config:
        populate_by_name = True # Permite usar alias como "06:00"

class PlantDataResponse(BaseModel):
    luminosidade_ideal: str
    umidade_ar_ideal: str
    metodo_irrigacao_ideal: str
    # O modelo acima não se encaixa perfeitamente pois as chaves são dinâmicas, 
    # usaremos um dict genérico aqui para a resposta real.
    horarios_umidade_solo: dict[str, str]
    temperatura_ideal_celsius: str
    tipo_planta: str

class ErrorResponse(BaseModel):
    detail: str

# --- Criação da Aplicação FastAPI ---
app = FastAPI(
    title="API de Cuidados com Plantas",
    description="Fornece dados de cuidados para plantas utilizando a API do Google Gemini.",
    version="1.0.0"
)

# --- Função do Prompt ---
def get_plant_care_prompt(plant_name: str) -> str:
    # O prompt que definimos anteriormente
    return f"""
Atue como um especialista em botânica. Sua tarefa é retornar dados sobre uma planta em um formato JSON estrito. Não adicione nenhuma explicação ou texto fora do JSON.
A planta é: "{plant_name}"

Se o texto fornecido não for um nome de planta conhecido (popular ou científico), retorne exatamente: {{"erro": "Planta não encontrada"}}.

Se for uma planta válida, forneça os seguintes dados:
- "nome_nome_cientifico": Forneça o seu nome popular (se existir) junto com o nome científico entre parênteses, formatado com letras maiúsculas corretas (exemplo: Rosa Branca (Rosa alba)).
- "luminosidade_ideal": Uma string descrevendo a luz ideal (ex: "Luz indireta brilhante" ou "Sol pleno").
- "umidade_ar_ideal": Uma string com a faixa de umidade do ar em porcentagem (ex: "60-80%").
- "metodo_irrigacao_ideal": Responda apenas com "gotejamento" ou "agendado".
- "horarios_umidade_solo": Um objeto JSON com até 4 horários chave e a umidade do solo alvo em porcentagem. Use o formato {{"06:00": "70%", "12:00": "50%", "18:00": "70%", "23:00": "40%"}}. Isso indica os momentos em que o solo deve atingir aquela umidade após a rega e os momentos em que pode estar mais seco.
- "temperatura_ideal_celsius": Uma string com a faixa de temperatura ideal em graus Celsius (ex: "18-25°C").
- "tipo_planta": Uma string com a classificação da planta (ex: "Folhagem", "Hortaliça", "Bulbo", "Suculenta").

O JSON de saída deve ser exatamente neste formato, sem ```json ou qualquer outra formatação:
{{
  "nome_nome_cientifico" : "...",
  "luminosidade_ideal": "...",
  "umidade_ar_ideal": "...",
  "metodo_irrigacao_ideal": "...",
  "horarios_umidade_solo": {{...}},
  "temperatura_ideal_celsius": "...",
  "tipo_planta": "..."
}}
"""

# --- Endpoint da API ---
@app.get(
    "/plant-care/{plant_name}",
    response_model=PlantDataResponse,
    responses={404: {"model": ErrorResponse, "description": "A planta não foi encontrada."}},
    summary="Obter dados de cuidado de uma planta"
)
async def get_plant_care(plant_name: str):
    """
    Recebe o nome de uma planta (popular ou científico) e retorna um JSON com
    as informações detalhadas de cuidado.
    """
    print("get_planta")
    if not plant_name or not plant_name.strip():
        raise HTTPException(status_code=400, detail="O nome da planta não pode ser vazio.")

    prompt = get_plant_care_prompt(plant_name)
    
    try:
        # Envia o prompt para a API do Gemini
        response = model.generate_content(prompt)
        
        # Limpa a resposta para garantir que seja um JSON válido
        # A IA às vezes retorna a string JSON dentro de um bloco de código markdown
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        
        # Converte a string de resposta para um dicionário Python
        data = json.loads(cleaned_response_text)
        print(data)
        print("recieved response")
        # Verifica se a IA retornou o erro que instruímos
        if "erro" in data:
            raise HTTPException(status_code=404, detail=data["erro"])

        return data

    except json.JSONDecodeError:
        # A resposta da IA não foi um JSON válido
        raise HTTPException(status_code=500, detail="Erro ao processar a resposta da LLM. Resposta não é um JSON válido.")
    except Exception as e:
        # Captura outros erros, como falhas na API do Google
        print(f"Ocorreu um erro inesperado: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno no servidor.")