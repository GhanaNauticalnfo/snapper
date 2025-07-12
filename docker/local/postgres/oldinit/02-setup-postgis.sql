-- Ensure PostGIS extension is installed
CREATE EXTENSION IF NOT EXISTS postgis;

-- Optimize the tracking_point table for spatial queries
-- First, create spatial index on position column
CREATE INDEX IF NOT EXISTS idx_tracking_point_position
ON tracking_point USING GIST(position);

-- Create indices for common query patterns
CREATE INDEX IF NOT EXISTS idx_tracking_point_vessel_timestamp 
ON tracking_point(vessel_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_tracking_point_timestamp 
ON tracking_point(timestamp);

-- Create a view that combines vessel and latest tracking point data
CREATE OR REPLACE VIEW vessel_latest_positions AS
WITH latest_points AS (
  SELECT 
    DISTINCT ON (vessel_id) id
  FROM 
    tracking_point
  ORDER BY 
    vessel_id, timestamp DESC
)
SELECT 
  tp.id,
  tp.timestamp AS position_time,
  tp.vessel_id,
  v.name as vessel_name,
  v.registration_number,
  v.vessel_type,
  v.length_meters,
  tp.speed_knots,
  tp.heading_degrees,
  tp.status,
  tp.created,
  tp.position AS geom
FROM 
  tracking_point tp
JOIN
  latest_points lp ON tp.id = lp.id
JOIN
  vessel v ON tp.vessel_id = v.id
WHERE
  v.active = true;

-- Create a view for all tracking points with vessel info
CREATE OR REPLACE VIEW vessel_tracking_points AS
SELECT 
  tp.id,
  tp.timestamp AS position_time,
  tp.vessel_id,
  v.name as vessel_name,
  v.registration_number,
  v.vessel_type,
  tp.speed_knots,
  tp.heading_degrees,
  tp.status,
  tp.created,
  tp.position AS geom
FROM 
  tracking_point tp
JOIN
  vessel v ON tp.vessel_id = v.id;

-- Type conversion to match return type to actual values
DROP FUNCTION IF EXISTS get_vessel_track;

CREATE OR REPLACE FUNCTION get_vessel_track(
  vessel_id_param integer, 
  start_time timestamp with time zone, 
  end_time timestamp with time zone
)
RETURNS TABLE (
  vessel_id integer,
  vessel_name text,
  track_start_time timestamp with time zone,
  track_end_time timestamp with time zone,
  num_points integer,
  distance_nm double precision,
  avg_speed double precision,    -- Keep as double precision
  max_speed double precision,    -- Keep as double precision
  geom geometry
) AS $$
BEGIN
  RETURN QUERY
  WITH ordered_points AS (
    SELECT 
      tp.vessel_id,
      v.name as vessel_name,
      tp.timestamp AS position_time,
      tp.speed_knots,
      tp.position::geometry as point_geom
    FROM 
      tracking_point tp
    JOIN
      vessel v ON tp.vessel_id = v.id
    WHERE 
      tp.vessel_id = vessel_id_param
      AND tp.timestamp BETWEEN start_time AND end_time
    ORDER BY 
      tp.timestamp
  )
  SELECT 
    vessel_id_param,
    MAX(op.vessel_name),
    MIN(op.position_time),
    MAX(op.position_time),
    COUNT(*)::integer AS num_points,
    ST_Length(ST_MakeLine(op.point_geom ORDER BY op.position_time)::geography)/1852,
    AVG(op.speed_knots)::double precision,  -- Cast to double precision
    MAX(op.speed_knots)::double precision,  -- Cast to double precision
    ST_MakeLine(op.point_geom ORDER BY op.position_time)
  FROM 
    ordered_points op
  GROUP BY 
    op.vessel_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get a simplified track (with reduced points for performance)
CREATE OR REPLACE FUNCTION get_vessel_simplified_track(
  vessel_id_param integer, 
  start_time timestamp with time zone, 
  end_time timestamp with time zone,
  tolerance_meters numeric DEFAULT 10.0
)
RETURNS TABLE (
  vessel_id integer,
  vessel_name text,
  track_start_time timestamp with time zone,
  track_end_time timestamp with time zone,
  original_points integer,
  simplified_points integer,
  distance_nm numeric,
  geom geometry
) AS $$
DECLARE
  full_track geometry;
  simplified_track geometry;
  original_point_count integer;
  simplified_point_count integer;
BEGIN
  -- Get full track
  SELECT 
    ST_MakeLine(tp.position::geometry ORDER BY tp.timestamp),
    COUNT(*)
  INTO full_track, original_point_count
  FROM tracking_point tp
  WHERE 
    tp.vessel_id = vessel_id_param
    AND tp.timestamp BETWEEN start_time AND end_time;
    
  -- Create simplified track using Douglas-Peucker algorithm
  simplified_track := ST_SimplifyPreserveTopology(full_track, tolerance_meters);
  simplified_point_count := ST_NPoints(simplified_track);
  
  RETURN QUERY
  SELECT 
    vessel_id_param,
    v.name,
    start_time,
    end_time,
    original_point_count,
    simplified_point_count,
    ST_Length(full_track::geography)/1852 AS distance_nm,
    simplified_track
  FROM 
    vessel v
  WHERE 
    v.id = vessel_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get a time-windowed view of vessel positions
-- This handles variable position frequency (10s when moving, 5min when stationary)
CREATE OR REPLACE FUNCTION get_vessel_positions_windowed(
  start_time timestamp with time zone, 
  end_time timestamp with time zone,
  window_minutes integer DEFAULT 5
)
RETURNS TABLE (
  id integer,
  vessel_id integer,
  vessel_name text,
  vessel_type text,
  position_time timestamp with time zone,
  window_start timestamp with time zone,
  window_end timestamp with time zone,
  speed_knots numeric,
  heading_degrees numeric,
  status text,
  geom geometry
) AS $$
BEGIN
  RETURN QUERY
  WITH time_windows AS (
    -- Generate time windows based on parameter
    SELECT 
      generate_series(
        start_time, 
        end_time, 
        (window_minutes || ' minutes')::interval
      ) AS window_start
  ),
  windowed_positions AS (
    -- For each vessel and time window, get the most recent position
    SELECT DISTINCT ON (v.id, tw.window_start)
      v.id AS vessel_id,
      v.name AS vessel_name,
      v.vessel_type,
      tw.window_start,
      tw.window_start + ((window_minutes || ' minutes')::interval) AS window_end,
      tp.timestamp AS position_time,
      tp.id,
      tp.speed_knots,
      tp.heading_degrees,
      tp.status,
      tp.position::geometry AS geom
    FROM 
      vessel v
    CROSS JOIN 
      time_windows tw
    LEFT JOIN 
      tracking_point tp ON 
        tp.vessel_id = v.id AND 
        tp.timestamp <= tw.window_start + ((window_minutes || ' minutes')::interval) AND
        tp.timestamp >= tw.window_start - ((window_minutes*2) || ' minutes')::interval
    WHERE 
      v.active = true
    ORDER BY 
      v.id, tw.window_start, tp.timestamp DESC
  )
  SELECT 
    wp.id,
    wp.vessel_id,
    wp.vessel_name,
    wp.vessel_type,
    wp.position_time,
    wp.window_start,
    wp.window_end,
    wp.speed_knots,
    wp.heading_degrees,
    wp.status,
    wp.geom
  FROM 
    windowed_positions wp
  WHERE
    wp.position_time IS NOT NULL
  ORDER BY 
    wp.vessel_id, wp.window_start;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for vessel statistics
-- This can be refreshed periodically for dashboard reporting
CREATE MATERIALIZED VIEW vessel_stats AS
WITH point_distances AS (
  -- First calculate point-to-point distances in a separate CTE
  SELECT
    tp.vessel_id,
    tp.timestamp AS position_time,
    tp.position,
    tp.speed_knots,
    LAG(tp.timestamp) OVER (PARTITION BY tp.vessel_id ORDER BY tp.timestamp) AS prev_time,
    LAG(tp.position) OVER (PARTITION BY tp.vessel_id ORDER BY tp.timestamp) AS prev_position,
    -- Calculate distance to previous point when available
    CASE 
      WHEN LAG(tp.position) OVER (PARTITION BY tp.vessel_id ORDER BY tp.timestamp) IS NOT NULL
      THEN ST_Distance(
             tp.position::geography, 
             LAG(tp.position) OVER (PARTITION BY tp.vessel_id ORDER BY tp.timestamp)::geography
           )/1852 -- Convert to nautical miles
      ELSE 0
    END AS distance_to_prev_nm
  FROM 
    tracking_point tp
  WHERE
    tp.timestamp > NOW() - INTERVAL '30 days'
),
vessel_summaries AS (
  SELECT 
    pd.vessel_id,
    v.name AS vessel_name,
    v.vessel_type,
    COUNT(*) AS position_count,
    MIN(pd.position_time) AS first_position_time,
    MAX(pd.position_time) AS last_position_time,
    AVG(pd.speed_knots) AS avg_speed,
    MAX(pd.speed_knots) AS max_speed,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pd.speed_knots) AS speed_95th_percentile,
    SUM(pd.distance_to_prev_nm) AS total_distance_nm
  FROM 
    point_distances pd
  JOIN
    vessel v ON pd.vessel_id = v.id
  GROUP BY
    pd.vessel_id, v.name, v.vessel_type
)
SELECT 
  vessel_id,
  vessel_name,
  vessel_type,
  position_count,
  first_position_time,
  last_position_time,
  NOW() - last_position_time AS time_since_last_position,
  avg_speed,
  max_speed,
  speed_95th_percentile,
  total_distance_nm,
  CASE 
    WHEN EXTRACT(EPOCH FROM (last_position_time - first_position_time)) > 0
    THEN total_distance_nm / (EXTRACT(EPOCH FROM (last_position_time - first_position_time))/3600)
    ELSE 0
  END AS avg_speed_over_ground
FROM 
  vessel_summaries;

CREATE UNIQUE INDEX ON vessel_stats(vessel_id);

-- Create a function to refresh the stats
CREATE OR REPLACE FUNCTION refresh_vessel_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW vessel_stats;
END;
$$ LANGUAGE plpgsql;