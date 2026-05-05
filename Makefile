dev:
	bun run dev

deploy:
	docker-compose up --remove-orphans --build
