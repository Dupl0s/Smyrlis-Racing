#!/bin/bash
# Kopiere alle CSV-Dateien aus Beispiel CSV in ein flaches Verzeichnis für Docker

mkdir -p /tmp/csv_data

# Kopiere alle CSV-Dateien rekursiv aus "Beispiel CSV"
find "Beispiel CSV" -name "*.CSV" -o -name "*.csv" | while read file; do
  cp "$file" /tmp/csv_data/
done

echo "✅ CSV-Dateien in /tmp/csv_data kopiert"
ls -la /tmp/csv_data
