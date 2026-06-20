#!/bin/bash
cd "$(dirname "$0")"
echo "Revlab preview running at: http://localhost:8091"
echo "The 3D hologram only works over a server (not by double-clicking the HTML)."
echo "Press Ctrl+C to stop."
open "http://localhost:8091"
python3 -m http.server 8091
