# Etapa 1: build de la SPA con Vite
FROM node:20-alpine AS build
WORKDIR /app

# Vite compila las variables VITE_* dentro del bundle en este paso — hay que
# pasarla como build arg, no alcanza con tenerla en el .env local (que ni siquiera
# se sube al build, está en .dockerignore).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: servir los archivos estáticos con nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
