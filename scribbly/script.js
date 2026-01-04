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
    L_MAIN: 180
});

// --- State ---
const state = {
    dL: 0,
    dR: 0,
    penDown: false,
    path: [], // Array of {x, y, valid: boolean}
    kRes: null
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

            const s0 = worldToScreen(p0.x, p0.y);
            const s1 = worldToScreen(p1.x, p1.y);

            ctx.beginPath();
            ctx.moveTo(s0.x, s0.y);
            ctx.lineTo(s1.x, s1.y);

            // Logic: Blue if both points valid. Grey if either is invalid.
            if (p0.valid && p1.valid) {
                ctx.strokeStyle = '#2563eb'; // Blue
            } else {
                ctx.strokeStyle = '#d1d5db'; // Light Grey
            }
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
    state.penDown = step.penDown;

    if (!state.penDown) {
        // Just moving logic if we wanted to support Pen Up traversal (e.g. rapid move)
        // For now we just skip or move to point?
        return;
    }

    const inputs = KINEMATICS.inverse(step.x, step.y);
    if (inputs) {
        state.dL = inputs.thetaL;
        state.dR = inputs.thetaR;
        ui.thetaL.value = state.dL;
        ui.thetaR.value = state.dR;

        // Push valid
        state.path.push({ x: step.x, y: step.y, valid: true });

    } else {
        // Unreachable: Push invalid
        // Robot does NOT move.
        state.path.push({ x: step.x, y: step.y, valid: false });
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
    // Run multiple animation steps per frame for speed? or 1 per frame?
    // 1 per frame (60fps) is good for viz.
    if (animationQueue.length > 0) runAnimation();
    updateKinematics();
    draw();
    requestAnimationFrame(loop);
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
        const pts = [
            { x: cx - w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy - h / 2 },
            { x: cx + w / 2, y: cy + h / 2 },
            { x: cx - w / 2, y: cy + h / 2 },
            { x: cx - w / 2, y: cy - h / 2 }
        ];
        startShapeBuffer(pts);
    });
}

init();
