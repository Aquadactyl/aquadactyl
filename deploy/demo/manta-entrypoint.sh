#!/bin/sh
set -eu
export XDG_RUNTIME_DIR=/run/user/1000
mkdir -p "$XDG_RUNTIME_DIR"
rm -f /home/rootless/docker.sock /home/rootless/dockerd.pid
rootlesskit --net=slirp4netns --mtu=1500 --disable-host-loopback \
  --port-driver=builtin --copy-up=/etc --copy-up=/run \
  dockerd --host=unix:///home/rootless/docker.sock --data-root=/home/rootless/.local/share/docker \
  --exec-root=/home/rootless/docker-exec --pidfile=/home/rootless/dockerd.pid \
  --storage-driver=vfs --ip6tables=false &
docker_pid=$!
trap 'kill "$docker_pid" 2>/dev/null || true' EXIT INT TERM
until docker info >/dev/null 2>&1; do
  kill -0 "$docker_pid" || exit 1
  sleep 2
done
if ! docker image inspect aquadactyl-demo-runtime:1 >/dev/null 2>&1; then
  docker build --tag aquadactyl-demo-runtime:1 /opt/demo-runtime
fi
exec /usr/local/bin/manta --config /etc/pterodactyl/config.yml
