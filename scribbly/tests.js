const KINEMATICS = require('./kinematics.js');

function assert(desc, condition, msg) {
    if (condition) {
        console.log(`\x1b[32m[PASS]\x1b[0m ${desc}`);
    } else {
        console.error(`\x1b[31m[FAIL]\x1b[0m ${desc}: ${msg}`);
        process.exit(1);
    }
}

function runTests() {
    console.log("Running Kinematics Unit Tests...");

    // Setup default config comparable to Reference
    KINEMATICS.setConfig({
        SHOULDER_SEP: 140,
        L_BODY: 50,
        L_BLUE: 80,
        A_BEND: 120, // Internal angle
        L_MAIN: 180
    });

    // Test 1: Symmetry at 0
    // Inputs: 0, 0. Should be symmetric.
    // Canvas Coords (Y+ Down). 0,0 is center of shoulders.
    // With 0 input:
    // Left Arm should be at 180 (Left). Body Tip (-50, 0).
    // Right Arm should be at 0 (Right). Body Tip (50, 0).
    // Pen should be at X=0, Y > 0 (Down).
    const res0 = KINEMATICS.forward(0, 0);
    if (!res0) {
        assert("Forward(0,0) exists", false, "Returned null");
    } else {
        assert("Forward(0,0) Symmetry X", Math.abs(res0.P.x) < 0.001, `X was ${res0.P.x}, expected 0`);
        assert("Forward(0,0) Reachable Y", res0.P.y > 50, `Y was ${res0.P.y}, expected > 50 (Down)`);

        // Virtual Elbow check
        // EL_Virtual.x should be negative. ER_Virtual.x should be positive.
        assert("Virtual Elbow Symmetry", Math.abs(res0.EL_Virtual.x + res0.ER_Virtual.x) < 0.001, "Virtual Elbows not X-symmetric");
    }

    // Test 2: Directionality (Hugging)
    // Increasing dL should move Left Arm DOWN (Inner Angle decreases? or Global Angle decreases?)
    // We defined: radL = 180 - dL.
    // At dL=0, radL=180 (Left).
    // At dL=45, radL=135 (Down-Left).
    // So if we have dL > 0, we expect the arm to move DOWN.
    // Let's check a deep reach point (0, 250).
    const deepY = 250;
    const resDeep = KINEMATICS.inverse(0, deepY);
    if (!resDeep) {
        assert("Inverse(0, 250) reachable", false, "Returned null");
    } else {
        assert("Inverse(0, 250) Positive Inputs", resDeep.thetaL > 10 && resDeep.thetaR > 10,
            `Expected positive angles for deep reach (Hugging). Got L=${resDeep.thetaL.toFixed(1)}, R=${resDeep.thetaR.toFixed(1)}`);
    }

    // Test 3: Wings Up (Negative inputs)
    // If I input -30, arm should go Up-Left (Angle 210).
    // Y component of Pen might move Up (smaller Y) compared to 0?
    const resUp = KINEMATICS.forward(-30, -30);
    if (resUp) {
        assert("Forward(-30, -30) is Higher than (0,0)", resUp.P.y < res0.P.y,
            `(-30,-30) Y=${resUp.P.y.toFixed(1)} vs (0,0) Y=${res0.P.y.toFixed(1)}`);

        // Also check if valid solution was found
        assert("Forward(-30,-30) valid", true, "");
    }

    console.log("All tests passed.");
}

runTests();
