# ─────────────────────────────────────────────────────────────
# Build React + Vite → xuất ra /app/dist
# Nginx được quản lý bởi docker-compose (service riêng)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage cuối: image nhỏ chỉ chứa dist để nginx mount
# ─────────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /dist

COPY --from=builder /app/dist .
