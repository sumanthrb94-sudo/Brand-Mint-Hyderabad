#!/usr/bin/env bash
# Prepare the GCP free-tier e2-micro for one small service.
#
#   curl -fsSL <raw url>/selfhost/setup-vm.sh | sudo bash
#
# Read it before you run it. Adds swap (a 1 GB box OOMs without it), installs
# Docker, and turns on unattended security updates. Idempotent.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "run with sudo"; exit 1; }

echo "==> swap (2 GB) — a 1 GB VM will OOM without it"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Swap only under real pressure; this disk is slow and free-tier limited.
  sysctl -w vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  echo "    already present"
fi

echo "==> packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg unattended-upgrades

echo "==> docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  # Cap the daemon's logs — this disk is 30 GB and free-tier limited.
  cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
  systemctl restart docker
  [[ -n "${SUDO_USER:-}" ]] && usermod -aG docker "$SUDO_USER" || true
else
  echo "    already installed"
fi

echo "==> unattended security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo
echo "Done. Log out and back in so the docker group applies."
echo "Next: set a GCP budget alert, then follow selfhost/README.md step 2 (Cloudflare Tunnel)."
free -h | head -3
