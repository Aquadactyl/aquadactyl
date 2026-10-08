FROM busybox:1.37.0-musl AS healthcheck

FROM ghcr.io/pterodactyl/wings:v1.13.3
# The upstream distroless image has no shell or TCP health-check utility.
COPY --from=healthcheck /bin/busybox /usr/local/bin/busybox
