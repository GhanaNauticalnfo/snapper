import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('database_statistics')
export class DatabaseStatistics {
  @PrimaryColumn('date')
  date: Date;

  @Column('decimal', { precision: 10, scale: 4, name: 'vessel_telemetry_size_gb' })
  vesselTelemetrySizeGb: number;

  @Column('bigint', { name: 'vessel_telemetry_count' })
  vesselTelemetryCount: string; // bigint is returned as string from postgres

  toResponseDto() {
    return {
      date: typeof this.date === 'string' ? this.date : this.date.toISOString().split('T')[0],
      vesselTelemetrySizeGb: parseFloat(this.vesselTelemetrySizeGb.toString()),
      vesselTelemetryCount: parseInt(this.vesselTelemetryCount, 10)
    };
  }
}