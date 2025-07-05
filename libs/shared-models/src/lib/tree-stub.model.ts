export interface TreeStubGroup {
  id?: number;
  name: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
  tree_stub_count?: number;
}

export interface TreeStub {
  id?: number;
  group_id: number;
  geometry: string; // GeoJSON string or WKT
  created_at?: string;
  updated_at?: string;
}

export interface TreeStubGroupInputDto {
  name: string;
  enabled?: boolean;
}

export interface TreeStubInputDto {
  group_id: number;
  geometry: string;
}

export interface TreeStubGroupResponseDto {
  id: number;
  name: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  tree_stub_count: number;
}

export interface TreeStubResponseDto {
  id: number;
  group_id: number;
  geometry: string;
  created_at: string;
  updated_at: string;
}