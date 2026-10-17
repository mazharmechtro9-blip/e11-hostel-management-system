FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

# This project uses npm. The inherited, unused Yarn apt source has a stale
# signing key and otherwise prevents Docker's feature from installing.
# Remove only that source; keep apt signature and TLS verification enabled.
USER root
RUN rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && rm -rf /var/lib/apt/lists/*
