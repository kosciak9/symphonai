#!/bin/sh

./bin/ollama serve &

sleep 5

curl -X POST http://ollama:11434/api/pull -d '{"name": "codellama"}'

sleep 10

curl -X POST http://ollama:11434/api/pull -d '{"name": "sqlcoder"}'

sleep 10

tail -f /dev/null
