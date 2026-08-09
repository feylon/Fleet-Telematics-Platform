#!/bin/sh
set -e
BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka:9092}"
BIN=/opt/kafka/bin/kafka-topics.sh
echo "waiting for kafka at $BOOTSTRAP"
for i in $(seq 1 60); do
  if $BIN --bootstrap-server "$BOOTSTRAP" --list >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
create() {
  $BIN --bootstrap-server "$BOOTSTRAP" --create --if-not-exists --topic "$1" --partitions "$2" --replication-factor 1 --config retention.ms="$3"
}
create telemetry.raw 12 604800000
create fleet.alerts 6 2592000000
create fleet.events 3 604800000
echo "topics:"
$BIN --bootstrap-server "$BOOTSTRAP" --list
