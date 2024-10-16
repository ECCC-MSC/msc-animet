# Release Notes

## Version 2.2.2 (2024-10-16)

### Bug Fixes
- Update GeoMet-Weather layer list with removed layers

## Version 2.2.1 (2024-07-04)

### Bug Fixes
- Update GeoMet-Weather 2.30.0 layer list
- Fixed panels freezing during a loop if the connection is particularly unstable
- Fixed animation creation crashing during error handling
- Fixed layers getting removed from AniMet during idle or animation creation during connection errors
- Fixed time continuing to move forward during critical error because critical error flag wasn't triggered fast enough
- Fixed infinite error loop when non-temporal layer would fail
- Fixed bug that would prevent animation from restarting after pausing during an error
- Fixed update method of ErrorManager by placing in a try/catch block
- Fixed blockRefresh handling of ErrorManager
- Other minor fixes for improved error handling

## Version 2.2.0 (2024-06-17)

### New Features
- Added a time zone selection, saving preference to browser cache
- Added ability to save an animation frame as a JPEG
- [Experimental] 4-Displays page will now remember each panel's permalink (cannot be used on smaller screens)
- Added display of a simplified layer information during animation loop
- Updated layers list to display new GOES satellite layers

### Enhancements
- Improved file naming when downloading animation
- Upgraded OpenLayers to version 9.1
- Upgrade luxon to version 3.4.x
- Animation looping is turned on by default
- Improved how guesses work for layers where times are only comma separated and the interval isn't specified
- Added ability to remove/add layers when animation is playing; stopping the animation to perform the action
- Improved error handling when zooming and panning the map during a loop
- Changed snackbar notifications to display at the top of the page
- Improved overall error handling and logging
- Added many other quality of life improvements

### Bug Fixes
- Fixed 404 handling in nightly deployments
- Fixed various event handling issues while animation is looping
- Fixed a memory leak issue caused by use of Vuetify's progress bar
- Fixed warning message not appearing when in certain cases of legend being out of bounds of animation border
- Fixed console.error to remove DomException log spam from OpenLayers
- Fixed freezes and timesteps erroring out in certain play loop cases with network timeouts
- Pressing the Pause button will no longer change tabs to layer configs, only pressing Play does now
- Fixed legends disappearing when changing tabs during animation creation
- Fixed language-dependent legends to change depending on current UI language setting
- Adding the first time-enabled layer will now no longer snap by default
- Fixed various formatting issues with screen sizes
- Collapsed time controls now display the time in the correct format when timestep is monthly or yearly
- Fixed a bug where DOMExceptions weren't caught because the error message changed
- Fixed axios to retry 4 times, taking longer and longer between retries to reduce odds of failure on timeouts
- Many other minor bug fixes to help improve error tracing

## Version 2.1.3 (2024-06-12)

### Bug Fixes
- Re-update GeoMet-Weather 2.28.0 layer list due to timing with refreshed global get capabilities

## Version 2.1.2 (2024-06-12)

### Bug Fixes
- Update GeoMet-Weather 2.28.0 layer list

## Version 2.1.1 (2024-05-13)

### Bug Fixes
- Fixed a memory leak issue
- Fixed an issue with loading NRCan overlay in EPSG:3995
- Fixed an issue with the warning message not showing for legend placement
- Fixed an issue with zooming or panning while in a loop triggering multiple play events
- Fixed an issue when a layer doesn't refresh when you zoom or pan
- Removed a DomException error for OL that keeps appearing in console to avoid spam
- Fixed filename output by keeping dashes out
- Fixed 4-panel display to remember changes

## Version 2.1.0 (2024-04-10)

### New Features
- Added new map projections: EPSG 4326, 3978 and 3995
- Added option to display map graticules
- Ability to loop animations
- Ability to loop animations permanently
- Ability to play animation backwards
- Ability to auto-refresh layers
- Added a 4-display view for big TV displays

### Enhancements
- Changed to a cog icon for the controller playback options
- Language change is now remembered via the user's browser cache
- Updated OpenLayers from 6.13 to 6.15.1
- Active layer legend is now remembered as part of the permalink
- Minimized color picker inside an expansion panel to draw more attention to new options
- Changed the webpage favicon to use the map emoji
- Added 404/NotFound handling
- Redirects to help fix multiple backslashes
- Moved the legend selector to the style selector of each layer
- Moved the toggle for coloured borders in the animation config panel
- Legends will now always be added to the map by default for each layer added, with a small offset from one another
- Legend will now be hidden when the layer is hidden
- Added intersection logic for map legends to display warnings if they are outside the animation frame.
- Added a double click handler on legends to open the animation panel
- Improved clarity of which legends are displayed
- Added DEL keyboard shortcut to remove the selected legend
- Show current time when time controls are collapsed
- Added a manual refresh on all non time-enabled layers every 9 minutes
- Changed date display in collapsed controls to be on 2 lines
- Changed share icon and removed the Share/Partager text
- Changed zoom buttons to have 10x smaller increments for improved precision

### Bug Fixes
- Fixed a specific issue when clicking on the play button would trigger twice during a layer's rendering
- Fixed a bug where a layer would crash in Firefox on missing timestep
- Fixed an issue when translating a GetFeatureInfo "value" property
- Fixed a bug with waitForElements function
- Fixed a text length issue in the GetFeatureInfo tooltip
- Fixed an issue with legend ordering and menu sizing
- Fixed loading indicator to stay until everything is done loading

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
