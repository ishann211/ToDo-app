# Todo App – Event-Driven Full Stack Application

This project is a full-stack Todo application designed using modern backend and DevOps practices.  
It demonstrates authentication, REST APIs, event-driven architecture with RabbitMQ, asynchronous consumers, WebSocket notifications, and full containerization using Docker and Docker Compose.

The system is built to be reproducible, decoupled, and easy to run on any machine with Docker installed.

---

## Features

- User registration and login using JWT authentication
- Create, update, and manage todo items
- Event-driven backend using RabbitMQ
- Asynchronous notification processing via a separate consumer service
- Real-time notifications delivered to the frontend using WebSockets
- Fully containerized stack with Docker Compose
- Prebuilt Docker images hosted on Docker Hub
- Environment-based configuration with no hardcoded secrets

---

## Architecture Overview

The application follows an event-driven microservice-style architecture.

### Services

- **Frontend**
  - React single-page application
  - Served via Nginx
  - Communicates with backend via `/api`
  - Receives notifications via WebSocket

- **Backend API**
  - Node.js + Express
  - Handles authentication and todo CRUD operations
  - Publishes domain events (`TodoCreated`) to RabbitMQ

- **Notification Consumer**
  - Independent Node.js service
  - Consumes events from RabbitMQ
  - Simulates background processing
  - Broadcasts notifications to connected WebSocket clients

- **RabbitMQ**
  - Message broker for asynchronous event delivery
  - Decouples API from background processing

- **MySQL**
  - Persistent relational database
  - Runs in Docker with volume-based storage

All services communicate over a private Docker network.

---

## Event Flow (Todo Creation)

1. Frontend sends `POST /api/todos`
2. Backend validates JWT and inserts todo into MySQL
3. Backend publishes a `TodoCreated` event to RabbitMQ
4. API immediately returns `201 Created` (non-blocking)
5. Notification consumer receives the event asynchronously
6. Consumer processes the event and sends a WebSocket notification
7. Frontend displays the notification in real time

This proves decoupling, asynchronicity, and failure isolation.

---

## Dockerized Setup

The entire stack runs using Docker Compose and prebuilt images from Docker Hub.

### Docker Hub Images

| Image | Description |
|-----|------------|
| `ishanthathsara/todo-backend:1.0` | Node.js API server |
| `ishanthathsara/todo-consumer:1.0` | WebSocket notification service |
| `ishanthathsara/todo-frontend:1.0` | React app served via Nginx |

No local builds are required.

---

## Prerequisites

- Docker
- Docker Compose

---

## Running the Application

### 1. Clone the repository

```bash
git clone <repository-url>
cd todo-app
```
Go to github repository.
```bash
cp .env.example .env
```
Fill in the required values in .env.
```bash
docker-compose up -d
```
Run the docker compose file.
You'll find frontend in `http://localhost`.
Check RabbitMQ Management UI in `http://localhost:15672`
RabbitMQ default credentials:
Username: guest
Password: guest
```bash
docker-compose down
```
To stop docker compose.
