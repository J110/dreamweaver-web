// Parental gate (Apple Kids Category). DORMANT by default: repo evidence is
// Education / Early-Learning, age rating 4+, with NO Kids-Category enrollment
// signals — so there is no Apple-mandated purchase gate. If App Store Connect →
// App Information shows a Kids Category / age-band enrollment, flip this to
// true: the gate then wraps the native purchase call (see UpgradeClient +
// ParentalGate). Flipping this flag is the WHOLE Kids delta — the purchase core
// is unchanged.
export const PARENTAL_GATE_ENABLED = false;
