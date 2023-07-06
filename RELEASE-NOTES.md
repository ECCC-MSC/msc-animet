# Release Notes

## Version 1.2.1 (2023-07-06)

### Bug Fixes
- Fixed generation script, layer tree collapse and null title 

## Version 1.2.0 (2023-07-06)

### New Features
- Support for selecting NWP model runs
  - Users can now select between all available NWP model runs for a given layer 
- New centralized temporal controller
  - Improved UI/UX of time slider
  - Centralizes time management for map and animation in a single place
- Custom legend positioning
  - Click and drag legend on map to resize and reposition legend
  - Positioning and size on map is also applied on outputted animation
  - Support displaying multiple legends in output animation 

### Enhancements
- Scale line is now shown on the map
- New tooltip for non-temporal clock icon
- Major code cleanup and refactoring 

### Bug Fixes
- Permalinks now retain chosen WMS style/legend
- Layer visibility now applied via permalink
- Layers with time interval of PT0H now supported
- GeoMet-Weather layers with monthly/yearly intervals now supported
- Legend size now identical on map and output animation
- Legend now removed when associated layer is removed
- Whitespaces are now properly removed from animation title in output filename 

## Version 1.1.2 (2023-05-17)

### Bug Fixes
- Added matomo analytics tracking of user clicks

## Version 1.1.1 (2023-05-01)

### Bug Fixes
- Fixed a colour issue where it would not revert inside a permalink when making a new one.
- Fixed a typo.

## Version 1.1.0 (2023-04-27)

### New Features

- Added support for GeoMet-Climate layers.
- Added several map overlays from NRCan: boundaries, placenames and waterbodies.

### Enhancements
- Permalinks now work when only layer names are specified.
- Added basemap colour picker via new OpenLayers control.

### Bug Fixes
- Fixed a situation where a layer's legend would not be removed from the map when the layer was removed.

## Version 1.0.0 (2023-03-24)
Initial release of MSC-AniMet.
