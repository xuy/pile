/**
 * Scribbly Robot Kinematics Module
 * 
 * Model: Rigid Bent Arm 5-Bar Linkage
 * Coordinate System: CANVAS (Y+ is DOWN). 
 * Angles: 0 = Right, 90 = Down, 180 = Left.
 * Origin (0,0) is at center of shoulder line.
 */

const KINEMATICS = {
    // Default Configuration
    CONFIG: {
        SHOULDER_SEP: 140,
        L_BODY: 50,
        L_BLUE: 80,
        A_BEND: 120,    // Internal angle
        L_MAIN: 180,
    },

    props: { L_EFF: 0, PHI: 0 },

    setConfig: function (config) {
        this.CONFIG = { ...this.CONFIG, ...config };
        this.recalcProps();
    },

    recalcProps: function () {
        const { L_BODY, L_BLUE, A_BEND } = this.CONFIG;
        const radBend = A_BEND * Math.PI / 180;

        // Effective Crank Length
        this.props.L_EFF = Math.sqrt(
            L_BODY ** 2 + L_BLUE ** 2 - 2 * L_BODY * L_BLUE * Math.cos(radBend)
        );

        // Phase Offset PHI
        this.props.PHI = Math.asin((L_BLUE * Math.sin(radBend)) / this.props.L_EFF);
    },

    getCircleIntersections: function (x0, y0, r0, x1, y1, r1) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return null;
        const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
        const h = Math.sqrt(r0 * r0 - a * a);
        const x2 = x0 + a * (dx / d);
        const y2 = y0 + a * (dy / d);
        return [
            { x: x2 + h * (dy / d), y: y2 - h * (dx / d) },
            { x: x2 - h * (dy / d), y: y2 + h * (dx / d) }
        ];
    },

    /**
     * Forward Kinematics
     * Input: Degrees.
     */
    forward: function (dL, dR) {
        if (this.props.L_EFF === 0) this.recalcProps();

        const { SHOULDER_SEP, L_MAIN } = this.CONFIG;
        const { L_EFF, PHI } = this.props;

        const SL = { x: -SHOULDER_SEP / 2, y: 0 };
        const SR = { x: SHOULDER_SEP / 2, y: 0 };

        // Direction Fix: Positive dL/dR should move arms "Down" (Hugging).
        // 180 - dL, 0 + dR.
        const radL = (180 - dL) * Math.PI / 180;
        const radR = (0 + dR) * Math.PI / 180;

        // Apply Phase
        const thetaL_Eff = radL - PHI;
        const thetaR_Eff = radR + PHI;

        // Virtual Elbows
        const EL_Virtual = {
            x: SL.x + L_EFF * Math.cos(thetaL_Eff),
            y: SL.y + L_EFF * Math.sin(thetaL_Eff)
        };
        const ER_Virtual = {
            x: SR.x + L_EFF * Math.cos(thetaR_Eff),
            y: SR.y + L_EFF * Math.sin(thetaR_Eff)
        };

        const ints = this.getCircleIntersections(
            EL_Virtual.x, EL_Virtual.y, L_MAIN,
            ER_Virtual.x, ER_Virtual.y, L_MAIN
        );

        if (!ints) return null;

        // Pen Down (Max Y in Canvas Coords)
        const P = ints.reduce((a, b) => a.y > b.y ? a : b);

        return { P, SL, SR, EL_Virtual, ER_Virtual };
    },

    inverse: function (x, y) {
        if (this.props.L_EFF === 0) this.recalcProps();

        const { SHOULDER_SEP, L_MAIN } = this.CONFIG;
        const { L_EFF, PHI } = this.props;

        const SL = { x: -SHOULDER_SEP / 2, y: 0 };
        const SR = { x: SHOULDER_SEP / 2, y: 0 };

        const intsL = this.getCircleIntersections(SL.x, SL.y, L_EFF, x, y, L_MAIN);
        const intsR = this.getCircleIntersections(SR.x, SR.y, L_EFF, x, y, L_MAIN);

        if (!intsL || !intsR) return null;

        // Elbows should be "Up" relative to Pen (Lower Y value than P).
        const EL = intsL.reduce((a, b) => a.y < b.y ? a : b);
        const ER = intsR.reduce((a, b) => a.y < b.y ? a : b);

        const angEffL = Math.atan2(EL.y - SL.y, EL.x - SL.x);
        const angEffR = Math.atan2(ER.y - SR.y, ER.x - SR.x);

        // Map back
        let radL = angEffL + PHI;
        let radR = angEffR - PHI;

        // Convert to Degrees
        let degL_Body = (radL * 180 / Math.PI);
        let dL = 180 - degL_Body;

        let dR = (radR * 180 / Math.PI);

        // Normalize angle ranges if they wrap weirdly, but usually fine here.

        // Constraints Check: -30 to +60
        // We allow some floating point tolerance, but generally strict.
        if (dL < -30.1 || dL > 60.1 || dR < -30.1 || dR > 60.1) {
            return null;
        }

        return { thetaL: dL, thetaR: dR };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KINEMATICS;
} else {
    window.KINEMATICS = KINEMATICS;
}
