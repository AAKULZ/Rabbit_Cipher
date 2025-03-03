// Constants
const MAX_DATA_POINTS = 20;

// State variables
let sensorData = [];
let orientation = { x: 0, y: 0, z: 0 };
let accelChart, gyroChart;
let encryptionEnabled = true;
let rabbitKey = "00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF";
let rabbitIV = "01 23 45 67 89 AB CD EF";
let totalPackets = 0;
let successPackets = 0;
let failedPackets = 0;
let decryptTimes = [];
let rawDataLog = [];
let decryptedDataLog = [];

// Helper functions
function validateHexBytes(input, expectedLength) {
  const hexPattern = /^([0-9A-Fa-f]{2}\s)*[0-9A-Fa-f]{2}$/;
  if (!hexPattern.test(input)) {
    return false;
  }

  const bytes = input.split(/\s+/);
  return expectedLength ? bytes.length === expectedLength : true;
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.color = "red";
  }
  return false;
}

function clearErrors() {
  const errorElements = document.querySelectorAll(".error");
  errorElements.forEach((element) => {
    element.textContent = "";
  });
}

// Initialize Charts
function initCharts() {
  const ctx1 = document.getElementById("accelChart").getContext("2d");
  const ctx2 = document.getElementById("gyroChart").getContext("2d");

  // Shared chart options
  const chartOptions = {
    type: "line",
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "HH:mm:ss",
            displayFormats: {
              second: "HH:mm:ss",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  };

  // Accelerometer Chart
  accelChart = new Chart(ctx1, {
    ...chartOptions,
    data: {
      datasets: [
        {
          label: "X",
          data: [],
          borderColor: "#0066cc",
          backgroundColor: "rgba(0, 102, 204, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
        {
          label: "Y",
          data: [],
          borderColor: "#009900",
          backgroundColor: "rgba(0, 153, 0, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
        {
          label: "Z",
          data: [],
          borderColor: "#cc0000",
          backgroundColor: "rgba(204, 0, 0, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      ...chartOptions.options,
      scales: {
        ...chartOptions.options.scales,
        y: {
          ...chartOptions.options.scales.y,
          title: {
            display: true,
            text: "Acceleration (g)",
          },
        },
      },
    },
  });

  // Gyroscope Chart
  gyroChart = new Chart(ctx2, {
    ...chartOptions,
    data: {
      datasets: [
        {
          label: "X",
          data: [],
          borderColor: "#0066cc",
          backgroundColor: "rgba(0, 102, 204, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
        {
          label: "Y",
          data: [],
          borderColor: "#009900",
          backgroundColor: "rgba(0, 153, 0, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
        {
          label: "Z",
          data: [],
          borderColor: "#cc0000",
          backgroundColor: "rgba(204, 0, 0, 0.1)",
          pointRadius: 2,
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      ...chartOptions.options,
      scales: {
        ...chartOptions.options.scales,
        y: {
          ...chartOptions.options.scales.y,
          title: {
            display: true,
            text: "Angular Velocity (deg/s)",
          },
        },
      },
    },
  });
}

// Simulate MPU-6050 sensor data generation
function simulateSensorData() {
  // Generate random but realistic values
  const now = new Date();

  // Simulate accelerometer readings (typically between -2g and 2g)
  const accelX = parseFloat((Math.random() * 4 - 2).toFixed(3));
  const accelY = parseFloat((Math.random() * 4 - 2).toFixed(3));
  const accelZ = parseFloat((Math.random() * 4 - 2).toFixed(3));

  // Simulate gyroscope readings (typically between -250 and 250 deg/s)
  const gyroX = parseFloat((Math.random() * 500 - 250).toFixed(3));
  const gyroY = parseFloat((Math.random() * 500 - 250).toFixed(3));
  const gyroZ = parseFloat((Math.random() * 500 - 250).toFixed(3));

  // Simulate temperature (room temperature with slight variations)
  const temperature = parseFloat((23 + Math.random() * 2 - 1).toFixed(1));

  // Create data packet
  const sensorDataPacket = {
    timestamp: now.getTime(),
    accel: {
      x: accelX,
      y: accelY,
      z: accelZ,
    },
    gyro: {
      x: gyroX,
      y: gyroY,
      z: gyroZ,
    },
    temp: temperature,
  };

  // Convert to JSON string
  const jsonString = JSON.stringify(sensorDataPacket);

  // Encrypt the data if encryption is enabled
  if (encryptionEnabled) {
    encryptData(jsonString);
  } else {
    // If encryption is disabled, just process the raw data
    const fakeEncryptedHex = Array.from(new TextEncoder().encode(jsonString))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");

    processEncryptedData(fakeEncryptedHex, jsonString);
  }

  // Set timeout for next data simulation
  setTimeout(fetchSensorData, 1000);
}

// Function to fetch all 7 numerical values from the MPU6050 sensor via API
function fetchSensorData() {
  // API endpoint URL (adjust if your server is on a different IP)
  // Using the new /api/values endpoint for flat structure with all 7 values
  const apiUrl = "http://192.168.4.1:5000/api/sensor-data";

  // Fetch data from API
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Received sensor data:", data);

      // Create a standard format for data processing
      const sensorDataPacket = {
        timestamp: data.timestamp,
        accel: {
          x: data.accel.x,
          y: data.accel.y,
          z: data.accel.z,
        },
        gyro: {
          x: data.gyro.x,
          y: data.gyro.y,
          z: data.gyro.z,
        },
        temp: data.temp,
      };

      // Update your UI with the real sensor values
      updateDashboard(sensorDataPacket);

      // Process the data for encryption or other purposes
      if (encryptionEnabled) {
        const jsonString = JSON.stringify(sensorDataPacket);
        encryptData(jsonString);
      } else {
        // If encryption is disabled, just process the raw data
        const fakeEncryptedHex = Array.from(
          new TextEncoder().encode(JSON.stringify(sensorDataPacket))
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");

        processEncryptedData(
          fakeEncryptedHex,
          JSON.stringify(sensorDataPacket)
        );
      }

      // Set timeout for next data fetch (1 second)
      setTimeout(fetchSensorData, 1000);
    })
    .catch((error) => {
      console.error("Error fetching sensor data:", error);

      // In case of error, fall back to simulated data
      console.log("Falling back to simulated data");
      simulateSensorData();
    });
}

// Function to update your dashboard with the sensor data
function updateDashboard(data) {
  // Example: Update your dashboard elements with the real data
  if (document.getElementById("accel-x"))
    document.getElementById("accel-x").textContent = data.accel.x.toFixed(3);
  if (document.getElementById("accel-y"))
    document.getElementById("accel-y").textContent = data.accel.y.toFixed(3);
  if (document.getElementById("accel-z"))
    document.getElementById("accel-z").textContent = data.accel.z.toFixed(3);

  if (document.getElementById("gyro-x"))
    document.getElementById("gyro-x").textContent = data.gyro.x.toFixed(3);
  if (document.getElementById("gyro-y"))
    document.getElementById("gyro-y").textContent = data.gyro.y.toFixed(3);
  if (document.getElementById("gyro-z"))
    document.getElementById("gyro-z").textContent = data.gyro.z.toFixed(3);

  if (document.getElementById("temperature"))
    document.getElementById("temperature").textContent = data.temp.toFixed(1);

  // If you have charts or other visualizations, update them here
  updateCharts(data);
}

// Function to update any charts or visualizations
function updateCharts(data) {
  // Example: If you have charts, update them with the new data
  // This is just a placeholder - replace with your actual chart update code
  if (window.accelChart) {
    // Add new data points to the accelerometer chart
    window.accelChart.data.labels.push(new Date().toLocaleTimeString());
    window.accelChart.data.datasets[0].data.push(data.accel.x);
    window.accelChart.data.datasets[1].data.push(data.accel.y);
    window.accelChart.data.datasets[2].data.push(data.accel.z);

    // Remove old data points to keep the chart readable
    if (window.accelChart.data.labels.length > 20) {
      window.accelChart.data.labels.shift();
      window.accelChart.data.datasets[0].data.shift();
      window.accelChart.data.datasets[1].data.shift();
      window.accelChart.data.datasets[2].data.shift();
    }

    // Update the chart
    window.accelChart.update();
  }

  // Similar updates for gyro and temperature charts
}

// Function to encrypt data using PHP backend
function encryptData(message) {
  const startTime = performance.now();

  fetch("rabbit_cipher.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "encrypt",
      key: rabbitKey,
      iv: rabbitIV,
      message: message,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Encryption failed:", data.error);
        failedPackets++;
      } else {
        // Process the encrypted data
        processEncryptedData(data.result, message);

        // Get visualization data if available
        if (data.visualization) {
          document.getElementById("encryptionVisualization").textContent =
            data.visualization;
        }
      }
      updateStatistics();
    })
    .catch((error) => {
      console.error("Error calling PHP API:", error);
      failedPackets++;
      updateStatistics();
    });
}

// Function to decrypt data using PHP backend
function decryptData(hexData) {
  const startTime = performance.now();

  return fetch("rabbit_cipher.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "decrypt",
      key: rabbitKey,
      iv: rabbitIV,
      hexData: hexData,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      const endTime = performance.now();
      const decryptTime = endTime - startTime;
      decryptTimes.push(decryptTime);

      if (data.error) {
        console.error("Decryption failed:", data.error);
        failedPackets++;
        return {
          success: false,
          error: data.error,
          time: decryptTime,
        };
      } else {
        successPackets++;

        // Get visualization data if available
        if (data.visualization) {
          document.getElementById("decryptionVisualization").textContent =
            data.visualization;
        }

        return {
          success: true,
          data: JSON.parse(data.result),
          text: data.result,
          time: decryptTime,
        };
      }
    })
    .catch((error) => {
      console.error("Error calling PHP API:", error);
      failedPackets++;
      return {
        success: false,
        error: error.message,
      };
    });
}

// Process incoming encrypted data
function processEncryptedData(encryptedHexString, originalMessage = null) {
  totalPackets++;

  // Add to raw data log
  if (rawDataLog.length >= 20) rawDataLog.shift();
  rawDataLog.push({
    timestamp: new Date().toISOString(),
    data: encryptedHexString,
  });
  updateRawDataVisualization();

  // If encryption is enabled, decrypt the data
  if (encryptionEnabled) {
    decryptData(encryptedHexString).then((decryptResult) => {
      if (decryptResult.success) {
        processSensorData(decryptResult.data);

        // Add to decrypted data log
        if (decryptedDataLog.length >= 20) decryptedDataLog.shift();
        decryptedDataLog.push({
          timestamp: new Date().toISOString(),
          hexData: encryptedHexString,
          text: decryptResult.text,
        });
        updateDecryptedDataVisualization();
      }
      updateStatistics();
    });
  } else if (originalMessage) {
    // If encryption is disabled, use the original message
    try {
      const data = JSON.parse(originalMessage);
      processSensorData(data);

      // Add to decrypted data log
      if (decryptedDataLog.length >= 20) decryptedDataLog.shift();
      decryptedDataLog.push({
        timestamp: new Date().toISOString(),
        text: originalMessage,
      });
      updateDecryptedDataVisualization();

      successPackets++;
    } catch (error) {
      console.error("Error parsing data:", error);
      failedPackets++;
    }
    updateStatistics();
  }
}

// Process and display sensor data
function processSensorData(data) {
  // Add to data array with a maximum length
  sensorData.push(data);
  if (sensorData.length > MAX_DATA_POINTS) {
    sensorData.shift();
  }

  // Update current readings display
  document.getElementById("accelX").textContent = data.accel.x.toFixed(3);
  document.getElementById("accelY").textContent = data.accel.y.toFixed(3);
  document.getElementById("accelZ").textContent = data.accel.z.toFixed(3);

  document.getElementById("gyroX").textContent = data.gyro.x.toFixed(3);
  document.getElementById("gyroY").textContent = data.gyro.y.toFixed(3);
  document.getElementById("gyroZ").textContent = data.gyro.z.toFixed(3);

  document.getElementById("temperature").textContent = data.temp.toFixed(1);

  // Update orientation model
  updateOrientationModel(data.accel);

  // Update charts
  updateCharts();
}

// Update the 3D orientation of the device model
function updateOrientationModel(accel) {
  // Calculate orientation based on accelerometer readings
  // This is a simple representation and not actual 3D orientation calculation
  const deviceModel = document.getElementById("deviceModel");

  // Limit rotation to reasonable values
  const maxRotation = 35; // Max rotation in degrees

  // Calculate rotation angles based on accelerometer data
  const rotX = Math.max(-maxRotation, Math.min(maxRotation, accel.y * 25));
  const rotY = Math.max(-maxRotation, Math.min(maxRotation, accel.x * 25));

  // Apply rotation transformation
  deviceModel.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// Update the charts with new data
function updateCharts() {
  if (!accelChart || !gyroChart || sensorData.length === 0) return;

  // Update accelerometer chart data
  accelChart.data.datasets[0].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.accel.x,
  }));
  accelChart.data.datasets[1].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.accel.y,
  }));
  accelChart.data.datasets[2].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.accel.z,
  }));

  // Update gyroscope chart data
  gyroChart.data.datasets[0].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.gyro.x,
  }));
  gyroChart.data.datasets[1].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.gyro.y,
  }));
  gyroChart.data.datasets[2].data = sensorData.map((d) => ({
    x: d.timestamp,
    y: d.gyro.z,
  }));

  // Update charts
  accelChart.update();
  gyroChart.update();
}

// Update statistics display
function updateStatistics() {
  document.getElementById("totalPackets").textContent = totalPackets;
  document.getElementById("successPackets").textContent = successPackets;
  document.getElementById("failedPackets").textContent = failedPackets;

  // Calculate average decryption time
  const avgTime =
    decryptTimes.length > 0
      ? (decryptTimes.reduce((a, b) => a + b, 0) / decryptTimes.length).toFixed(
          2
        )
      : 0;
  document.getElementById("avgDecryptTime").textContent = avgTime + " ms";
}

// Update the raw data visualization
function updateRawDataVisualization() {
  if (rawDataLog.length === 0) return;

  let visualization = "--- RAW ENCRYPTED DATA STREAM ---\n\n";
  rawDataLog.forEach((entry, index) => {
    visualization += `[${entry.timestamp}] Packet ${
      totalPackets - (rawDataLog.length - 1 - index)
    }:\n`;
    visualization += `${entry.data}\n\n`;
  });

  document.getElementById("rawDataVisualization").textContent = visualization;
}

// Update the decrypted data visualization
function updateDecryptedDataVisualization() {
  if (decryptedDataLog.length === 0) return;

  let visualization = "--- DECRYPTED DATA STREAM ---\n\n";
  decryptedDataLog.forEach((entry, index) => {
    visualization += `[${entry.timestamp}] Packet ${
      totalPackets - (decryptedDataLog.length - 1 - index)
    }:\n`;
    if (entry.hexData) {
      visualization += `Hex: ${entry.hexData}\n`;
    }
    visualization += `JSON: ${entry.text}\n\n`;
  });

  document.getElementById("decryptedDataVisualization").textContent =
    visualization;
}

// Get visualization from PHP
function requestVisualization() {
  fetch("rabbit_cipher.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "visualize",
      key: rabbitKey,
      iv: rabbitIV,
      message: "Test message for visualization",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Visualization request failed:", data.error);
      } else {
        document.getElementById("stateVisualization").textContent = data.result;
      }
    })
    .catch((error) => {
      console.error("Error calling PHP API:", error);
    });
}

// Initialize Dashboard
function initDashboard() {
  // Initialize charts
  initCharts();

  // Start simulating sensor data
  fetchSensorData();

  // Request initial visualization
  requestVisualization();

  // Handle tab switching
  const tabs = document.querySelectorAll(".tabs .tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");

      // Remove active class from all tabs and tab contents
      document
        .querySelectorAll(".tabs .tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      this.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });

  // Handle sub-tabs in visualization
  const subTabs = document.querySelectorAll("[data-subtab]");
  subTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.getAttribute("data-subtab");
      document
        .querySelectorAll("[data-subtab]")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll("#visualization-tab .tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to clicked sub-tab and corresponding content
      this.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });

  // Handle modal tabs
  const modalTabs = document.querySelectorAll("[data-modal-tab]");
  modalTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.getAttribute("data-modal-tab");

      // Remove active class from all modal tabs and modal tab contents
      document
        .querySelectorAll("[data-modal-tab]")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".modal .tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to clicked modal tab and corresponding content
      this.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });

  // Handle encryption settings
  document
    .getElementById("encryptionToggle")
    .addEventListener("change", function () {
      encryptionEnabled = this.checked;
      document.getElementById("encryptionBadge").textContent = encryptionEnabled
        ? "Encrypted"
        : "Unencrypted";
      document.getElementById("encryptionStatus").className = encryptionEnabled
        ? "status-indicator status-active"
        : "status-indicator status-inactive";
    });

  // Apply configuration button
  document.getElementById("applyConfig").addEventListener("click", function () {
    clearErrors();
    let isValid = true;

    // Validate key
    const keyInput = document.getElementById("key").value.trim();
    if (!keyInput) {
      isValid = showError("keyError", "Key is required");
    } else if (!validateHexBytes(keyInput, 16)) {
      isValid = showError(
        "keyError",
        "Key must be exactly 16 bytes in hex format"
      );
    }

    // Validate IV
    const ivInput = document.getElementById("iv").value.trim();
    if (!ivInput) {
      isValid = showError("ivError", "IV is required");
    } else if (!validateHexBytes(ivInput, 8)) {
      isValid = showError(
        "ivError",
        "IV must be exactly 8 bytes in hex format"
      );
    }

    if (isValid) {
      rabbitKey = keyInput;
      rabbitIV = ivInput;

      // Reset statistics
      totalPackets = 0;
      successPackets = 0;
      failedPackets = 0;
      decryptTimes = [];
      updateStatistics();

      // Request updated visualization
      requestVisualization();

      // Show success message
      alert("Configuration applied successfully!");
    }
  });

  // Reset configuration button
  document.getElementById("resetConfig").addEventListener("click", function () {
    document.getElementById("key").value =
      "00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF";
    document.getElementById("iv").value = "01 23 45 67 89 AB CD EF";
    clearErrors();
  });

  // View raw data stream button
  document
    .getElementById("viewDataStream")
    .addEventListener("click", function () {
      document.getElementById("dataStreamModal").style.display = "block";
      updateRawDataVisualization();
      updateDecryptedDataVisualization();
    });

  // Close modal button
  document.querySelector(".close-modal").addEventListener("click", function () {
    document.getElementById("dataStreamModal").style.display = "none";
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", function (event) {
    const modal = document.getElementById("dataStreamModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Helper function to convert hex string to byte array
  function hexStringToByteArray(hexString) {
    const bytes = hexString.split(/\s+/).map((hex) => parseInt(hex, 16));
    return bytes;
  }
}

// Start the dashboard when the page loads
document.addEventListener("DOMContentLoaded", initDashboard);
