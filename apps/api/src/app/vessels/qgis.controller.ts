// qgis.controller.ts
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingPoint } from './tracking-point.entity';
import { Vessel } from './vessel.entity';
import { Response } from 'express';

// Remember to configure QGIS like this
// https://opengislab.com/blog/2020/2/1/tip-on-adding-geojson-via-url-in-qgis

@Controller('gis')
export class QgisController {
  constructor(
    @InjectRepository(TrackingPoint)
    private trackingRepository: Repository<TrackingPoint>,
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>
  ) {}

  @Get('vessels/latest')
  async getLatestPositionsGeoJSON(@Res() res: Response) {
    const query = `
      SELECT 
        v.id as vessel_id,
        v.name,
        v.vessel_type,
        v.registration_number,
        v.length_meters,
        v.home_port,
        vp.position_time,
        vp.speed_knots,
        vp.heading_degrees,
        vp.status,
        ST_AsGeoJSON(vp.geom) as geometry
      FROM 
        vessel_latest_positions vp
      JOIN 
        vessel v ON vp.vessel_id = v.id
      WHERE
        v.active = true
    `;

    const results = await this.trackingRepository.query(query);

    // Format as GeoJSON
    const features = results.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        vessel_id: row.vessel_id,
        name: row.name,
        vessel_type: row.vessel_type,
        registration: row.registration_number,
        length_meters: row.length_meters,
        home_port: row.home_port,
        position_time: row.position_time,
        speed_knots: row.speed_knots,
        heading: row.heading_degrees,
        status: row.status
      }
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features
    };

    // Set proper headers for GeoJSON
    res.header('Content-Type', 'application/geo+json');
    return res.send(geoJson);
  }

  @Get('vessels/:id/track')
async getVesselTrackGeoJSON(
  @Param('id') id: string,
  @Query('start') start: string,
  @Query('end') end: string,
  @Query('simplified') simplified: string,
  @Res() res: Response
) {
  try {
    const vesselId = parseInt(id, 10);
    const startTime = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24h
    const endTime = end ? new Date(end) : new Date();
    const useSimplified = simplified === 'true';
    
    // First check if the vessel exists
    const vessel = await this.vesselRepository.findOne({ where: { id: vesselId } });
    if (!vessel) {
      return res.status(404).send({ message: 'Vessel not found' });
    }
    
    // Debug log the exact query we're about to run
    console.log(`Running ${useSimplified ? 'simplified' : 'regular'} track query for vessel ${vesselId} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    let query = '';
    let params = [];
    
    if (useSimplified) {
      // Get field structure directly from database for simplified track
      const checkQuery = await this.trackingRepository.query(
        `SELECT * FROM get_vessel_simplified_track($1, $2, $3) LIMIT 0`, 
        [vesselId, startTime, endTime]
      );
      console.log('Simplified track function columns:', Object.keys(checkQuery[0] || {}));
      
      query = `SELECT * FROM get_vessel_simplified_track($1, $2, $3)`;
      params = [vesselId, startTime, endTime];
    } else {
      // Get field structure directly from database for regular track
      const checkQuery = await this.trackingRepository.query(
        `SELECT * FROM get_vessel_track($1, $2, $3) LIMIT 0`, 
        [vesselId, startTime, endTime]
      );
      console.log('Regular track function columns:', Object.keys(checkQuery[0] || {}));
      
      query = `SELECT * FROM get_vessel_track($1, $2, $3)`;
      params = [vesselId, startTime, endTime];
    }
    
    const results = await this.trackingRepository.query(query, params);
    console.log(`Query returned ${results.length} results`);
    
    if (results.length === 0) {
      return res.status(404).send({ message: 'No track data found for this vessel in the specified time range' });
    }

    // Log the structure of the first result for debugging
    console.log('Result structure:', Object.keys(results[0]));
    
    // Format as GeoJSON
    const features = results.map(row => {
      // Handle different potential column names based on function return type
      const startTimeField = row.track_start_time || row.start_time;
      const endTimeField = row.track_end_time || row.end_time;
      const numPointsField = row.num_points || row.original_points || 0;
      
      // Check if geom is already parsed or needs parsing
      let geometry;
      try {
        geometry = typeof row.geom === 'string' ? JSON.parse(row.geom) : {
          type: 'LineString',
          coordinates: row.geom
        };
      } catch (e) {
        console.error('Error parsing geometry:', e);
        // Provide fallback geometry
        geometry = {
          type: 'LineString',
          coordinates: [[0, 0], [0, 0]]
        };
      }
      
      return {
        type: 'Feature',
        geometry: geometry,
        properties: {
          vessel_id: row.vessel_id,
          vessel_name: row.vessel_name,
          start_time: startTimeField,
          end_time: endTimeField,
          distance_nm: parseFloat(row.distance_nm || 0).toFixed(2),
          avg_speed: row.avg_speed ? parseFloat(row.avg_speed).toFixed(1) : null,
          max_speed: row.max_speed ? parseFloat(row.max_speed).toFixed(1) : null,
          num_points: numPointsField
        }
      };
    });

    const geoJson = {
      type: 'FeatureCollection',
      features
    };

    // Set proper headers for GeoJSON
    res.header('Content-Type', 'application/geo+json');
    return res.send(geoJson);
  } catch (error) {
    console.error('Error in getVesselTrackGeoJSON:', error);
    return res.status(500).send({ 
      message: 'Error retrieving vessel track',
      error: error.message 
    });
  }
}

  @Get('vessels/all/tracks')
  async getAllVesselTracksGeoJSON(
    @Query('hours') hours: string,
    @Query('simplified') simplified: string,
    @Res() res: Response
  ) {
    const hoursBack = hours ? parseInt(hours, 10) : 24;
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const endTime = new Date();
    const useSimplified = simplified === 'true';
    
    // Get all active vessels
    const vessels = await this.vesselRepository.find({ where: { active: true } });
    
    const features = [];
    
    // Get track for each vessel
    for (const vessel of vessels) {
      let query = '';
      let params = [];
      
      if (useSimplified) {
        query = `SELECT * FROM get_vessel_simplified_track($1, $2, $3, 15)`;
        params = [vessel.id, startTime, endTime];
      } else {
        query = `SELECT * FROM get_vessel_track($1, $2, $3)`;
        params = [vessel.id, startTime, endTime];
      }
      
      const results = await this.trackingRepository.query(query, params);
      
      if (results.length > 0) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: JSON.parse(results[0].geom)
          },
          properties: {
            vessel_id: vessel.id,
            vessel_name: vessel.name,
            vessel_type: vessel.vessel_type,
            start_time: results[0].track_start_time,
            end_time: results[0].track_end_time,
            distance_nm: parseFloat(results[0].distance_nm).toFixed(2),
            avg_speed: results[0].avg_speed ? parseFloat(results[0].avg_speed).toFixed(1) : null,
            max_speed: results[0].max_speed ? parseFloat(results[0].max_speed).toFixed(1) : null
          }
        });
      }
    }

    const geoJson = {
      type: 'FeatureCollection',
      features
    };

    // Set proper headers for GeoJSON
    res.header('Content-Type', 'application/geo+json');
    return res.send(geoJson);
  }

  @Get('vessels/windowed')
  async getWindowedPositionsGeoJSON(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('window') window: string,
    @Res() res: Response
  ) {
    const startTime = start ? new Date(start) : new Date(Date.now() - 6 * 60 * 60 * 1000); // Default 6h
    const endTime = end ? new Date(end) : new Date();
    const windowMinutes = window ? parseInt(window, 10) : 15; // Default 15-minute windows
    
    const query = `SELECT * FROM get_vessel_positions_windowed($1, $2, $3)`;
    const results = await this.trackingRepository.query(query, [startTime, endTime, windowMinutes]);
    
    // Format as GeoJSON
    const features = results.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(JSON.stringify(row.geom)),
      properties: {
        id: row.id,
        vessel_id: row.vessel_id,
        vessel_name: row.vessel_name,
        vessel_type: row.vessel_type,
        position_time: row.position_time,
        window_start: row.window_start,
        window_end: row.window_end,
        speed_knots: row.speed_knots,
        heading: row.heading_degrees,
        status: row.status
      }
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features
    };

    // Set proper headers for GeoJSON
    res.header('Content-Type', 'application/geo+json');
    return res.send(geoJson);
  }

  @Get('vessels/stats')
  async getVesselStatsGeoJSON(@Res() res: Response) {
    // First refresh the stats view to ensure up-to-date data
    await this.trackingRepository.query('SELECT refresh_vessel_stats()');
    
    // Get latest position for each vessel to use for geometry
    const query = `
      SELECT 
        vs.*,
        ST_AsGeoJSON(vp.geom) as geometry
      FROM 
        vessel_stats vs
      JOIN 
        vessel_latest_positions vp ON vs.vessel_id = vp.vessel_id
    `;
    
    const results = await this.trackingRepository.query(query);
    
    // Format as GeoJSON
    const features = results.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        vessel_id: row.vessel_id,
        vessel_name: row.vessel_name,
        vessel_type: row.vessel_type,
        position_count: row.position_count,
        first_position_time: row.first_position_time,
        last_position_time: row.last_position_time,
        time_since_last_position: row.time_since_last_position,
        avg_speed: parseFloat(row.avg_speed).toFixed(1),
        max_speed: parseFloat(row.max_speed).toFixed(1),
        speed_95th_percentile: parseFloat(row.speed_95th_percentile).toFixed(1),
        total_distance_nm: parseFloat(row.total_distance_nm).toFixed(2),
        avg_speed_over_ground: parseFloat(row.avg_speed_over_ground).toFixed(1)
      }
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features
    };

    // Set proper headers for GeoJSON
    res.header('Content-Type', 'application/geo+json');
    return res.send(geoJson);
  }
}