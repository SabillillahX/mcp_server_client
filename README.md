# This project is under development
## Docker Configuration
1. turn on docker
```bash
docker compose up -d
``` 

2. setup database
```bash
docker exec -it <docker_image_name> psql -U -root -d postgres
CREATE DATABASE kocak_db;
\c kocak_db;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL
);
\q
```

to turn off the docker compose without delete the database type:
```bash
docker-compose stop
```

## Setup .env
Send it via WhatsApp

## Run the server
```bash
npm run server:inspect
```
A browser would be open, find the "Tools" tab on the top of your browser, then "Run Tool"

