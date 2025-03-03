#!/bin/bash
# First attempt to install from offline repository if available
sudo apt-get update
sudo apt-get install -y $(cat packages.txt)

# If the above fails, compile from source
if [ $? -ne 0 ]; then
  echo "Package installation failed. You may need to connect to the internet or try installing the packages manually."
fi

# Compile the code if libraries are installed
gcc -o mpu6050_server mpu6050_server.c -lwiringPi -lmicrohttpd -ljansson -lm

if [ $? -eq 0 ]; then
  echo "Compilation successful. Run with: sudo ./mpu6050_server"
else
  echo "Compilation failed. Please ensure all required libraries are installed."
fi