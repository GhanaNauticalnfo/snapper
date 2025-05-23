// libs/map/src/lib/layers/nwnm/nw-nm-layer.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
// --- MapLibre Imports ---
import {
    Map,
    GeoJSONSource,
    LayerSpecification,
    GetResourceResponse, // Import the response type used by the loadImage promise
} from 'maplibre-gl';
// --- RxJS Imports ---
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
// --- GeoJSON Imports ---
import { FeatureCollection, Geometry } from 'geojson';

import { BaseLayerService } from '../base-layer.service';
import { NwNmMessage, NwNmFeatureProperties } from './nw-nm.models'; // Import specific types

// --- Configuration Constants ---
const NW_ICON_ID = 'nwnm-nw-icon';
const NM_ICON_ID = 'nwnm-nm-icon';
const NW_ICON_PATH = '/img/nwnm/nw.png'; // Ensure these paths are correct
const NM_ICON_PATH = '/img/nwnm/nm.png';

const SOURCE_ID = 'nwnm-geojson-source';

const LAYER_IDS = {
    NW_POINTS: 'nwnm-nw-points-layer',
    NM_POINTS: 'nwnm-nm-points-layer',
    NW_LINES: 'nwnm-nw-lines-layer',
    NM_LINES: 'nwnm-nm-lines-layer',
    NW_FILL: 'nwnm-nw-fill-layer',
    NM_FILL: 'nwnm-nm-fill-layer',
} as const;

@Injectable({
    providedIn: 'root',
})
export class NwNmLayerService extends BaseLayerService {
    override readonly layerId = 'nw-nm';
    private readonly apiUrl = '/rest/nw-nm/messages';
    private readonly http = inject(HttpClient);

    private map: Map | null = null;
    private isVisible = true;
    private areImagesLoaded = false;
    private managedLayerIds: string[] = Object.values(LAYER_IDS);

    constructor() {
        super();
    }

    async initialize(map: Map): Promise<void> {
        if (this.map) {
            console.warn('[NwNmLayerService] Already initialized.');
            return;
        }
        this.map = map;
        console.log('[NwNmLayerService] Initializing...');

        // --- 1. Load and Add Icons (Using Promise-based loadImage) ---
        try {
            await Promise.all([
                this.loadAndAddImageWithPromise(NW_ICON_ID, NW_ICON_PATH),
                this.loadAndAddImageWithPromise(NM_ICON_ID, NM_ICON_PATH)
            ]);
            this.areImagesLoaded = true;
            console.log('[NwNmLayerService] Icons loaded and added successfully.');
        } catch (error) {
            console.error('[NwNmLayerService] Failed to load required map icons:', error);
            this.areImagesLoaded = false;
        }

        if (!this.map) {
            console.warn('[NwNmLayerService] Initialization aborted: Map instance became null.');
            return;
        }

        // --- 2. Add GeoJSON Source ---
        if (!this.map.getSource(SOURCE_ID)) {
            try {
                this.map.addSource(SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });
                console.log(`[NwNmLayerService] Source '${SOURCE_ID}' added.`);
            } catch (error) {
                console.error(`[NwNmLayerService] Error adding source '${SOURCE_ID}':`, error);
                this.map = null;
                return;
            }
        } else {
             console.warn(`[NwNmLayerService] Source '${SOURCE_ID}' already exists.`);
        }

        // --- 3. Add Layers ---
        this.addMapLayers();

        // --- 4. Fetch Initial Data ---
        this.update().catch(err => {
            console.error('[NwNmLayerService] Initial data fetch failed:', err);
        });

        console.log('[NwNmLayerService] Initialization complete.');
    }

    /** Fetches data and updates the GeoJSON source */
    async update(): Promise<void> {
        if (!this.map || !this.map.getSource(SOURCE_ID)) {
            return;
        }
        console.log('[NwNmLayerService] Fetching NW-NM data...');
        try {
            const messages = await firstValueFrom(this.fetchNwNmMessages());
            const geojsonData = this.transformAndFilterMessagesToGeoJson(messages);
            console.log(`[NwNmLayerService] Fetched and transformed ${geojsonData.features.length} valid features.`);

            const source = this.map.getSource(SOURCE_ID) as GeoJSONSource;
            if (source) {
                source.setData(geojsonData);
                console.log(`[NwNmLayerService] Source '${SOURCE_ID}' updated.`);
            } else {
                console.error(`[NwNmLayerService] Source '${SOURCE_ID}' not found during update.`);
            }
        } catch (error) {
            console.error('[NwNmLayerService] Failed to fetch or update NW-NM data:', error);
            throw error;
        }
    }

    toggleVisibility(visible: boolean): void {
        if (!this.map) {
            console.warn('[NwNmLayerService] Cannot toggle visibility: Map not initialized.');
            return;
        }
        this.isVisible = visible;
        const newVisibility = this.isVisible ? 'visible' : 'none';
        console.log(`[NwNmLayerService] Setting visibility to: ${newVisibility}`);
        this.managedLayerIds.forEach(layerId => {
            if (this.map?.getLayer(layerId)) {
                try {
                    this.map.setLayoutProperty(layerId, 'visibility', newVisibility);
                } catch (error) {
                    console.error(`[NwNmLayerService] Error setting visibility for layer '${layerId}':`, error);
                }
            }
        });
    }

    destroy(): void {
        console.log('[NwNmLayerService] Destroying...');
        if (this.map) {
            // Standard cleanup...
            this.managedLayerIds.forEach(layerId => {
                try { if (this.map?.getLayer(layerId)) this.map.removeLayer(layerId); }
                catch (e) { console.error(`[NwNmLayerService] Error removing layer ${layerId}:`, e); }
            });
            try { if (this.map?.getSource(SOURCE_ID)) this.map.removeSource(SOURCE_ID); }
            catch (e) { console.error(`[NwNmLayerService] Error removing source ${SOURCE_ID}:`, e); }
            try { if (this.map?.hasImage(NW_ICON_ID)) this.map.removeImage(NW_ICON_ID); }
            catch (e) { console.error(`[NwNmLayerService] Error removing NW image:`, e); }
            try { if (this.map?.hasImage(NM_ICON_ID)) this.map.removeImage(NM_ICON_ID); }
            catch (e) { console.error(`[NwNmLayerService] Error removing NM image:`, e); }
        }
        this.map = null;
        this.isVisible = true;
        this.areImagesLoaded = false;
        console.log('[NwNmLayerService] Destroy complete.');
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    /**
     * Loads an image using the Promise-based map.loadImage and adds it.
     * This directly uses the signature: loadImage(url: string): Promise<...>
     */
    private async loadAndAddImageWithPromise(id: string, path: string): Promise<void> {
        if (!this.map) {
            throw new Error('Map not initialized when trying to load image.');
        }
        // Use a stable reference in case this.map changes during await
        const mapInstance = this.map;

        if (mapInstance.hasImage(id)) {
            console.log(`[NwNmLayerService] Image '${id}' already loaded.`);
            return;
        }

        try {
            // --- CORRECT USAGE based on the provided definition ---
            // Call loadImage with ONE argument (url) and await the Promise
            const response: GetResourceResponse<HTMLImageElement | ImageBitmap> = await mapInstance.loadImage(path);
            const image = response.data; // Extract the image data from the response

            // --- Post-await checks ---
            // Check if map still exists or image was added concurrently *after* await
            if (!this.map || this.map.hasImage(id)) {
                if (!this.map) console.warn(`[NwNmLayerService] Map destroyed while processing loaded image ${id}`);
                else console.warn(`[NwNmLayerService] Image '${id}' added concurrently.`);
                 // Clean up ImageBitmap if necessary (HTMLImageElement doesn't need explicit cleanup)
                if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
                    image.close();
                }
                return;
            }

            // Use the stable mapInstance reference for addImage
            mapInstance.addImage(id, image, { pixelRatio: 1 }); // Add the loaded image
            console.log(`[NwNmLayerService] Added image '${id}' using Promise loadImage.`);

        } catch (error) {
            console.error(`[NwNmLayerService] Error in loadAndAddImageWithPromise for ${id} from ${path}:`, error);
            throw error; // Re-throw to reject the outer promise
        }
    }


    /** Adds the necessary MapLibre layers for styling the source */
    private addMapLayers(): void {
        if (!this.map) return;

        const addLayerSafely = (layerConfig: LayerSpecification) => {
             if (!this.map) return;
             if (this.map.getLayer(layerConfig.id)) {
                 console.warn(`[NwNmLayerService] Layer '${layerConfig.id}' already exists. Skipping.`);
                 return;
             }
             if ('source' in layerConfig && typeof layerConfig.source === 'string' && !this.map.getSource(layerConfig.source)) {
                 console.error(`[NwNmLayerService] Cannot add layer '${layerConfig.id}' because source '${layerConfig.source}' does not exist.`);
                 return;
             }
             try {
                 this.map.addLayer(layerConfig);
                 console.log(`[NwNmLayerService] Added layer '${layerConfig.id}'.`);
             } catch (error) {
                 console.error(`[NwNmLayerService] Error adding layer '${layerConfig.id}':`, error);
             }
        };

        const initialVisibility = this.isVisible ? 'visible' : 'none';

        // Layer definitions... (Ensure this.areImagesLoaded is checked correctly)
        // NW Points
        addLayerSafely({
            id: LAYER_IDS.NW_POINTS, type: 'symbol', source: SOURCE_ID,
            filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'mainType'], 'NW']],
            layout: { 'icon-image': this.areImagesLoaded ? NW_ICON_ID : '', 'icon-size': 0.3, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': initialVisibility, },
            paint: {}
        });
         // NM Points
         addLayerSafely({
             id: LAYER_IDS.NM_POINTS, type: 'symbol', source: SOURCE_ID,
             filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'mainType'], 'NM']],
             layout: { 'icon-image': this.areImagesLoaded ? NM_ICON_ID : '', 'icon-size': 0.3, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': initialVisibility, },
             paint: {}
         });
        // NW Lines
        addLayerSafely({
            id: LAYER_IDS.NW_LINES, type: 'line', source: SOURCE_ID,
            filter: ['all', ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']], ['==', ['get', 'mainType'], 'NW']],
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': initialVisibility },
            paint: { 'line-color': '#8B008B', 'line-width': 2, 'line-opacity': 0.8 }
        });
        // NM Lines
        addLayerSafely({
            id: LAYER_IDS.NM_LINES, type: 'line', source: SOURCE_ID,
            filter: ['all', ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']], ['==', ['get', 'mainType'], 'NM']],
            layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': initialVisibility },
            paint: { 'line-color': '#8B008B', 'line-width': 2, 'line-opacity': 0.8 }
        });
        // NW Fill
        const fillPaint = { 'fill-color': '#FF00FF', 'fill-opacity': 0.2 };
        addLayerSafely({
            id: LAYER_IDS.NW_FILL, type: 'fill', source: SOURCE_ID,
            filter: ['all', ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']], ['==', ['get', 'mainType'], 'NW']],
            layout: { 'visibility': initialVisibility },
            paint: fillPaint,
        });
        // NM Fill
        addLayerSafely({
            id: LAYER_IDS.NM_FILL, type: 'fill', source: SOURCE_ID,
            filter: ['all', ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']], ['==', ['get', 'mainType'], 'NM']],
            layout: { 'visibility': initialVisibility },
            paint: fillPaint
        });
    }

    /** Fetches NW-NM messages from the backend */
    private fetchNwNmMessages(lang = 'en'): Observable<NwNmMessage[]> {
         const params = new HttpParams().set('lang', lang);
         return this.http.get<NwNmMessage[]>(this.apiUrl, { params }).pipe(
             catchError((error: HttpErrorResponse | Error | unknown) => {
                 const message = error instanceof Error ? error.message : 'Unknown API error';
                 console.error(`[NwNmLayerService] API Error fetching NW-NM messages: ${message}`, error);
                 return of([]);
             })
         );
    }

    /**
     * Transforms and filters messages into a GeoJSON FeatureCollection suitable for MapLibre's setData.
     */
    private transformAndFilterMessagesToGeoJson(
        messages: NwNmMessage[]
    ): FeatureCollection<Geometry, NwNmFeatureProperties> {
        const validFeatures: Array<GeoJSON.Feature<Geometry, NwNmFeatureProperties>> = [];

        messages.forEach((message) => {
            message.parts?.forEach((part) => {
                let geometry: Geometry | null = null;
                let properties: Partial<NwNmFeatureProperties> = {};

                if (part.geometry?.type === 'Feature') {
                    if (part.geometry.geometry) {
                        geometry = part.geometry.geometry;
                        properties = {
                            ...(part.geometry.properties || {}),
                            messageId: message.id,
                            mainType: message.mainType,
                        };
                    }
                } else if (part.geometry && ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(part.geometry.type)) {
                    geometry = part.geometry as Geometry;
                    properties = {
                        messageId: message.id,
                        mainType: message.mainType,
                    };
                }

                if (geometry && properties.messageId !== undefined && properties.mainType !== undefined) {
                    validFeatures.push({
                        type: 'Feature',
                        geometry: geometry, // Guaranteed non-null Geometry here
                        properties: properties as NwNmFeatureProperties,
                    });
                }
            });
        });

        return {
            type: 'FeatureCollection',
            features: validFeatures,
        };
    }
}


// Reminder: Ensure nw-nm.models.ts is correct
/*
// libs/map/src/lib/layers/nwnm/nw-nm.models.ts
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export interface NwNmMessagePart {
  geometry?: Feature<Geometry | null, GeoJsonProperties> | Geometry;
}
export interface NwNmMessage {
  id: number | string;
  mainType: 'NW' | 'NM';
  parts?: NwNmMessagePart[];
}
export interface NwNmFeatureProperties {
    messageId: number | string;
    mainType: 'NW' | 'NM';
    [key: string]: unknown;
}
export type NwNmFeature = Feature<Geometry | null, NwNmFeatureProperties>;
*/