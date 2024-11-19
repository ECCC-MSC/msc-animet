# develop stage
FROM node:20-slim AS develop-stage
RUN apt-get update || : && apt-get install python3-all python3-pip python3-owslib jq -y
WORKDIR /app
COPY package*.json ./
COPY . .

# build stage
FROM develop-stage AS build-stage
## build layer name reference file
WORKDIR /app/scripts
RUN python3 generate_trees_layers_list.py && \
    # Extract keys from wms_sources_configs.json to verify generated tree and layer list files
    config_keys=$(jq -r 'keys[] | ascii_downcase' wms_sources_configs.json) && \
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
## build app
WORKDIR /app
RUN npm install
COPY deploy/nightly-docker/.env ./ 
RUN npm run build

# production stage
FROM nginx:1.23.3-alpine AS production-stage
COPY --from=build-stage /app/dist/ /usr/share/nginx/html/
COPY deploy/nightly-docker/nginx/default.conf /etc/nginx/conf.d/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
