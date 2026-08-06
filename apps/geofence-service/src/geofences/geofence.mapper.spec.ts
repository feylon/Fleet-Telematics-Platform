import { parsePolygon } from './geofence.mapper';

describe('parsePolygon', () => {
  it('accepts a valid polygon and closes an open ring', () => {
    const polygon = parsePolygon(JSON.stringify({ type: 'Polygon', coordinates: [[[69.2, 41.3], [69.3, 41.3], [69.3, 41.4], [69.2, 41.4]]] }));
    expect(polygon.coordinates[0]).toHaveLength(5);
    expect(polygon.coordinates[0][4]).toEqual([69.2, 41.3]);
  });

  it('rejects non polygons and bad positions', () => {
    expect(() => parsePolygon('{"type":"Point","coordinates":[1,2]}')).toThrow();
    expect(() => parsePolygon('not json')).toThrow();
    expect(() => parsePolygon(JSON.stringify({ type: 'Polygon', coordinates: [[[200, 1], [1, 1], [2, 2], [200, 1]]] }))).toThrow();
  });
});
