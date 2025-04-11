// features/vessels/mock-vessel-data.ts
import { VesselDataset } from './models/vessel-dataset.model';

// Function to create random date within the last 30 days
function randomRecentDate(): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  
  return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
}

// Function to create a random position within Lake Volta area
function generateVoltaPosition() {
  // Lake Volta rough coordinates: 6.5°N to 9.5°N, 0°E to 1.5°E
  return {
    latitude: parseFloat((Math.random() * (9.5 - 6.5) + 6.5).toFixed(6)),
    longitude: parseFloat((Math.random() * 1.5).toFixed(6))
  };
}

// Generate 25 mock vessel records related to Ghana/Lake Volta
export const MOCK_VESSELS: VesselDataset[] = [
  {
    id: 1,
    name: 'Akosombo Explorer',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 6.301885, longitude: 0.051682 },
    created: new Date('2023-01-15T08:30:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 2,
    name: 'Black Volta',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 6.682791, longitude: 0.184252 },
    created: new Date('2023-02-03T14:15:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 3,
    name: 'Adomi Bridge Cruiser',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: { latitude: 6.103081, longitude: 0.072913 },
    created: new Date('2023-02-17T11:45:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 4,
    name: 'Accra Star',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-03-05T09:20:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 5,
    name: 'Kumasi Queen',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-03-22T16:40:00'),
    last_updated: randomRecentDate(),
    enabled: false
  },
  {
    id: 6,
    name: 'Cape Coast Navigator',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-04-10T07:55:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 7,
    name: 'Volta Lake Transporter',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 7.135765, longitude: 0.164211 },
    created: new Date('2023-04-28T13:10:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 8,
    name: 'Ghana Pride',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-05-15T10:25:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 9,
    name: 'Tamale Fisher',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: { latitude: 8.029323, longitude: 0.268581 },
    created: new Date('2023-06-02T15:50:00'),
    last_updated: randomRecentDate(),
    enabled: false
  },
  {
    id: 10,
    name: 'Kwame Nkrumah',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-06-20T08:15:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 11,
    name: 'Elmina Trader',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 7.785811, longitude: 0.492505 },
    created: new Date('2023-07-07T12:30:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 12,
    name: 'Keta Adventurer',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-07-25T09:45:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 13,
    name: 'Takoradi Express',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 6.940847, longitude: 0.415515 },
    created: new Date('2023-08-12T14:00:00'),
    last_updated: randomRecentDate(),
    enabled: false
  },
  {
    id: 14,
    name: 'Volta Dam Surveyor',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-08-30T11:20:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 15,
    name: 'Ashanti Explorer',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: { latitude: 8.371338, longitude: 0.835194 },
    created: new Date('2023-09-17T10:35:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 16,
    name: 'Ho Voyager',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-10-05T16:50:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 17,
    name: 'Yeji Ferry',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 8.266669, longitude: 0.766670 },
    created: new Date('2023-10-23T08:05:00'),
    last_updated: randomRecentDate(),
    enabled: false
  },
  {
    id: 18,
    name: 'Afram Plains Fisher',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-11-10T13:25:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 19,
    name: 'Tema Harvester',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 7.302711, longitude: 0.177216 },
    created: new Date('2023-11-28T10:40:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 20,
    name: 'Dodi Island Transporter',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2023-12-15T15:55:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 21,
    name: 'Akosombo Fisher',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: { latitude: 6.572645, longitude: 0.163892 },
    created: new Date('2024-01-02T09:10:00'),
    last_updated: randomRecentDate(),
    enabled: false
  },
  {
    id: 22,
    name: 'Kpando Spirit',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2024-01-20T14:30:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 23,
    name: 'Akatsi Voyager',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 7.286461, longitude: 0.076230 },
    created: new Date('2024-02-07T11:45:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 24,
    name: 'Dwarf Island Ferry',
    type: 'Canoe',
    last_seen: randomRecentDate(),
    last_position: generateVoltaPosition(),
    created: new Date('2024-02-25T16:00:00'),
    last_updated: randomRecentDate(),
    enabled: true
  },
  {
    id: 25,
    name: 'Lake Volta Explorer',
    type: 'Vessel',
    last_seen: randomRecentDate(),
    last_position: { latitude: 7.043740, longitude: 0.268209 },
    created: new Date('2024-03-15T09:15:00'),
    last_updated: randomRecentDate(),
    enabled: true
  }
];