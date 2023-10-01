# symphonai

> weekend project for HackYeah 2023, by Alergeek Ventures
> _overnight work by Bartek, Mario & Franek_

very simple idea:

1. Connect to the SQL database
2. Do an introspection - get the structure
3. Use our chatbot to generate SQL and query the database right from the
   browser

## standing on the shoulders of giants

- FastAPI for Python backend
- Ollama for LLM backend
  - using `sqlcoder` for SQL generation
  - using `codellama` for fixing SQL if needed
- NextJS for frontend

## run

- easiest way - clone and `docker-compose up`

  - you need to enable GPU support for your machine on your own
  - without proper GPU support, it will be very slow

- harder / easier way (depends on environment, Ollama.app is faster on M1 MacBooks):

  - open `backend` and do `poetry install && poetry run uvicorn main:app`
  - open `Ollama` app on your mac / linux machine
  - open `frontend`, run `pnpm i && pnpm dev`, go to
    [localhost:3000](http://localhost:3000)
