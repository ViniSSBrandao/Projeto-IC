import os
import google.generativeai as genai
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Carrega as variáveis de ambiente (sua chave de API) do arquivo .env
load_dotenv()

# --- Configuração da API do Gemini ---
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
except KeyError:
    raise RuntimeError("A variável de ambiente GOOGLE_API_KEY não foi definida. Crie um arquivo .env.")

# --- Modelos de Dados (Pydantic) ATUALIZADOS ---

# NOVO MODELO para a estrutura da luminosidade
class LuminosidadeLux(BaseModel):
    min: int
    max: int

# MODELO DE RESPOSTA ATUALIZADO
class PlantDataResponse(BaseModel):
    luminosidade_ideal_lux: LuminosidadeLux  # ATUALIZADO
    umidade_ar_ideal: str
    metodo_irrigacao_ideal: str
    horarios_umidade_solo: dict[str, str]
    temperatura_ideal_celsius: str
    tipo_planta: str

class ErrorResponse(BaseModel):
    detail: str

# --- Criação da Aplicação FastAPI ---
app = FastAPI(
    title="API de Cuidados com Plantas (v2 com Sensores)",
    description="Fornece dados de cuidados para plantas, incluindo faixas de LUX, utilizando a API do Google Gemini.",
    version="2.0.0"
)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"], # Permite todos os cabeçalhos
)

# --- Função do Prompt ATUALIZADA ---
def get_plant_care_prompt(plant_name: str) -> str:
    # O prompt que definimos na Seção 1
    return f"""
Atue como um especialista em botânica. Sua tarefa é retornar dados sobre uma planta em um formato JSON estrito. Não adicione nenhuma explicação ou texto fora do JSON.

A planta é: "{plant_name}"

Se o texto fornecido não for um nome de planta conhecido (popular ou científico), retorne exatamente: {{"erro": "Planta não encontrada"}}.

Se for uma planta válida, forneça os seguintes dados:
- "luminosidade_ideal_lux": Um objeto JSON com os valores mínimo e máximo de luminosidade em lux (lúmens por metro quadrado). Os valores devem ser números inteiros. Exemplo: {{"min": 10000, "max": 25000}}.
- "umidade_ar_ideal": Uma string com a faixa de umidade do ar em porcentagem (ex: "60-80%").
- "metodo_irrigacao_ideal": Responda apenas com "gotejamento" ou "agendado".
- "horarios_umidade_solo": Um objeto JSON com até 4 horários chave e a umidade do solo alvo em porcentagem. Use o formato {{"HH:MM": "%", "HH:MM": "%", ...}}.
- "temperatura_ideal_celsius": Uma string com a faixa de temperatura ideal em graus Celsius (ex: "18-25°C").
- "tipo_planta": Uma string com a classificação da planta (ex: "Folhagem", "Hortaliça", "Bulbo", "Suculenta").

O JSON de saída deve ser exatamente neste formato, sem ```json ou qualquer outra formatação:
{{
  "luminosidade_ideal_lux": {{"min": 0, "max": 0}},
  "umidade_ar_ideal": "...",
  "metodo_irrigacao_ideal": "...",
  "horarios_umidade_solo": {{"06:00": "70%"}},
  "temperatura_ideal_celsius": "...",
  "tipo_planta": "..."
}}
"""

# --- Endpoint da API (sem alterações na lógica, apenas nos modelos) ---
@app.get(
    "/plant-care/{plant_name}",
    response_model=PlantDataResponse,
    responses={404: {"model": ErrorResponse, "description": "A planta não foi encontrada."}},
    summary="Obter dados de cuidado de uma planta"
)
async def get_plant_care(plant_name: str):
    if not plant_name or not plant_name.strip():
        raise HTTPException(status_code=400, detail="O nome da planta não pode ser vazio.")

    prompt = get_plant_care_prompt(plant_name)
    
    try:
        response = model.generate_content(prompt)
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_response_text)

        if "erro" in data:
            raise HTTPException(status_code=404, detail=data["erro"])

        return data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Erro ao processar a resposta da LLM. Resposta não é um JSON válido.")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno no servidor.")