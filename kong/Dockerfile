# kong/Dockerfile
FROM kong:3.7

COPY plugins/inject-user-id /usr/local/share/lua/5.1/kong/plugins/inject-user-id

USER root
RUN echo "plugins = bundled,inject-user-id" >> /etc/kong/kong.conf.default
USER kong