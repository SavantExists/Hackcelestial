const path = require("path");
const { spawn } = require("child_process");

const workerPath = path.join(__dirname, "..", "..", "python-service", "recommendation.py");
let worker = null;

function startWorker() {
  if (worker && !worker.killed) return worker;

  const command = process.env.PYTHON_EXECUTABLE || (process.platform === "win32" ? "py" : "python3");
  const args = process.platform === "win32" && !process.env.PYTHON_EXECUTABLE
    ? ["-3", workerPath]
    : [workerPath];

  worker = spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, TOKENIZERS_PARALLELISM: "false" }
  });

  worker.on("error", error => {
    worker = null;
    console.error(`Python service could not start: ${error.message}`);
  });
  
  worker.on("exit", code => {
    worker = null;
    console.error(`Python service stopped with code ${code}`);
  });
  return worker;
}

// Start worker proactively
startWorker();

async function generateItinerary(payload) {
  if (!worker || worker.killed) startWorker();
  
  // simple retry mechanism to wait for flask to start
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Python API returned error");
      return await response.json();
    } catch (e) {
      if (i === 4) throw new Error("The semantic recommendation model took too long to respond or failed.");
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { generateItinerary, startWorker };

