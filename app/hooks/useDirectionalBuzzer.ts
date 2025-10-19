/**
 * Custom hook for direction-sensitive haptic feedback
 * Buzzes more frequently when device points toward target user
 */
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import type { NearbyUser } from '../types';

interface DirectionalBuzzerConfig {
    enabled: boolean;
    targetUser: NearbyUser | null;
    currentLocation: { lat: number; lng: number } | null;
}

/**
 * Calculate bearing between two coordinates
 * Returns angle in degrees (0-360) where 0 is North
 */
function calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    let bearing = toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    return bearing;
}

/**
 * Calculate angular difference between two headings
 * Returns smallest angle difference (0-180 degrees)
 */
function getAngularDifference(heading1: number, heading2: number): number {
    let diff = Math.abs(heading1 - heading2);
    if (diff > 180) {
        diff = 360 - diff;
    }
    return diff;
}

/**
 * Calculate vibration interval based on angular difference
 * Closer alignment = more frequent buzzing
 *
 * @param angleDiff - Difference in degrees (0-180)
 * @returns Interval in milliseconds
 */
function calculateVibrationInterval(angleDiff: number): number {
    // Map angle difference to vibration frequency
    // 0° = 50ms (very frequent, nearly continuous)
    // 180° = 1000ms (infrequent)

    const minInterval = 10;
    const maxInterval = 10000;

    // Linear interpolation
    const normalizedAngle = angleDiff / 180; // 0 to 1
    const interval = minInterval + (maxInterval - minInterval) * normalizedAngle;

    return Math.round(interval);
}

export function useDirectionalBuzzer(config: DirectionalBuzzerConfig) {
    const { enabled, targetUser, currentLocation } = config;
    const [heading, setHeading] = useState<number | null>(null);
    const [targetBearing, setTargetBearing] = useState<number | null>(null);
    const [angularDiff, setAngularDiff] = useState<number | null>(null);
    const [vibrationInterval, setVibrationInterval] = useState<number | null>(null);

    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
    const vibrationTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate bearing to target user
    useEffect(() => {
        if (currentLocation && targetUser) {
            const bearing = calculateBearing(
                currentLocation.lat,
                currentLocation.lng,
                targetUser.lat,
                targetUser.lng
            );
            setTargetBearing(bearing);
        } else {
            setTargetBearing(null);
        }
    }, [currentLocation, targetUser]);

    // Subscribe to compass heading updates
    useEffect(() => {
        if (!enabled || !targetUser) {
            // Clean up if disabled
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
                subscriptionRef.current = null;
            }
            setHeading(null);
            setAngularDiff(null);
            setVibrationInterval(null);
            return;
        }

        let isActive = true;

        const setupCompass = async () => {
            try {
                // Check if heading is available
                const hasHeading = await Location.hasServicesEnabledAsync();
                if (!hasHeading || !isActive) return;

                // Subscribe to heading updates
                const subscription = await Location.watchHeadingAsync((headingData) => {
                    if (isActive) {
                        // magHeading is magnetic north, trueHeading is geographic north
                        // Use trueHeading if available, otherwise magHeading
                        const currentHeading = headingData.trueHeading ?? headingData.magHeading;
                        setHeading(currentHeading);
                    }
                });

                subscriptionRef.current = subscription;
            } catch (error) {
                console.error('Error setting up compass:', error);
            }
        };

        setupCompass();

        return () => {
            isActive = false;
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
                subscriptionRef.current = null;
            }
        };
    }, [enabled, targetUser]);

    // Calculate angular difference when heading or target bearing changes
    useEffect(() => {
        if (heading !== null && targetBearing !== null) {
            const diff = getAngularDifference(heading, targetBearing);
            setAngularDiff(diff);

            const interval = calculateVibrationInterval(diff);
            setVibrationInterval(interval);
        } else {
            setAngularDiff(null);
            setVibrationInterval(null);
        }
    }, [heading, targetBearing]);

    // Trigger haptic feedback based on vibration interval
    useEffect(() => {
        if (vibrationTimerRef.current) {
            clearInterval(vibrationTimerRef.current);
            vibrationTimerRef.current = null;
        }

        if (!enabled || vibrationInterval === null) {
            return;
        }

        // Start vibration loop
        const startVibrations = () => {
            // Initial vibration
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Set up recurring vibrations with shorter duration for more constant feel
            vibrationTimerRef.current = setInterval(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }, vibrationInterval);
        };

        startVibrations();

        return () => {
            if (vibrationTimerRef.current) {
                clearInterval(vibrationTimerRef.current);
                vibrationTimerRef.current = null;
            }
        };
    }, [enabled, vibrationInterval]);

    return {
        heading,
        targetBearing,
        angularDiff,
        vibrationInterval,
        isActive: enabled && heading !== null && targetBearing !== null,
    };
}
