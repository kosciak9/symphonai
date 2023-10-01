import os
import logging
from transformers import pipeline

import time
import requests
import json

from fastapi import FastAPI, status, Request
from pydantic import BaseModel

app = FastAPI()
logger = logging.getLogger(__name__)

# get from env variables, default to localhost
llama_host = os.environ.get("LLAMA_HOST", "http://localhost:11434")
generate_endpoint = "/api/generate"

print("initializing translation models...")
pl_to_en_translator = pipeline(
    "translation", model="Helsinki-NLP/opus-mt-pl-en")
en_to_pl_translator = pipeline(
    "translation", model="sdadas/mt5-base-translator-en-pl")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"start request path={request.url.path}")
    start_time = time.time()

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(
        f"completed_in={formatted_process_time}ms status_code={response.status_code}"
    )

    return response


def chatbot_receiver_system_prompt(schema: str, question: str) -> str:
    return f"""
    ### Instructions:
    Your task is to convert a question into a SQL query, given a Postgres database schema.
    Adhere to these rules:
    - **Deliberately go through the question and database schema word by word** to appropriately answer the question
    - **Use Table Aliases** to prevent ambiguity. For example, `SELECT table1.col1, table2.col1 FROM table1 JOIN table2 ON table1.id = table2.id`.
    - When creating a ratio, always cast the numerator as float

    ### Input:
    Generate a SQL query that answers the question `{question}`.
    This query will run on a database whose schema is represented in this string:
    {schema}

    ### Response:
    Based on your instructions, here is the SQL query I have generated to answer the question `{question}`:
    ```sql
    """


def fixer_system_prompt(schema: str) -> str:
    return f"""
    You are a bot, helping user with interfacing with an SQL
    database. Given an example chatbot message with SQL code embedded in it,
    you need to fix it if it's broken. Take under consideration the schema of
    a database. Reply ONLY with the fixed SQL code.

    ###
    database schema:
    {schema}
    """


def chatbot_sender_system_prompt(schema: str) -> str:
    return f"""
    You are a bot, helping user with interfacing with an SQL
    database. Given an example chatbot message with SQL code embedded in it,
    and fixed SQL statement code, you need to generate a message that
    contains the explains the result of the SQL query. Don't mention that the
    SQL code was fixed.

    ###
    database schema:
    {schema}
    """


def generate_answer(model: str, prompt: str, system: str):
    r = requests.post(
        f"{llama_host}{generate_endpoint}",
        json={
            "model": model,
            "prompt": prompt,
            "system": system,
        },
        stream=True,
    )

    content = r.text.split("\n")
    result = ""

    for line in content:
        try:
            line_as_dict = json.loads(line)
            if "response" in line_as_dict:
                result += line_as_dict["response"]
        except:
            pass

    return result


class Message(BaseModel):
    user_input: str
    schema: str


@app.post("/process_message")
async def process_message(
    message: Message,
):
    print("got input:", message.user_input)
    generating_start = time.perf_counter()
    answer = generate_answer(
        "sqlcoder",
        chatbot_receiver_system_prompt(message.schema, message.user_input),
        "",
    )
    generating_end = time.perf_counter()
    print("generating took:", generating_end - generating_start)

    if not "SELECT" in answer:
        return {
            "message": "Nie udało się wygenerować poprawnego zapytania SQL. Spróbuj ponownie."
        }, status.HTTP_500_INTERNAL_SERVER_ERROR

    result = answer.split("```")
    sql_code = result[0].strip()
    enhanced_message = result[1].strip()

    return {"message": enhanced_message, "sql_code": sql_code}


@app.post("/fix_sql")
async def fix_sql(message: Message):
    print("got input:", message.user_input)
    generating_start = time.perf_counter()
    answer = generate_answer(
        "codellama", message.user_input, fixer_system_prompt(message.schema)
    )
    generating_end = time.perf_counter()
    print("generating took:", generating_end - generating_start)

    if not "SELECT" in answer:
        return {
            "message": "Nie udało się wygenerować poprawnego zapytania SQL. Spróbuj ponownie."
        }, status.HTTP_500_INTERNAL_SERVER_ERROR

    answer = answer.split("SELECT")[1].split(";")[0]
    answer = "SELECT" + answer + ";"
    answer = answer.strip()

    return answer


class Translation(BaseModel):
    user_input: str
    target_language: str


@app.post("/translate")
async def translate(
    translation: Translation,
) -> str:
    translator = None
    if translation.target_language == "en":
        translator = pl_to_en_translator
    elif translation.target_language == "pl":
        translator = en_to_pl_translator
    else:
        raise Exception("Invalid language")

    # Translate the input text
    translated_text = translator(
        translation.user_input, max_length=200, num_return_sequences=1
    )

    return translated_text[0]["translation_text"]
