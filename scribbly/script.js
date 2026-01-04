/**
 * Scribbly Robot Simulator
 * Uses kinematics.js (Rigid Bent Arm Model, Y+ Down)
 */

// --- Constants & Config ---
KINEMATICS.setConfig({
    SHOULDER_SEP: 140,
    L_BODY: 50,
    L_BLUE: 80,
    A_BEND: 120,
    A_BEND: 120,
    L_MAIN: 180,
    // Safe Area
    SAFE_W: 100,
    SAFE_H: 100,
    SAFE_X: 0,
    SAFE_Y: 200
});

// --- State ---
const state = {
    dL: 0,
    dR: 0,
    penDown: false,
    path: [], // Array of {x, y, valid: boolean}
    kRes: null,
    speed: 1, // Steps per frame
    isPaused: false,
    totalSteps: 0
};

// --- DOM Elements ---
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const ui = {
    thetaL: document.getElementById('thetaL'),
    thetaR: document.getElementById('thetaR'),
    valThetaL: document.getElementById('val-thetaL'),
    valThetaR: document.getElementById('val-thetaR'),
    posDisplay: document.getElementById('pos-display'),
    btnClear: document.getElementById('btn-clear')
};

// --- Initialization ---
function init() {
    canvas.width = 800;
    canvas.height = 600;

    setupEventListeners();

    if (ui.thetaL) {
        ui.thetaL.min = "-30"; ui.thetaL.max = "60";
        state.dL = parseFloat(ui.thetaL.value);
    }
    if (ui.thetaR) {
        ui.thetaR.min = "-30"; ui.thetaR.max = "60";
        state.dR = parseFloat(ui.thetaR.value);
    }

    updateKinematics();
    requestAnimationFrame(loop);
}

// --- Transformations ---
function worldToScreen(x, y) {
    const ox = canvas.width / 2;
    const oy = 100;
    return { x: ox + x, y: oy + y };
}

// --- Kinematics ---
function updateKinematics() {
    // Only update from state angles if we aren't animating invalid points?
    // Actually, state.dL/dR are always the valid servo angles.
    // If we hit an invalid point, we don't update dL/dR, so the robot stays put.
    const res = KINEMATICS.forward(state.dL, state.dR);

    // Check if current forward result matches the constraints?
    // Forward doesn't enforce input constraints usually, but inverse does.
    // We assume state.dL/dR are valid.

    state.kRes = res;

    if (res) {
        if (ui.valThetaL) ui.valThetaL.textContent = `${state.dL.toFixed(0)}°`;
        if (ui.valThetaR) ui.valThetaR.textContent = `${state.dR.toFixed(0)}°`;
        if (ui.posDisplay) ui.posDisplay.textContent = `(${res.P.x.toFixed(1)}, ${res.P.y.toFixed(1)})`;

        // Manual Drawing (Manual Slider Move)
        // If pen is down and we are MANUALLY moving, we track it.
        // But how do we distinguish manual vs animation? 
        // We can just rely on the fact that animationQueue pushes to path explicitly.
        // So we ONLY push here if animationQueue is empty?
        // Or if we are in "Manual Mode".
        // Let's keep it simple: unique paths.
        // Actually, for this "Invalid Path" feature, we prefer the Animation Queue to handle pushing points.
        // If manual, we push here.
        if (state.penDown && animationQueue.length === 0) {
            // For manual, we assume valid if we are here (since sliders are limited)
            state.path.push({ ...res.P, valid: true });
        }
    } else {
        if (ui.posDisplay) ui.posDisplay.textContent = "INVALID / UNREACHABLE";
    }
}

// --- Rendering ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // ctx.moveTo(0, 500); ctx.lineTo(800, 500); 
    ctx.stroke();

    // Draw Safe Area
    const sw = KINEMATICS.CONFIG.SAFE_W;
    const sh = KINEMATICS.CONFIG.SAFE_H;
    const sx = KINEMATICS.CONFIG.SAFE_X;
    const sy = KINEMATICS.CONFIG.SAFE_Y;
    const sa_tl = worldToScreen(sx - sw / 2, sy - sh / 2);
    const sa_br = worldToScreen(sx + sw / 2, sy + sh / 2);

    ctx.strokeStyle = '#e5e7eb';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeRect(sa_tl.x, sa_tl.y, sa_br.x - sa_tl.x, sa_br.y - sa_tl.y);
    ctx.setLineDash([]);

    // Draw Path
    if (state.path.length > 0) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // We draw segments. 
        // Optimization: draw continuous separate paths for color? 
        // Or stroke each segment. Stroke each segment is easier to code.
        for (let i = 1; i < state.path.length; i++) {
            const p0 = state.path[i - 1];
            const p1 = state.path[i];

            // Skip large jumps (pen lift)? 
            // We only pushed points when penDown=true. 
            // In startShapeBuffer we clear path.
            // If we supported multiple strokes we'd need a separator.
            // For now single stroke.

            if (!p1.penDown) {
                continue;
            }

            const s0 = worldToScreen(p0.x, p0.y);
            const s1 = worldToScreen(p1.x, p1.y);

            ctx.beginPath();
            ctx.moveTo(s0.x, s0.y);
            ctx.lineTo(s1.x, s1.y);

            if (p1.valid) {
                ctx.strokeStyle = '#000000';
            } else {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            }
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    if (!state.kRes) return;
    const { P, SL, SR, EL_Virtual, ER_Virtual } = state.kRes;
    const sSL = worldToScreen(SL.x, SL.y);
    const sSR = worldToScreen(SR.x, SR.y);
    const sP = worldToScreen(P.x, P.y);

    // Draw Arms (same as before) ...
    // ... Reconstruct Body Arms
    const radL = (180 - state.dL) * Math.PI / 180;
    const sJ1L = worldToScreen(SL.x + KINEMATICS.CONFIG.L_BODY * Math.cos(radL), SL.y + KINEMATICS.CONFIG.L_BODY * Math.sin(radL));

    const radR = (0 + state.dR) * Math.PI / 180;
    const sJ1R = worldToScreen(SR.x + KINEMATICS.CONFIG.L_BODY * Math.cos(radR), SR.y + KINEMATICS.CONFIG.L_BODY * Math.sin(radR));

    const sEL = worldToScreen(EL_Virtual.x, EL_Virtual.y);
    const sER = worldToScreen(ER_Virtual.x, ER_Virtual.y);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Left Chain
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sSL.x, sSL.y); ctx.lineTo(sJ1L.x, sJ1L.y); ctx.stroke();

    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sJ1L.x, sJ1L.y); ctx.lineTo(sEL.x, sEL.y); ctx.stroke();

    // Right Chain
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sSR.x, sSR.y); ctx.lineTo(sJ1R.x, sJ1R.y); ctx.stroke();

    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sJ1R.x, sJ1R.y); ctx.lineTo(sER.x, sER.y); ctx.stroke();

    // Main Arms
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sEL.x, sEL.y); ctx.lineTo(sP.x, sP.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sER.x, sER.y); ctx.lineTo(sP.x, sP.y); ctx.stroke();

    // Joints
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(sEL.x, sEL.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sER.x, sER.y, 4, 0, Math.PI * 2); ctx.fill();

    // Pen
    ctx.fillStyle = state.penDown ? '#dc2626' : '#9ca3af';
    ctx.beginPath(); ctx.arc(sP.x, sP.y, 6, 0, Math.PI * 2); ctx.fill();
}

// --- Animation Queue ---
let animationQueue = [];

function runAnimation() {
    if (animationQueue.length === 0) {
        state.penDown = false;
        return;
    }
    const step = animationQueue.shift();
    const wasPenDown = state.penDown; // Track previous state
    state.penDown = step.penDown;

    // Movement Logic
    const inputs = KINEMATICS.inverse(step.x, step.y);
    if (inputs) {
        state.dL = inputs.thetaL;
        state.dR = inputs.thetaR;
        ui.thetaL.value = state.dL;
        ui.thetaR.value = state.dR;

        // Push to path regardless of pen state to visualize travel
        state.path.push({ x: step.x, y: step.y, valid: true, penDown: state.penDown });

    } else {
        // Unreachable
        // If pen is down, we might want to show it as invalid. 
        // If pen is up, we just ignore? 
        // Let's show invalid point if pen is down.
        if (state.penDown) {
            state.path.push({ x: step.x, y: step.y, valid: false, penDown: state.penDown });
        }
    }
}

function startShapeBuffer(points) {
    state.path = [];
    state.penDown = false;
    animationQueue = [];
    if (points.length > 0) {
        // Lead-in (move to start without drawing? Or just jump?)
        // Let's just jump logic for simplicity or insert a move step.
        // For valid visualization, let's just push drawing steps.
        for (const p of points) {
            animationQueue.push({ x: p.x, y: p.y, penDown: true });
        }
    }

    // Adaptive Speed Calculation
    // Target duration: ~3 seconds @ 60fps = 180 frames
    const TARGET_FRAMES = 180;
    state.speed = Math.ceil(animationQueue.length / TARGET_FRAMES);

    // Clamp limits
    if (state.speed < 1) state.speed = 1;
    if (state.speed > 50) state.speed = 50; // Cap max speed to avoid lag/skips

    // Init Progress
    state.totalSteps = animationQueue.length;
    state.isPaused = false;

    // Show Controls
    const controls = document.getElementById('playback-controls');
    if (controls) controls.style.display = 'block';
    updatePlaybackUI();
}

function generateCircle(cx, cy, r, steps = 60) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
}

function loop() {
    // Logic: If Paused, do nothing but draw
    if (!state.isPaused) {
        // Adaptive Speed
        for (let i = 0; i < state.speed; i++) {
            if (animationQueue.length > 0) runAnimation();
        }
    }

    // Update Progress Bar
    if (state.totalSteps > 0) {
        const progress = document.getElementById('progress-bar');
        if (progress) {
            const completed = state.totalSteps - animationQueue.length;
            progress.value = (completed / state.totalSteps) * 100;
        }
    }

    updateKinematics();
    draw();
    requestAnimationFrame(loop);
}

function updatePlaybackUI() {
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.textContent = state.isPaused ? "Resume" : "Pause";
        btnPause.style.backgroundColor = state.isPaused ? "#10b981" : "#f59e0b"; // Green if Resume, Amber if Pause
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    ui.thetaL.addEventListener('input', (e) => {
        state.dL = parseFloat(e.target.value);
        animationQueue = [];
    });
    ui.thetaR.addEventListener('input', (e) => {
        state.dR = parseFloat(e.target.value);
        animationQueue = [];
    });

    const btnPen = document.getElementById('btn-pen-toggle');
    if (btnPen) {
        btnPen.addEventListener('click', () => {
            state.penDown = !state.penDown;
            btnPen.textContent = state.penDown ? "Pen Up" : "Pen Down";
            // If we are just toggling, we might want to ensure the current position is pushed if down?
            // The updateKinematics loop handles manual drawing if penDown is true.
        });
    }

    ui.btnClear.addEventListener('click', () => {
        state.path = [];
        state.penDown = false;
        ctx.clearRect(0, 0, 800, 600);
    });

    document.getElementById('btn-circle')?.addEventListener('click', () => {
        // Draw circle at Y=200
        startShapeBuffer(generateCircle(0, 200, 40));
    });

    document.getElementById('btn-rect')?.addEventListener('click', () => {
        const w = 60, h = 40, cx = 0, cy = 200;
        const corners = [
            { x: cx - w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy + h / 2 },
            { x: cx - w / 2, y: cy + h / 2 },
            { x: cx - w / 2, y: cy - h / 2 }
        ];

        const pts = [];
        for (let i = 0; i < corners.length - 1; i++) {
            pts.push(...interpolateLine(corners[i], corners[i + 1]));
        }
        startShapeBuffer(pts);
    });

    document.getElementById('btn-line')?.addEventListener('click', () => {
        const p0 = { x: -50, y: 200 };
        const p1 = { x: 50, y: 200 };
        startShapeBuffer(interpolateLine(p0, p1));
    });

    // SVG Handling
    const fileInput = document.getElementById('file-svg');
    const drawBtn = document.getElementById('btn-draw-svg');
    let loadedSVGContent = null;

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                loadedSVGContent = evt.target.result;
                drawBtn.disabled = false;
            };
            reader.readAsText(file);
        }
    });

    drawBtn?.addEventListener('click', () => {
        if (loadedSVGContent) {
            processSVG(loadedSVGContent);
        }
    });

    // Playback Controls
    document.getElementById('btn-pause')?.addEventListener('click', () => {
        state.isPaused = !state.isPaused;
        updatePlaybackUI();
    });

    document.getElementById('btn-stop')?.addEventListener('click', () => {
        animationQueue = [];
        state.path = [];
        state.totalSteps = 0;
        state.penDown = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('playback-controls').style.display = 'none';
    });

    // Tab Handling
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId)?.classList.add('active');
        });
    });
}

function processSVG(svgString) {
    // 1. Parse SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.querySelector('svg');

    if (!svgEl) {
        console.error("No SVG found");
        return;
    }

    // 2. Flatten Paths (Using a hidden container to use functionality like getTotalLength)
    // Note: getTotalLength might require the element to be in the DOM.
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container); // Must append to document
    container.appendChild(svgEl);

    // Get all 'path' elements. 
    // TODO: Support circle, rect, etc by converting them or just querySelectorAll('*') and checking?
    // For MVP, specialized shapes often used in SVGs (rect, circle) might need polyfill.
    // Let's grab 'path' for now as most complex drawings use paths.
    // If SVGs use basic shapes, we should convert them? 
    // SVGs saved from editors often use paths.

    // Select all renderable SVG shapes that support getTotalLength() / getPointAtLength()
    const validTags = ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
    const selector = validTags.join(', ');
    const elements = Array.from(svgEl.querySelectorAll(selector));
    // Start Drawing
    // We construct the animation queue manually to handle jumps (Pen Up)
    const queue = [];

    // NOTE: startShapeBuffer clears the queue. We will use a modified helper or just manually fill.
    // Let's modify startShapeBuffer to take raw points or just overwrite it here.
    // Actually best to reuse startShapeBuffer but maybe make it more flexible?
    // Let's just build the queue and direct-set it for now to ensure correct Pen Up logic.

    state.path = [];
    state.penDown = false;
    animationQueue = [];

    let currentPathIndex = 0;

    // We already flattened everything into allPoints, but we lost the "path" boundaries!
    // Ah, wait. In step 2 I flattened ALL paths into `allPoints`. 
    // This merges them into one continuous line which is WRONG for multiple SVG paths.
    // I need to iterate paths and add them separately.

    // Refactoring Step 2 to preserve path separation:
    const svgPaths = []; // Array of arrays of points
    // We can compute bbox on the fly
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    elements.forEach(el => {
        const pathPts = [];
        let len = 0;

        try {
            len = el.getTotalLength();
        } catch (e) {
            console.warn("Element extraction failed", e);
            return;
        }

        const step = 2;
        let lastP = null;

        for (let l = 0; l <= len; l += step) {
            const p = el.getPointAtLength(l);

            // BBox (Compute on fly)
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;

            // Check for Jumps (Subpaths caused by 'M' commands)
            if (lastP) {
                const dist = Math.hypot(p.x - lastP.x, p.y - lastP.y);
                if (dist > step * 4) {
                    if (pathPts.length > 0) {
                        svgPaths.push([...pathPts]);
                        pathPts.length = 0;
                    }
                }
            }

            pathPts.push({ x: p.x, y: p.y });
            lastP = p;
        }

        // Force endpoint
        try {
            const p = el.getPointAtLength(len);

            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;

            if (lastP) {
                const dist = Math.hypot(p.x - lastP.x, p.y - lastP.y);
                if (dist > step * 4) {
                    if (pathPts.length > 0) {
                        svgPaths.push([...pathPts]);
                        pathPts.length = 0;
                    }
                }
            }
            pathPts.push({ x: p.x, y: p.y });
        } catch (e) { }

        if (pathPts.length > 0) {
            svgPaths.push(pathPts);
        }
    });

    document.body.removeChild(container);

    // BBox is already computed!
    // Eliminate the separate Double Loop.

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;

    // 4. Scale and Translate to Safe Area
    const safeW = KINEMATICS.CONFIG.SAFE_W;
    const safeH = KINEMATICS.CONFIG.SAFE_H;

    // Scale Logic (same as before)
    const scaleX = safeW / bboxW;
    const scaleY = safeH / bboxH;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = KINEMATICS.CONFIG.SAFE_X;
    const ty = KINEMATICS.CONFIG.SAFE_Y;

    // Transform and Queue
    svgPaths.forEach(subPath => {
        if (subPath.length === 0) return;

        // Transform first point
        const p0 = subPath[0];
        const tx0 = tx + (p0.x - cx) * scale;
        const ty0 = ty + (p0.y - cy) * scale;

        // 1. Travel (Pen Up) to start of this path
        animationQueue.push({ x: tx0, y: ty0, penDown: false });

        // 2. Draw (Pen Down) through the path
        subPath.forEach(p => {
            const tpx = tx + (p.x - cx) * scale;
            const tpy = ty + (p.y - cy) * scale;
            animationQueue.push({ x: tpx, y: tpy, penDown: true });
        });

        // Optional: Lift pen at end of path?
        // Not strictly necessary as the next loop will do a Pen Up move.
        // But let's be explicit.
        animationQueue.push({ x: tx + (subPath[subPath.length - 1].x - cx) * scale, y: ty + (subPath[subPath.length - 1].y - cy) * scale, penDown: false });
    });

    // Init Progress
    state.totalSteps = animationQueue.length;
    state.isPaused = false;

    // Show Controls
    const controls = document.getElementById('playback-controls');
    if (controls) controls.style.display = 'block';
    updatePlaybackUI();
}

function interpolateLine(p0, p1, step = 2) {
    const pts = [];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.ceil(dist / step);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({
            x: p0.x + (p1.x - p0.x) * t,
            y: p0.y + (p1.y - p0.y) * t
        });
    }
    return pts;
}

init();
