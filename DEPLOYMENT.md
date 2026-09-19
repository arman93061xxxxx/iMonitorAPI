# Production Deployment Guide

This project is fully Dockerized, making deployment on any real server (like an AWS EC2 instance, DigitalOcean Droplet, or Linode) incredibly simple.

## Prerequisites
Your server only needs two things installed:
1. **Docker**
2. **Git**

## Step 1: Clone the Repository
SSH into your server and clone the project:
```bash
git clone https://github.com/arman93061xxxxx/iMonitorAPI.git
cd iMonitorAPI
```

## Step 2: Configure Environment Variables
You must provide real keys for production security.
```bash
cp .env.example .env
```
Open `.env` (using `nano .env` or `vim .env`) and update the following placeholders:
- `JWT_SECRET`: Generate a secure random string (e.g., using `openssl rand -hex 64`).
- `DATABASE_URL`: Change `postgres_password_change_me` to a highly secure password.
- **(Optional but recommended)** `OPENAI_API_KEY`: Add your real API key for incident analysis.
- **(Optional but recommended)** `EMAIL_*`: Add your SMTP credentials to receive live alerts.

> [!WARNING]
> Do **not** commit your `.env` file to version control. It is explicitly ignored by `.gitignore` for your safety.

## Step 3: Deploy the Stack
MonitorIQ consists of four containers (App, Postgres, Redis, Kafka). To build and launch the entire stack in the background:
```bash
docker compose up --build -d
```
Docker will pull the necessary images, build the Node.js application, apply the database schema migrations automatically, and start everything up.

## Step 4: Verify Deployment
To confirm the services are running properly:
```bash
docker compose ps
```
All services should show `Up`.

To check the application logs for any startup errors:
```bash
docker compose logs -f app
```

## Step 5: Initialize Administrator Account
Because migrations only create tables, initialize your administrator account securely (replace with your desired email and a strong password):
```bash
docker compose exec -e ADMIN_EMAIL="admin@monitoriq.com" -e ADMIN_PASSWORD="<YOUR_STRONG_PASSWORD>" app node prisma/seed.js
```
The password will be hashed with bcrypt (work factor 12) and never stored in plaintext or logged.

## Step 6: Access the Dashboard
Your application is now bound to port `3000`. 
Open your web browser and navigate to:
```
http://<your-server-ip>:3000/dashboard
```
Sign in using the administrator email and password you provided in Step 5.

> [!TIP]
> For a true production setup, it is highly recommended to place a reverse proxy (like NGINX or Caddy) in front of port 3000 to serve the application over HTTPS.

## Maintenance
To stop the application:
```bash
docker compose down
```

To view the monitoring database logs:
```bash
docker compose logs -f postgres
```
