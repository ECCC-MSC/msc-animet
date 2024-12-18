# develop stage
FROM node:20-slim AS develop-stage
RUN apt-get update || : && apt-get install python3-all python3-pip python3-owslib python3-certifi jq -y
WORKDIR /app
COPY package*.json ./
COPY . .

# build stage
FROM develop-stage AS build-stage
WORKDIR /app/scripts
## cert must be copied over to app repo first
ARG CERT_FILE=_ICM_Root.crt
COPY $CERT_FILE /usr/local/share/ca-certificates/
RUN ln -sf /usr/local/share/ca-certificates/_ICM_Root.crt /etc/ssl/certs/_ICM_Root.pem && \
    update-ca-certificates
## ENV variables from host server
ARG ANIMET_NIGHTLY GEOMET_CLIMATE_NIGHTLY_URL GEOMET_WEATHER_NIGHTLY_URL GEOMET_MAPPROXY_NIGHTLY_URL
ENV ANIMET_NIGHTLY=${ANIMET_NIGHTLY} \
    GEOMET_CLIMATE_NIGHTLY_URL=${GEOMET_CLIMATE_NIGHTLY_URL} \
    GEOMET_WEATHER_NIGHTLY_URL=${GEOMET_WEATHER_NIGHTLY_URL} \
    GEOMET_MAPPROXY_NIGHTLY_URL=${GEOMET_MAPPROXY_NIGHTLY_URL}
RUN python3 generate_trees_layers_list.py && \
    # Extract keys from wms_sources_configs.json to verify generated tree and layer list files
    config_keys=$(jq -r 'keys[] | ascii_downcase' "/app/src/assets/wms_sources_configs.json") && \
    missing_files=0 && \
    for key in $config_keys; do \
        for lang in en fr; do \
            js_file="../src/assets/trees/tree_${lang}_${key}.js"; \
            json_file="../src/locales/${lang}/layers_${key}.json"; \
            if [ ! -f "$js_file" ]; then \
                echo "Missing: $js_file"; \
                missing_files=$((missing_files+1)); \
            fi; \
            if [ ! -f "$json_file" ]; then \
                echo "Missing: $json_file"; \
                missing_files=$((missing_files+1)); \
            fi; \
        done; \
    done && \
    # Exit if there are missing files
    if [ "$missing_files" -gt 0 ]; then \
        echo "Error: $missing_files files are missing!" && exit 1; \
    fi && \
    echo "All expected files are generated successfully."

WORKDIR /app
RUN npm install
COPY deploy/nightly-docker/.env ./
RUN npm run build

# production stage - Comment out this section to disable production stage
# >>>>>>>>>>>>>>>>>>
FROM nginx:1.23.3-alpine AS production-stage
COPY --from=build-stage /app/dist/ /usr/share/nginx/html/
COPY deploy/nightly-docker/nginx/default.conf /etc/nginx/conf.d/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# <<<<<<<<<<<<<<<<<<

# production stage (without stage seperation for debugging purposes) - Uncomment out this section to disable production stage
# >>>>>>>>>>>>>>>>>>
# RUN apt-get install -y nginx && \
#     rm -rf /var/lib/apt/lists/*
# COPY dist/ /usr/share/nginx/html/
# COPY deploy/nightly-docker/nginx/default.conf /etc/nginx/conf.d/
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
# <<<<<<<<<<<<<<<<<<