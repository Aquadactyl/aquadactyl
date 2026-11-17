FROM ghcr.io/aquadactyl/manta:v1.0-beta AS manta
FROM docker:29-dind-rootless
USER root
COPY --from=manta /usr/bin/wings /usr/local/bin/manta
COPY deploy/demo/manta-entrypoint.sh /usr/local/bin/demo-manta-entrypoint
COPY deploy/demo/runtime.Dockerfile /opt/demo-runtime/Dockerfile
COPY deploy/demo/runtime-entrypoint.sh /opt/demo-runtime/entrypoint.sh
RUN chmod 755 /usr/local/bin/demo-manta-entrypoint \
    && mkdir -p /home/rootless/demo-data /etc/pterodactyl \
    && chown -R 1000:1000 /home/rootless/demo-data /etc/pterodactyl
USER rootless
ENV DOCKER_HOST=unix:///home/rootless/docker.sock
ENTRYPOINT ["/usr/local/bin/demo-manta-entrypoint"]
