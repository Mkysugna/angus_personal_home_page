// Extract MediaPipe tools directly from the globally loaded bundle
const { FilesetResolver, HandLandmarker } = mpTasksVision;

const video = document.getElementById("webcam");
const statusText = document.getElementById("status");
let handLandmarker = undefined;
let lastVideoTime = -1;

// 1. Initialize MediaPipe Hand Landmarker
async function initializeHandLandmarker() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://jsdelivr.net"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://googleapis.com",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });
        
        statusText.innerText = "Models loaded! Starting camera...";
        startCamera();
    } catch (error) {
        statusText.innerText = "Error loading AI models. Check browser console.";
        console.error("MediaPipe initialization failed:", error);
    }
}

// 2. Start user webcam
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictLoop);
        statusText.innerText = "Tracking Active! Open developer console to see data.";
    })
    .catch((err) => {
        statusText.innerText = "Camera access denied or not found.";
        console.error("Camera error: ", err);
    });
}

// 3. Continuous tracking loop
async function predictLoop() {
    let nowInMs = Date.now();
    
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        if (handLandmarker) {
            const results = handLandmarker.detectForVideo(video, nowInMs);
            
            // Log landmarks to console if hands are detected
            if (results.landmarks && results.landmarks.length > 0) {
                console.log("Detected Hand Coordinates:", results.landmarks);
            }
        }
    }
    
    // Run frame by frame
    window.requestAnimationFrame(predictLoop);
}

// Run the application
initializeHandLandmarker();
