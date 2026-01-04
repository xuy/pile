# Scribbly Robot Specification

## Mechanism Topology: "Rigid Bent Crank 5-Bar Linkage"

The robot operates as a symmetric 5-bar linkage (Ground-Link1L-Link2L-Link2R-Link1R).
The unique feature is that "Link 1" (the driving crank) is physically constructed from two pieces rigidly connected at a fixed angle.

### Standardized Terminology

1.  **Robot Body (Ground)**: Fixed base containing the two servos.
    *   **Shoulder L/R**: The axes of rotation for the servos. Fixed distance `shoulder_sep`.

2.  **Compound Crank (Link 1)**: The driving arm attached to the servo.
    *   **Body Arm (Cyan)**: The short physical arm attached directly to the servo spline. Length: `L_body`.
    *   **Upper Arm (Blue)**: The curved arm rigidly connected to the Body Arm. Length: `L_blue`.
    *   **Rigid Elbow**: The fixed, non-moving connection between Body Arm and Upper Arm. Angle: `angle_bend`.
    *   **Effective Crank**: The virtual straight line from *Shoulder* to *Mobile Elbow*.
        *   **Effective Length (`R1`)**: Distance from Shoulder to Mobile Elbow.
        *   **Phase Offset (`phi`)**: The angular difference between the Body Arm (Servo direction) and the Effective connection vector.

3.  **Main Arm (Link 2 / Green)**: The arm connecting the crank to the pen.
    *   **Mobile Elbow**: The free rotating joint connecting the Upper Arm (Link 1) and Main Arm (Link 2).
    *   **Pen Joint**: The shared joint where both Main Arms meet the Pen. Length: `L_main` (`R2`).

4.  **Pen (End Effector)**: The drawing tip.

### Mathematical Model

The system is mathematically equivalent to a standard 2-DOF 5-Bar Linkage with:

*   **Link 1 Length (R1)**: $\sqrt{L_{body}^2 + L_{blue}^2 - 2 \cdot L_{body} \cdot L_{blue} \cdot \cos(angle_{bend})}$
*   **Link 2 Length (R2)**: $L_{main}$
*   **Input Angle Mapping**: $\theta_{virtual} = \theta_{servo} + \Phi_{offset}$

Where $\Phi_{offset}$ is the geometric angle derived from the triangle formed by Body Arm and Blue Arm.

### Geometric Constants (To be tuned)

| Parameter | Variable | Description |
| :--- | :--- | :--- |
| **Shoulder Separation** | `d_sep` | Distance between Left and Right Servo axes. |
| **Body Arm Length** | `l_body` | Length of the cyan link. |
| **Upper Arm Length** | `l_blue` | Length of the blue link (straight line approx). |
| **Bend Angle** | `a_bend` | Internal angle between Body Arm and Upper Arm. |
| **Main Arm Length** | `l_main` | Length of the green link. |

### Kinematic Flow

**Forward Kinematics (Servo -> Pen)**
1.  Read Servo Angle $\theta_{servo}$.
2.  Calculate Virtual Angle: $\theta_{eff} = \theta_{servo} + \Phi_{offset}$.
3.  Calculate Mobile Elbow Position using Polar(0, $R_{eff}$, $\theta_{eff}$).
4.  Intersect Circles($Elbow_L$, $R_2$, $Elbow_R$, $R_2$) to find Pen $P$.

**Inverse Kinematics (Pen -> Servo)**
1.  Given Target $P(x,y)$.
2.  Intersect Circles($Shoulder$, $R_{eff}$, $P$, $R_2$) to find Elbow positions.
3.  Calculate angle to Elbow $\theta_{eff}$.
4.  Convert to Servo Angle: $\theta_{servo} = \theta_{eff} - \Phi_{offset}$.