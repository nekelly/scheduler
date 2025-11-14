.PHONY: help build up down logs clean install-backend install-frontend

help:
	@echo "Available commands:"
	@echo "  make build              - Build all Docker images"
	@echo "  make up                 - Start all services"
	@echo "  make down               - Stop all services"
	@echo "  make logs               - View logs from all services"
	@echo "  make clean              - Remove all containers and volumes"
	@echo "  make install-backend    - Install backend dependencies"
	@echo "  make install-frontend   - Install frontend dependencies"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/build

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install
