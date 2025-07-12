# Past Track Feature - Mission and Implementation Plan

## Mission Statement

The Past Track feature will enable users to visualize and analyze historical vessel movements through an intuitive playback interface. This feature will transform raw telemetry data into actionable insights by allowing users to:
- Review vessel movements over any time period
- Analyze patterns and behaviors through speed-controlled playback
- Investigate incidents or verify compliance with time-based evidence
- Export and share historical movement data

## User Experience Vision

Users will have a YouTube-like playback experience for vessel tracks:
- Select any vessel and time range (start date/time to end date/time, or start to now)
- Control playback with play/pause buttons and adjustable speed (0.25x to 60x)
- Navigate through time using an interactive timeline scrubber
- See real-time date/time display when hovering over the timeline
- Watch smooth animated vessel movement along historical paths

## Technical Architecture

### Backend Implementation

#### 1. API Endpoints

**Track Data Retrieval**
```
GET /api/vessels/:vesselId/tracks
Query Parameters:
  - startDate: ISO 8601 datetime
  - endDate: ISO 8601 datetime (optional, defaults to now)
  - maxPoints: number (optional, for data reduction)
  - includeInterpolated: boolean (optional, for smoother playback)
Response: Array of tracking points with timestamps, positions, speed, heading
```

**Track Summary**
```
GET /api/vessels/:vesselId/tracks/summary
Response: {
  earliestPoint: datetime,
  latestPoint: datetime,
  totalPoints: number,
  averageInterval: seconds
}
```

**Track Export**
```
GET /api/vessels/:vesselId/tracks/export
Query Parameters: Same as tracks endpoint
Response: CSV/KML file with track data
```

#### 2. WebSocket Implementation

**Namespace**: `/vessel-tracks`

**Client Events**:
- `start-playback`: Begin streaming track data
  ```typescript
  {
    vesselId: number,
    startTime: string,
    endTime: string,
    speed: number,
    currentTime?: string // for resuming
  }
  ```
- `pause-playback`: Pause current playback
- `seek-playback`: Jump to specific time
  ```typescript
  {
    vesselId: number,
    seekTime: string
  }
  ```
- `set-speed`: Change playback speed
  ```typescript
  {
    speed: number // 0.25 to 60
  }
  ```

**Server Events**:
- `track-update`: Stream position updates
  ```typescript
  {
    timestamp: string,
    position: [lon, lat],
    speed: number,
    heading: number,
    interpolated?: boolean
  }
  ```
- `playback-complete`: Notifies when track ends
- `playback-error`: Error during playback

#### 3. Database Optimizations

**New Indexes**:
```sql
-- Compound index for efficient time-range queries
CREATE INDEX idx_vessel_telemetry_vessel_time 
ON vessel_telemetry(vessel_id, timestamp DESC);

-- Spatial-temporal index for area-based historical queries
CREATE INDEX idx_vessel_telemetry_position_time 
ON vessel_telemetry USING GIST(position, timestamp);
```

**Data Reduction Strategy**:
- For time ranges > 24 hours: Reduce to 1 point per minute
- For time ranges > 7 days: Reduce to 1 point per 5 minutes
- For time ranges > 30 days: Reduce to 1 point per 15 minutes
- Always keep significant points (course changes > 30°, speed changes > 5 knots)

### Frontend Implementation

#### 1. Component Architecture

**VesselTrackPlayerComponent**
- Main container for playback controls
- Manages playback state and WebSocket connection
- Components:
  - Date/time range pickers
  - Playback controls (play/pause/stop)
  - Speed selector with custom input
  - Timeline scrubber
  - Current time display
  - Track statistics (distance, average speed)

**VesselTrackTimelineComponent**
- Interactive timeline visualization
- Features:
  - Colored segments for speed ranges
  - Markers for stops (speed < 0.5 knots)
  - Hover tooltip showing exact date/time
  - Click to seek functionality
  - Zoom in/out for different time scales

**VesselTrackLayerService**
- Extends BaseLayerService for map integration
- Responsibilities:
  - Render track polyline with speed-based coloring
  - Animate vessel marker along track
  - Show time-based popups
  - Handle track simplification based on zoom

#### 2. Shared Models

```typescript
// libs/shared-models/src/lib/vessel-track.model.ts
export interface VesselTrackPoint {
  timestamp: string;
  position: [number, number]; // [lon, lat]
  speed: number;
  heading: number;
  interpolated?: boolean;
}

export interface VesselTrackSummary {
  vesselId: number;
  earliestPoint: string;
  latestPoint: string;
  totalPoints: number;
  totalDistance: number;
  averageSpeed: number;
}

export interface TrackPlaybackState {
  playing: boolean;
  currentTime: string;
  speed: number;
  progress: number; // 0-100
}

export interface TrackPlaybackOptions {
  vesselId: number;
  startTime: string;
  endTime: string;
  initialSpeed: number;
  autoPlay: boolean;
}
```

#### 3. UI/UX Design

**Playback Control Panel**:
```
┌─────────────────────────────────────────────────┐
│ Vessel Track Player - [Vessel Name]             │
├─────────────────────────────────────────────────┤
│ From: [2024-01-01 00:00] To: [2024-01-02 00:00]│
├─────────────────────────────────────────────────┤
│  ▶️  ||  ⏹️  |  Speed: [1.0x ▼]  Custom: [___] │
├─────────────────────────────────────────────────┤
│ ────●───────────────────────────────────────    │
│ Jan 1, 14:30:45                                 │
├─────────────────────────────────────────────────┤
│ Distance: 245 nm | Avg Speed: 12.5 kts         │
└─────────────────────────────────────────────────┘
```

**Speed Options**:
- Preset: 0.25x, 0.5x, 0.75x, 1x (Normal), 1.25x, 1.5x, 2x, 5x, 10x, 30x, 60x
- Custom input: Allow any value between 0.1x and 60x

**Timeline Visualization**:
- Color coding: Green (0-5 kts), Yellow (5-15 kts), Orange (15-25 kts), Red (25+ kts)
- Stop markers: Red dots where vessel was stationary > 10 minutes
- Hover effect: Magnified view of timeline segment with exact timestamp

### Integration Strategy

#### 1. Admin Application Integration
- Add "View Track" button to vessel detail page
- New tab in vessel tracking view for historical data
- Bulk track export functionality for fleet analysis

#### 2. Frontend Application Integration
- Add track player as optional feature (permission-based)
- Simplified controls for public users
- Share track URL functionality

#### 3. Mobile Considerations
- Responsive design for track player controls
- Touch-friendly timeline scrubbing
- Reduced data mode for mobile connections

### Performance Optimization

#### 1. Data Streaming
- Implement adaptive bitrate streaming based on connection speed
- Pre-fetch next segment during playback
- Cache recently viewed tracks in IndexedDB

#### 2. Rendering Optimization
- Use WebGL for track rendering with large datasets
- Implement level-of-detail (LOD) for track lines
- Cluster close points at low zoom levels

#### 3. Memory Management
- Limit in-memory track points to visible time window
- Implement sliding window for long tracks
- Clean up WebSocket connections on component destroy

### Testing Strategy

#### 1. Unit Tests
- Track data reduction algorithms
- Playback speed calculations
- Timeline interaction logic

#### 2. Integration Tests
- WebSocket connection reliability
- API endpoint performance with large datasets
- Cross-browser timeline compatibility

#### 3. E2E Tests
- Complete playback workflow
- Seek and speed change responsiveness
- Export functionality

### Security Considerations

1. **Access Control**
   - Vessel track access based on user permissions
   - Time range restrictions for sensitive vessels
   - Audit logging for track views

2. **Data Privacy**
   - Option to exclude certain time periods
   - Anonymization for public track sharing
   - Compliance with maritime data regulations

### Future Enhancements

1. **Multi-vessel Playback**
   - Synchronize tracks for multiple vessels
   - Collision/near-miss detection
   - Fleet movement patterns

2. **Advanced Analytics**
   - Port visit detection and duration
   - Speed limit compliance checking
   - Fuel consumption estimation

3. **Environmental Integration**
   - Weather overlay for historical conditions
   - Sea state correlation
   - Current/tide effects visualization

### Implementation Timeline

**Phase 1 (Week 1-2)**: Backend Development
- API endpoints
- Database optimizations
- Basic WebSocket implementation

**Phase 2 (Week 3-4)**: Core Frontend
- Track player component
- Timeline implementation
- Basic map integration

**Phase 3 (Week 5-6)**: Integration & Polish
- Admin app integration
- Performance optimization
- Testing and bug fixes

**Phase 4 (Week 7-8)**: Advanced Features
- Export functionality
- Mobile optimization
- Documentation and training

### Success Metrics

1. **Performance**
   - Track load time < 2 seconds for 24-hour period
   - Smooth playback at 60fps
   - WebSocket latency < 100ms

2. **Usability**
   - User can start playback within 3 clicks
   - Timeline seek accuracy within 1 second
   - Speed change response < 200ms

3. **Adoption**
   - 80% of users utilize track feature within first month
   - Average session time > 5 minutes
   - Positive feedback score > 4.5/5

## Conclusion

The Past Track feature will provide powerful vessel movement analysis capabilities while maintaining excellent performance and user experience. By implementing this feature, Ghana Waters will offer state-of-the-art vessel tracking visualization that rivals leading maritime platforms.