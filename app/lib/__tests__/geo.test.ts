/**
 * Tests for geo utility functions
 */
import { haversineDistance, isWithinRadius, getBoundingBox } from '../geo';

describe('haversineDistance', () => {
  it('should calculate distance between two points', () => {
    // San Francisco to Los Angeles (approx 559 km)
    const distance = haversineDistance(37.7749, -122.4194, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(550);
    expect(distance).toBeLessThan(570);
  });

  it('should return 0 for same location', () => {
    const distance = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    expect(distance).toBe(0);
  });

  it('should handle antipodal points', () => {
    const distance = haversineDistance(0, 0, 0, 180);
    expect(distance).toBeGreaterThan(19900); // Approx half Earth's circumference
    expect(distance).toBeLessThan(20100);
  });
});

describe('isWithinRadius', () => {
  it('should return true when within radius', () => {
    // Two points ~5 km apart
    const result = isWithinRadius(37.7749, -122.4194, 37.8199, -122.4783, 10);
    expect(result).toBe(true);
  });

  it('should return false when outside radius', () => {
    // SF to LA with 10km radius
    const result = isWithinRadius(37.7749, -122.4194, 34.0522, -118.2437, 10);
    expect(result).toBe(false);
  });

  it('should handle exact radius distance', () => {
    // Create two points exactly 5 km apart
    const result = isWithinRadius(0, 0, 0.045, 0, 5);
    expect(result).toBe(true);
  });
});

describe('getBoundingBox', () => {
  it('should create valid bounding box', () => {
    const bbox = getBoundingBox(37.7749, -122.4194, 10);

    expect(bbox.minLat).toBeLessThan(37.7749);
    expect(bbox.maxLat).toBeGreaterThan(37.7749);
    expect(bbox.minLng).toBeLessThan(-122.4194);
    expect(bbox.maxLng).toBeGreaterThan(-122.4194);
  });

  it('should scale with radius', () => {
    const bbox1 = getBoundingBox(0, 0, 5);
    const bbox2 = getBoundingBox(0, 0, 10);

    expect(Math.abs(bbox2.maxLat - bbox2.minLat)).toBeGreaterThan(
      Math.abs(bbox1.maxLat - bbox1.minLat)
    );
  });
});
