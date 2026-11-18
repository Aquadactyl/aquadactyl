#!/bin/sh
set -eu
# Some Dokploy hosts are themselves in an unprivileged user namespace. Only
# delegate IDs present in our parent mapping; never delegate UID/GID 0 or the
# runtime's real ID. These files stay root-owned before dropping privileges.
if [ "$(id -u)" = 0 ]; then
  for kind in uid gid; do
    mapping="/proc/self/${kind}_map"
    if awk '$1 <= 100000 && $1 + $3 >= 165536 { found=1 } END { exit !found }' "$mapping"; then
      printf 'rootless:100000:65536\n' > "/etc/sub${kind}"
    else
      awk '
        BEGIN { remaining=65534 }
        {
          first=$1; last=$1+$3-1
          if (first < 1) first=1
          for (segment=0; segment<2; segment++) {
            start=first; end=last
            if (segment==0 && end>999) end=999
            if (segment==1 && start<1001) start=1001
            size=end-start+1
            if (size>remaining) size=remaining
            if (size>0) { printf "rootless:%.0f:%.0f\n", start, size; remaining-=size }
          }
        }
        END { if (remaining>0) exit 1 }
      ' "$mapping" > "/etc/sub${kind}" || {
        echo "Demo runtime needs at least 65536 mapped parent user/group IDs." >&2
        exit 1
      }
    fi
    chown 0:0 "/etc/sub${kind}"
    chmod 644 "/etc/sub${kind}"
  done
  exec su-exec 1000:1000 "$0" "$@"
fi
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
