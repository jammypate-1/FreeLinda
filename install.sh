#!/bin/bash

echo "=========================================="
echo "        FreeLinda Installer"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[OK] Node.js found:"
node --version
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not available."
    echo "Please ensure npm is installed with Node.js."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[OK] npm found:"
npm --version
echo ""

# Install dependencies
echo "[1/2] Installing dependencies..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Failed to install dependencies."
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "[OK] Dependencies installed successfully."
echo ""

# Start the dev server on port 3000
echo "[2/2] Starting FreeLinda on port 3000..."
echo ""
echo "Open your browser and go to: http://localhost:3000"
echo "Press Ctrl+C to stop the server."
echo ""
npm run dev

read -p "Press Enter to exit..."
