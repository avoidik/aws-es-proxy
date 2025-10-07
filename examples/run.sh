#!/bin/bash

DOCKER_DEFAULT_PLATFORM='linux/arm64' \
    docker run \
    -d \
    --rm \
    --name elasticsearch-test \
    -p 9200:9200 \
    --ulimit memlock=-1:-1 \
    -e 'node.name=es' \
    -e 'http.host=0.0.0.0' \
    -e 'http.port=9200' \
    -e 'discovery.type=single-node' \
    -e 'xpack.security.enabled=false' \
    -e 'xpack.ml.use_auto_machine_memory_percent=true' \
    -e 'bootstrap.memory_lock=true' \
    -e 'ingest.geoip.downloader.enabled=false' \
    -e 'xpack.ml.enabled=false' \
    -e 'xpack.watcher.enabled=false' \
    -e 'xpack.graph.enabled=false' \
    -e 'logger.level=ERROR' \
    -e 'xpack.monitoring.collection.enabled=true' \
    -e 'action.destructive_requires_name=false' \
    -e 'xpack.license.self_generated.type=basic' \
    -e 'ES_JAVA_OPTS=-Xms1g -Xmx1g' \
    -e 'ELASTIC_PASSWORD=elastic' \
        docker.elastic.co/elasticsearch/elasticsearch:9.1.5
