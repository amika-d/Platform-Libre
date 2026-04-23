backend:
	uvicorn src.main:app --reload --port 8000

build:
	docker compose up -d --build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f app

rebuild:
	docker compose up --build --force-recreate app

run:
	docker compose exec app uv run $(L)

cli:
	docker compose exec app uv run ui/cli.py

test:
	docker compose exec app uv run pytest $(TEST) -v -s

up-backend:
	docker compose up -d
	docker compose exec -d app uv run python run_worker.py