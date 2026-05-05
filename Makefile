dev:
	bun run dev

deploy:
	docker compose -f docker/docker-compose.yml up --remove-orphans --build
