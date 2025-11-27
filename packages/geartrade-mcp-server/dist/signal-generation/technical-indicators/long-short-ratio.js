/**
 * Long/Short Ratio Indicators
 * Analyze trader sentiment, contrarian signals, extreme ratios
 */
/**
 * Analyze sentiment
 */
function analyzeSentiment(ratioData) {
    const longPct = ratioData.longPct;
    // Overall sentiment
    let overall = 'balanced';
    if (longPct > 70) {
        overall = 'extreme_long';
    }
    else if (longPct > 55) {
        overall = 'moderate_long';
    }
    else if (longPct < 30) {
        overall = 'extreme_short';
    }
    else if (longPct < 45) {
        overall = 'moderate_short';
    }
    // Retail sentiment
    let retail = 'balanced';
    if (ratioData.retailLongPct > 55) {
        retail = 'long';
    }
    else if (ratioData.retailLongPct < 45) {
        retail = 'short';
    }
    // Pro sentiment
    let pro = 'balanced';
    if (ratioData.proLongPct > 55) {
        pro = 'long';
    }
    else if (ratioData.proLongPct < 45) {
        pro = 'short';
    }
    return {
        overall,
        retail,
        pro
    };
}
/**
 * Detect contrarian signals
 */
function detectContrarian(ratioData) {
    // Contrarian: fade retail sentiment
    // If retail is 80% long, consider shorts (retail is usually wrong)
    const retailLongPct = ratioData.retailLongPct;
    let signal = false;
    let direction = 'neutral';
    let strength = 0;
    if (retailLongPct > 70) {
        // Retail extremely long = contrarian short signal
        signal = true;
        direction = 'short';
        strength = Math.min(1, (retailLongPct - 70) / 20); // 70-90% range maps to 0-1
    }
    else if (retailLongPct < 30) {
        // Retail extremely short = contrarian long signal
        signal = true;
        direction = 'long';
        strength = Math.min(1, (30 - retailLongPct) / 20); // 10-30% range maps to 0-1
    }
    return {
        signal,
        direction,
        strength: isNaN(strength) ? 0 : strength
    };
}
/**
 * Detect extreme ratios
 */
function detectExtreme(ratioData) {
    const longPct = ratioData.longPct;
    const extreme = longPct > 70 || longPct < 30;
    let level = 'normal';
    if (longPct > 70) {
        level = 'extreme_long';
    }
    else if (longPct < 30) {
        level = 'extreme_short';
    }
    // Reversal signal: extreme ratios often reverse
    const reversalSignal = extreme;
    return {
        detected: extreme,
        level,
        reversalSignal
    };
}
/**
 * Calculate retail vs pro divergence
 */
function calculateDivergence(ratioData) {
    const retailLongPct = ratioData.retailLongPct;
    const proLongPct = ratioData.proLongPct;
    // Divergence: difference between retail and pro positioning
    const divergence = (retailLongPct - proLongPct) / 100; // Normalize to -1 to 1
    // Signal: follow pro, fade retail
    let signal = 'neutral';
    if (Math.abs(divergence) > 0.1) {
        // Significant divergence
        if (divergence > 0) {
            // Retail more long than pro = fade retail (go short)
            signal = 'fade_retail';
        }
        else {
            // Retail more short than pro = fade retail (go long)
            signal = 'fade_retail';
        }
    }
    else if (Math.abs(divergence) < 0.05) {
        // Pro and retail aligned = follow pro
        signal = 'follow_pro';
    }
    return {
        retailVsPro: isNaN(divergence) ? 0 : Math.max(-1, Math.min(1, divergence)),
        signal
    };
}
/**
 * Calculate long/short ratio indicators
 */
export function calculateLongShortRatioIndicators(ratioData) {
    const sentiment = analyzeSentiment(ratioData);
    const contrarian = detectContrarian(ratioData);
    const extreme = detectExtreme(ratioData);
    const divergence = calculateDivergence(ratioData);
    return {
        sentiment,
        contrarian,
        extreme,
        divergence
    };
}
