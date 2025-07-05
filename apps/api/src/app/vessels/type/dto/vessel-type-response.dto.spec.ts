import { VesselType } from '../vessel-type.entity';
import { VesselTypeResponseDto } from './vessel-type-response.dto';
import { Vessel } from '../../vessel.entity';

describe('VesselType Entity toResponseDto() Method', () => {
  describe('Basic transformation', () => {
    it('should transform entity to response DTO correctly', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Cargo';
      vesselType.created_at = new Date('2024-01-01T10:00:00.000Z');
      vesselType.updated_at = new Date('2024-01-02T15:30:00.000Z');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(result).toEqual({
        id: 1,
        name: 'Cargo',
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-02T15:30:00.000Z',
        vessel_count: 0
      });
      expect(result).toBeInstanceOf(Object);
      expect(result.constructor.name).toBe('Object'); // Plain object, not class instance
    });

    it('should handle vessel type with vessels correctly', () => {
      const vessel1 = new Vessel();
      vessel1.id = 1;
      vessel1.name = 'Test Vessel 1';

      const vessel2 = new Vessel();
      vessel2.id = 2;
      vessel2.name = 'Test Vessel 2';

      const vesselType = new VesselType();
      vesselType.id = 2;
      vesselType.name = 'Fishing';
      vesselType.created_at = new Date('2024-01-01T00:00:00.000Z');
      vesselType.updated_at = new Date('2024-01-01T00:00:00.000Z');
      vesselType.vessels = [vessel1, vessel2];

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(2);
      expect(result.id).toBe(2);
      expect(result.name).toBe('Fishing');
    });
  });

  describe('Date formatting', () => {
    it('should format dates as ISO strings', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-03-15T08:30:45.123Z');
      vesselType.updated_at = new Date('2024-03-16T14:22:10.456Z');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(result.created_at).toBe('2024-03-15T08:30:45.123Z');
      expect(result.updated_at).toBe('2024-03-16T14:22:10.456Z');
      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });

    it('should handle different timezone dates correctly', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01T12:00:00+02:00'); // UTC+2
      vesselType.updated_at = new Date('2024-01-01T12:00:00-05:00'); // UTC-5
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      // Should be converted to UTC
      expect(result.created_at).toBe('2024-01-01T10:00:00.000Z');
      expect(result.updated_at).toBe('2024-01-01T17:00:00.000Z');
    });

    it('should handle edge case dates', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('1970-01-01T00:00:00.000Z'); // Unix epoch
      vesselType.updated_at = new Date('2038-01-19T03:14:07.000Z'); // Near year 2038 problem
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(result.created_at).toBe('1970-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2038-01-19T03:14:07.000Z');
    });
  });

  describe('Vessel count calculation', () => {
    it('should return 0 for empty vessel array', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date();
      vesselType.updated_at = new Date();
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(0);
    });

    it('should return 0 for undefined vessel array', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date();
      vesselType.updated_at = new Date();
      vesselType.vessels = undefined;

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(0);
    });

    it('should return 0 for null vessel array', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date();
      vesselType.updated_at = new Date();
      vesselType.vessels = null;

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(0);
    });

    it('should count vessels correctly for large arrays', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date();
      vesselType.updated_at = new Date();
      
      // Create 100 mock vessels
      vesselType.vessels = Array.from({ length: 100 }, (_, i) => {
        const vessel = new Vessel();
        vessel.id = i + 1;
        vessel.name = `Vessel ${i + 1}`;
        return vessel;
      });

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(100);
    });

    it('should handle vessel array with mixed valid/invalid vessels', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date();
      vesselType.updated_at = new Date();

      const vessel1 = new Vessel();
      vessel1.id = 1;
      vessel1.name = 'Valid Vessel';

      const vessel2 = new Vessel();
      vessel2.id = 2;
      vessel2.name = 'Another Valid Vessel';

      vesselType.vessels = [vessel1, vessel2];

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(2);
    });
  });

  describe('Special characters and internationalization', () => {
    it('should handle special characters in vessel type names', () => {
      const specialNames = [
        'Fishing & Cargo',
        'Type (Commercial)',
        'Vessel-Type_1',
        'Type with "quotes"',
        "Type with 'apostrophes'",
        'Type with / slashes',
        'Type@Email.com',
        'Type#Hash',
        'Type$Dollar',
        'Type%Percent',
        'Type^Caret',
        'Type*Star',
        'Type+Plus',
        'Type=Equal',
        'Type|Pipe',
        'Type\\Backslash',
        'Type`Backtick',
        'Type~Tilde',
        'Type[Bracket]',
        'Type{Brace}',
        'Type<Less>',
      ];

      for (const name of specialNames) {
        const vesselType = new VesselType();
        vesselType.id = 1;
        vesselType.name = name;
        vesselType.created_at = new Date('2024-01-01');
        vesselType.updated_at = new Date('2024-01-01');
        vesselType.vessels = [];

        const result = vesselType.toResponseDto();

        expect(result.name).toBe(name);
        expect(typeof result.name).toBe('string');
      }
    });

    it('should handle international characters in vessel type names', () => {
      const internationalNames = [
        'Åland Ferry', // Nordic
        'Niño Vessel', // Spanish
        'François Ship', // French
        'Müller Boat', // German
        '货船', // Chinese
        'рыболовное судно', // Cyrillic lowercase
        'РЫБОЛОВНОЕ СУДНО', // Cyrillic uppercase
        'πλοίο', // Greek
        'سفينة', // Arabic
        'ספינה', // Hebrew
        'जहाज़', // Hindi
        '船', // Japanese Kanji
        'ふね', // Japanese Hiragana
        'フネ', // Japanese Katakana
        '배', // Korean
        'เรือ', // Thai
        'kapal', // Indonesian/Malay
      ];

      for (const name of internationalNames) {
        const vesselType = new VesselType();
        vesselType.id = 1;
        vesselType.name = name;
        vesselType.created_at = new Date('2024-01-01');
        vesselType.updated_at = new Date('2024-01-01');
        vesselType.vessels = [];

        const result = vesselType.toResponseDto();

        expect(result.name).toBe(name);
        expect(typeof result.name).toBe('string');
      }
    });

    it('should handle emoji in vessel type names', () => {
      const emojiNames = [
        '🚢 Ship',
        '⛵ Sailboat',
        '🛥️ Motorboat',
        '🚤 Speedboat',
        '⛴️ Ferry',
        '🛳️ Passenger Ship',
        '🚢🌊 Ocean Vessel',
        '⚓ Anchored Ship',
      ];

      for (const name of emojiNames) {
        const vesselType = new VesselType();
        vesselType.id = 1;
        vesselType.name = name;
        vesselType.created_at = new Date('2024-01-01');
        vesselType.updated_at = new Date('2024-01-01');
        vesselType.vessels = [];

        const result = vesselType.toResponseDto();

        expect(result.name).toBe(name);
        expect(typeof result.name).toBe('string');
      }
    });
  });

  describe('Performance and memory', () => {
    it('should handle transformation of large datasets efficiently', () => {
      const vesselTypes = Array.from({ length: 1000 }, (_, i) => {
        const vesselType = new VesselType();
        vesselType.id = i + 1;
        vesselType.name = `Type ${i + 1}`;
        vesselType.created_at = new Date('2024-01-01');
        vesselType.updated_at = new Date('2024-01-01');
        vesselType.vessels = [];
        return vesselType;
      });

      const start = Date.now();
      const results = vesselTypes.map(vt => vt.toResponseDto());
      const duration = Date.now() - start;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      // Check that all transformations are correct
      results.forEach((result, index) => {
        expect(result.id).toBe(index + 1);
        expect(result.name).toBe(`Type ${index + 1}`);
        expect(result.vessel_count).toBe(0);
      });
    });

    it('should not retain references to original entity', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Original Name';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      // Modify the original entity
      vesselType.name = 'Modified Name';
      vesselType.id = 999;

      // Result should not be affected
      expect(result.name).toBe('Original Name');
      expect(result.id).toBe(1);
    });
  });

  describe('Type safety and structure', () => {
    it('should return object with correct property types', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
      expect(typeof result.vessel_count).toBe('number');
    });

    it('should have exactly the expected properties', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();
      const keys = Object.keys(result);

      expect(keys).toEqual(['id', 'name', 'created_at', 'updated_at', 'vessel_count']);
      expect(keys).toHaveLength(5);
    });

    it('should not include internal entity properties', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      // Should not include the vessels array
      expect(result).not.toHaveProperty('vessels');
      // Only check for the presence of expected properties
      expect(Object.keys(result)).toEqual(['id', 'name', 'created_at', 'updated_at', 'vessel_count']);
    });

    it('should match VesselTypeResponseDto interface structure', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      // This should compile without errors if the interface matches
      const dto: VesselTypeResponseDto = result;
      
      expect(dto.id).toBe(1);
      expect(dto.name).toBe('Test');
      expect(dto.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updated_at).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.vessel_count).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very large ID numbers', () => {
      const vesselType = new VesselType();
      vesselType.id = Number.MAX_SAFE_INTEGER;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      vesselType.vessels = [];

      const result = vesselType.toResponseDto();

      expect(result.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(result.id)).toBe(true);
    });

    it('should handle very large vessel counts', () => {
      const vesselType = new VesselType();
      vesselType.id = 1;
      vesselType.name = 'Test';
      vesselType.created_at = new Date('2024-01-01');
      vesselType.updated_at = new Date('2024-01-01');
      
      // Create a large but manageable array for testing
      vesselType.vessels = new Array(10000).fill(null).map((_, i) => {
        const vessel = new Vessel();
        vessel.id = i + 1;
        return vessel;
      });

      const result = vesselType.toResponseDto();

      expect(result.vessel_count).toBe(10000);
    });
  });
});