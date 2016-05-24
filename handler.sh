#!/usr/bin/env bash

START_SCRIPT="servantjs-api-server.js"
INSTALL_DIR="/usr/local/servantjs/api-server"

cd ${INSTALL_DIR}

function start {
    forever start ${START_SCRIPT}
}

function stop {
    forever stop ${START_SCRIPT}
}

function status {
    forever list | grep "pid\|${START_SCRIPT}"
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: servant-api-server <start|stop|restart|status>"
    exit 1
    ;;

esac