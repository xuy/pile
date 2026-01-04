const KIN = require('./kinematics');

// Configure for Linear Mode
KIN.setConfig({
    MODE: 'linear_parallel',
    OriginL: -100,
    OriginR: 100,
    LinkLength: 250 // Needs to be long enough to reach down to -200
});

console.log("Running Kinematics Tests [Linear Mode]...");

// Test 1: Reachability
{
    const target = { x: 0, y: -200 };
    const inputs = KIN.inverse(target.x, target.y);

    if (inputs) {
        console.log(`[PASS] Inverse found for (0, -200): dL=${inputs.thetaL.toFixed(1)}, dR=${inputs.thetaR.toFixed(1)}`);

        const fk = KIN.forward(inputs.thetaL, inputs.thetaR);
        const err = Math.hypot(fk.P.x - target.x, fk.P.y - target.y);

        if (err < 0.001) {
            console.log(`[PASS] Round trip accurate. Err=${err}`);
        } else {
            console.error(`[FAIL] Round trip error: ${err}`);
        }
    } else {
        console.error(`[FAIL] Could not reach (0, -200)`);
    }
}

// Test 2: Circle Trace
{
    console.log("Testing Circle Trace...");
    let failures = 0;
    const r = 50;
    const cy = -200;
    for (let i = 0; i < 360; i += 10) {
        const rad = i * Math.PI / 180;
        const tx = r * Math.cos(rad);
        const ty = cy + r * Math.sin(rad);

        const inputs = KIN.inverse(tx, ty);
        if (!inputs) {
            console.log(`[WARN] Unreachable: ${tx.toFixed(1)}, ${ty.toFixed(1)}`);
            failures++;
        }
    }

    if (failures === 0) console.log("[PASS] All circle points reachable.");
    else console.log(`[FAIL] ${failures} points unreachable.`);
}

// Test 3: Rectangle Trace
{
    console.log("Testing Rectangle Trace...");
    const points = [
        { x: -50, y: -150 },
        { x: 50, y: -150 },
        { x: 50, y: -250 },
        { x: -50, y: -250 }
    ];

    let failures = 0;
    for (const p of points) {
        if (!KIN.inverse(p.x, p.y)) {
            console.log(`[WARN] Unreachable: ${p.x}, ${p.y}`);
            failures++;
        }
    }
    if (failures === 0) console.log("[PASS] All rect corners reachable.");
    else console.log(`[FAIL] ${failures} corners unreachable.`);
}
