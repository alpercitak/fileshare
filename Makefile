dev:
	pnpm dev

deploy:
	docker-compose up --remove-orphans --build
