.PHONY: help install dev build start test clean docker-up docker-down

help: ## Show this help message
	@echo Usage: make [target]
	@echo.
	@echo Available targets:
	@echo   install       Install dependencies
	@echo   dev           Start development server
	@echo   build         Build for production
	@echo   start         Start production server
	@echo   test          Run tests
	@echo   db-migrate    Run database migrations
	@echo   db-seed       Seed database
	@echo   clean         Clean build artifacts
	@echo   docker-up     Start Docker services
	@echo   docker-down   Stop Docker services
	@echo   logs          View application logs

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

test: ## Run tests
	npm test

db-migrate: ## Run database migrations
	npm run db:migrate

db-seed: ## Seed database
	npm run db:seed

clean: ## Clean build artifacts
	rmdir /s /q dist 2>nul || echo Already clean
	docker-compose down -v

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

logs: ## View application logs
	docker-compose logs -f
