Demo Tiles
  Virker

Convert to GSON
  KML->GSON

Implement Keycloak
  Admin, API

* Layout
  Tailwind CSS
    Admin, Frontend


++++++ Tue 1st April

* TailWind CSS
* Få det til at ligne showcase




Okay, Let us start by creating the whole module. Instead of only the entity class.

The module should be called volta-depth.


Basically the api for this module should allow a user to upload GeoJSON documents for various tiles in the volta river.
The tiles are fixed, see attached files.

People should be able to upload a single tile at a time. We should automatically be able to deduce the actual tile from the contents of the JSON document.
I've attached a subset for a single tile. Real data is around 30MB per tile.

So we need these two tables
volta_depth_tile   (id (AA,BB,CC...), created, last_updated, numberOfFeatures)
volta_depth_tile_feature (from previously)


Let us define how it should work. We only want to create the API, not the angular app, we do that later.

User -> Drags an drop a GEOJson document to angular component that we create.

The document is uploaded to the server, which checks that it is valid.
That all the features are within a single tile.

The user is now shown a create/update dialog.
A create dialog if it is the first time we upload the tile, otherwise a replacement dialog.
Should have Tile ID/NAme, created date, last edited data. A MapLibre preview. And a [Cancel] button, and a Create or Update button.
If create or update the geojson features should be created in the database, and if replacing an existing tile the old once should be deleted.

Now this is kind of like a two stage process. I don't think we should persist them until after the create/update is pushed.
So sae them in memory?
I think we can maintain the GeoJSON document in the browser and use it directly for MapLibre as well instead of using the TileServer.

Martin Tileserver has already been setup.

Can we start by outlying the files we need to create and api methods


