-- init-vessel.sql
-- Create a vessel for testing

INSERT INTO vessel (name, registration_number, vessel_type, length_meters, owner_name, owner_contact, home_port, active, created, last_updated)
VALUES (
  'Test Vessel 1',
  'GH-TEST-001',
  'Fishing Boat',
  12.5,
  'Ghana Maritime Authority',
  '+233 20 123 4567',
  'Tema',
  true,
  NOW(),
  NOW()
) ON CONFLICT (registration_number) DO NOTHING;

-- You can add more test vessels here if needed
INSERT INTO vessel (name, registration_number, vessel_type, length_meters, owner_name, owner_contact, home_port, active, created, last_updated)
VALUES (
  'Test Vessel 2',
  'GH-TEST-002',
  'Canoe',
  6.8,
  'Local Fishery Cooperative',
  '+233 30 765 4321',
  'Takoradi',
  true,
  NOW(),
  NOW()
) ON CONFLICT (registration_number) DO NOTHING;