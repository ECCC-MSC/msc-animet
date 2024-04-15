# develop stage
FROM node:18-slim as develop-stage
RUN apt-get update || : && apt-get install python3-all python3-pip python3-owslib -y
WORKDIR /app
COPY package*.json ./
RUN npm install -g @vue/cli
COPY . .

# build stage
FROM develop-stage as build-stage
## build layer name reference file
WORKDIR /app/scripts
RUN python3 generate_trees_layers_list.py
## build app
WORKDIR /app
RUN npm install
COPY deploy/nightly-docker/.env ./
RUN npm run build

# production stage
FROM nginx:1.23.3-alpine as production-stage
COPY --from=build-stage /app/dist/ /usr/share/nginx/html/
COPY deploy/nightly-docker/nginx/default.conf /etc/nginx/conf.d/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
