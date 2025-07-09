import { validate } from 'class-validator';
import { RouteInputDto, WaypointDto } from './dto/route-input.dto';

describe('Route Validation', () => {
  describe('RouteInputDto', () => {
    let validRoute: RouteInputDto;

    beforeEach(() => {
      validRoute = {
        name: 'Test Route',
        notes: 'Test notes',
        enabled: true,
        waypoints: [
          {
            lat: 7.0,
            lng: -0.5,
            order: 0,
            name: 'Start'
          },
          {
            lat: 7.1,
            lng: -0.6,
            order: 1,
            name: 'End'
          }
        ]
      };
    });

    it('should pass validation with valid data', async () => {
      const dto = Object.assign(new RouteInputDto(), validRoute);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with less than 2 waypoints', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        waypoints: [validRoute.waypoints[0]]
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.arrayMinSize).toContain('Route must have at least 2 waypoints');
    });

    it('should fail validation with duplicate waypoint orders', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        waypoints: [
          { lat: 7.0, lng: -0.5, order: 0 },
          { lat: 7.1, lng: -0.6, order: 0 } // Duplicate order
        ]
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.hasUniqueWaypointOrders).toContain('Waypoint orders must be unique within the route');
    });

    it('should fail validation with all waypoints at same location', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        waypoints: [
          { lat: 7.0, lng: -0.5, order: 0 },
          { lat: 7.0, lng: -0.5, order: 1 } // Same location
        ]
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.hasDistinctWaypoints).toContain('Route waypoints cannot all be at the same location');
    });

    it('should fail validation with invalid latitude', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        waypoints: [
          { lat: 91, lng: -0.5, order: 0 }, // Invalid latitude
          { lat: 7.1, lng: -0.6, order: 1 }
        ]
      });
      
      // Manually validate waypoints
      const waypointDto = Object.assign(new WaypointDto(), dto.waypoints[0]);
      const waypointErrors = await validate(waypointDto);
      expect(waypointErrors).toHaveLength(1);
      expect(waypointErrors[0].constraints?.isLatitude).toContain('Latitude must be between -90 and 90 degrees');
    });

    it('should fail validation with invalid longitude', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        waypoints: [
          { lat: 7.0, lng: -181, order: 0 }, // Invalid longitude
          { lat: 7.1, lng: -0.6, order: 1 }
        ]
      });
      
      // Manually validate waypoints
      const waypointDto = Object.assign(new WaypointDto(), dto.waypoints[0]);
      const waypointErrors = await validate(waypointDto);
      expect(waypointErrors).toHaveLength(1);
      expect(waypointErrors[0].constraints?.isLongitude).toContain('Longitude must be between -180 and 180 degrees');
    });

    it('should fail validation with empty route name', async () => {
      const dto = Object.assign(new RouteInputDto(), {
        ...validRoute,
        name: ''
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });
  });
});