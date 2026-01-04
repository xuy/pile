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
    path: [],
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

    // Enforce UI defaults
    if (ui.thetaL) {
        // Force min/max if not set
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
    const res = KINEMATICS.forward(state.dL, state.dR);
    state.kRes = res;

    if (res) {
        if (ui.valThetaL) ui.valThetaL.textContent = `${state.dL.toFixed(0)}°`;
        if (ui.valThetaR) ui.valThetaR.textContent = `${state.dR.toFixed(0)}°`;
        if (ui.posDisplay) ui.posDisplay.textContent = `(${res.P.x.toFixed(1)}, ${res.P.y.toFixed(1)})`;

        if (state.penDown) {
            state.path.push({ ...res.P });
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
    // Simple floor line ?
    // ctx.moveTo(0, 500); ctx.lineTo(800, 500); 
    ctx.stroke();

    // Draw Path
    if (state.path.length > 0) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const p0 = worldToScreen(state.path[0].x, state.path[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < state.path.length; i++) {
            const p = worldToScreen(state.path[i].x, state.path[i].y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    if (!state.kRes) return;
    const { P, SL, SR, EL_Virtual, ER_Virtual } = state.kRes;

    const sSL = worldToScreen(SL.x, SL.y);
    const sSR = worldToScreen(SR.x, SR.y);
    const sP = worldToScreen(P.x, P.y);

    // 1. Draw Body Arms (Reconstruct)
    // Left: 180 - dL
    const radL = (180 - state.dL) * Math.PI / 180;
    const sJ1L = worldToScreen(
        SL.x + KINEMATICS.CONFIG.L_BODY * Math.cos(radL),
        SL.y + KINEMATICS.CONFIG.L_BODY * Math.sin(radL)
    );

    // Right: 0 + dR
    const radR = (0 + state.dR) * Math.PI / 180;
    const sJ1R = worldToScreen(
        SR.x + KINEMATICS.CONFIG.L_BODY * Math.cos(radR),
        SR.y + KINEMATICS.CONFIG.L_BODY * Math.sin(radR)
    );

    // 2. Draw Blue Arms
    const sEL = worldToScreen(EL_Virtual.x, EL_Virtual.y);
    const sER = worldToScreen(ER_Virtual.x, ER_Virtual.y);

    // Render Chains
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Left Chain
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 8; // Cyan
    ctx.beginPath(); ctx.moveTo(sSL.x, sSL.y); ctx.lineTo(sJ1L.x, sJ1L.y); ctx.stroke();

    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6; // Blue
    ctx.beginPath(); ctx.moveTo(sJ1L.x, sJ1L.y); ctx.lineTo(sEL.x, sEL.y); ctx.stroke();

    // Right Chain
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sSR.x, sSR.y); ctx.lineTo(sJ1R.x, sJ1R.y); ctx.stroke();

    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sJ1R.x, sJ1R.y); ctx.lineTo(sER.x, sER.y); ctx.stroke();

    // 3. Main Arms (Green)
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

    const inputs = KINEMATICS.inverse(step.x, step.y);
    if (inputs) {
        state.dL = inputs.thetaL;
        state.dR = inputs.thetaR;
        // Sync UI
        ui.thetaL.value = state.dL;
        ui.thetaR.value = state.dR;
    } else {
        // unreachable or constrained out
        // console.log("Skipping point - out of bounds");
        // We could optionally stop animation here
    }
}

function startShapeBuffer(points) {
    state.path = [];
    state.penDown = false;
    animationQueue = [];
    if (points.length > 0) {
        // Move to start with pen up
        animationQueue.push({ x: points[0].x, y: points[0].y, penDown: false });
        for (const p of points) {
            animationQueue.push({ x: p.x, y: p.y, penDown: true });
        }
        animationQueue.push({ x: points[points.length - 1].x, y: points[points.length - 1].y, penDown: false });
    }
}

// Helper: Point Generator
function generateCircle(cx, cy, r, steps = 60) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
}

function loop() {
    if (animationQueue.length > 0) runAnimation();
    updateKinematics();
    draw();
    requestAnimationFrame(loop);
}

// --- Event Listeners ---
function setupEventListeners() {
    if (ui.thetaL) ui.thetaL.addEventListener('input', (e) => {
        state.dL = parseFloat(e.target.value);
        animationQueue = [];
    });
    if (ui.thetaR) ui.thetaR.addEventListener('input', (e) => {
        state.dR = parseFloat(e.target.value);
        animationQueue = [];
    });

    if (ui.btnClear) ui.btnClear.addEventListener('click', () => {
        state.path = [];
        state.penDown = false;
        ctx.clearRect(0, 0, 800, 600);
    });

    // Test Shapes
    document.getElementById('btn-circle')?.addEventListener('click', () => {
        // Draw circle below shoulders (Y=0). try Y=200
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

// Init
init();
