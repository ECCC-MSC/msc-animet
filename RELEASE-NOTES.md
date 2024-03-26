# Release Notes

## Version 2.0.2 (2024-03-26)

### Bug Fixes
- Update GeoMet-Weather 2.26.2 layer list

## Version 2.0.1 (2024-01-08)

### Bug Fixes
- Fixed issue with UTC locale display
- Fixed issue with playback pausing on minimize
- Fixed missing space after Ref time

## Version 2.0.0 (2023-12-21)

### New Features
- Complete redesign and overhaul of the user interface
- Fully-functional mobile support
- Addition of wall clock on outputted animations
- Improved animation generation workflow with support for multiple aspect ratios and resolutions

### Enhancements
- User time preference (UTC/Local) now persists between sessions
- Permalink now updates directly in the browser's address bar

### Bug Fixes
- Fixed issue where playhead would be located outside of temporal bounds
- Fixed issue where legend resize handle would be misaligned

## Version 1.3.1 (2023-12-07)

### Bug Fixes
- Update GeoMet-Weather layer list

## Version 1.3.0 (2023-10-18)

### New Features
- Display raw values for displayed layers on map clicks

### Enhancements
- Add support for building AniMet using custom WMS sources
  - Add instructions in the README on how to change WMS sources
- Reduce filename length by keeping only the "begin" timestamp
- Add option to display legends with a coloured border
- Add a "Replay" button when at the last timestep
- Add Matamo tracking to trace "Create animation" button clicks
- Add option to switch basemap to a white (blank) background
- Add a contributions and security guide
- Add a tooltip on clock icon in the layers configuratiopn panel for non-time-enabled layers
- Display north arrow if map is rotated
- Remember light/dark mode setting in browser cache
- Improved error handling for missing timesteps or bad requests

### Bug Fixes
- Non-default model runs to update correctly in output animation
- Fixed a time formatting issue
- Fixed various colour issues when changing to dark mode
- Missing legend selection checkbox now displays when in dark mode
- Spamming the play and pause button no longer causes unintended animation issues and timestep skips
- Prevent a case of adding the same layer more than once
- Long layer names in the layer configuration panel no longer cuts off the opacity, visibility and remove controls
- Fixed an infinite loop case when a layer was broken or unavailable

## Version 1.2.2 (2023-07-11)

### Bug Fixes
- Remove use of LANG query when fetching dimensions from GetCapabilities

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
