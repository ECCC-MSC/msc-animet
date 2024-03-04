# MSC AniMet

## Overview

MSC AniMet is a simple tool enabling users to interact with MSC Open Data weather data and create custom weather animations for any area in the world. The resulting animations can be downloaded and shared with a permalink.

MSC AniMet can be used to showcase a diversity of weather events such as storms, heat waves, hurricane trajectories, air quality events, extreme wind gusts, and much more.

In its current incarnation, MSC AniMet provides access to [GeoMet-Weather](https://eccc-msc.github.io/open-data/msc-geomet/readme_en/) layers.

A publically available version can be found at [https://eccc-msc.github.io/msc-animet/](https://eccc-msc.github.io/msc-animet/) and the [associated documentation](https://eccc-msc.github.io/open-data/msc-animet/readme_en/) is available via the [Meteorological Service of Canada open data documentation](https://eccc-msc.github.io/open-data/).

## Installation

### Requirements

- Node.js

### Dependencies

Dependencies are listed in [package.json](package.json). Dependencies
are automatically installed during `MSC AniMet` installation.

### Installing msc-animet

```bash
# clone codebase and install
git clone https://github.com/ECCC-MSC/msc-animet.git
cd msc-animet
npm i
```

## Running

```bash
npm run serve
```

Server will be located at http://localhost:8080/msc-animet/

Note: The path will be different if you changed the BASE_URL in the .env file

## Building for deployment

```bash
npm run build
```

## Development

Bugs, enhancements and issues may be posted on [GitHub](https://github.com/ECCC-MSC/msc-animet/issues), but most are managed internally.

### Updating GeoMet-Weather layer tree names

A static list of layer names and titles is generated for ease of translation and reference without needing to make a large request for the global WMS GetCapabilities document on application load. A Python script is used to update the `/src/locales/{lang}/layers` and the `/src/assets/trees/tree` json files for GeoMet Weather and GeoMet Climate. To update the layer name files, do the following (instructions for Linux):

```bash
# Set directory name of your Python virtual environment
PYTHON_VENV=generate-tree-venv

# Create Python virtual environment
python3 -m venv --system-site-packages $PYTHON_VENV

# Activate virtual env
. $PYTHON_VENV/bin/activate

# Install deps
pip install owslib

# Update layers_en|fr.json
cd ./scripts
python3 generate_trees_layers_list.py
```

### Adding custom WMS sources

If you'd like to have your own instance of AniMet with more/other WMS sources for the layer tree, it's also possible, although for it to work they need to comply with the [OpenGIS Web Map Service (WMS) Implementation Specification](https://www.ogc.org/standard/wms/). The steps are as follows:

First, on the [AniMet GitHub page](https://github.com/ECCC-MSC/msc-animet), make yourself a [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Once that's done, inside a terminal(commands shown are for a linux terminal), we will do the usual installation steps, except we'll be using your newly created fork instead, so:

```bash
git clone https://github.com/YOUR_USERNAME/msc-animet.git
cd msc-animet
npm i
git remote add upstream https://github.com/ECCC-MSC/msc-animet.git
```

Afterwards, we'll be changing the configuration file to specify which WMS sources we wish to have. That file is located inside `scripts/wms_sources_configs.json` and this is where we'll be adding our new sources. This process is quite simple; you simple give it a name, the url to the wms and the version, which would look like:

```JSON
{
  "Weather": {
    "url": "https://geo.weather.gc.ca/geomet",
    "version": "1.3.0"
  },
  "Climate": {
    "url": "https://geo.weather.gc.ca/geomet-climate",
    "version": "1.3.0"
  },
  "Test": {
    "url": "https://my_beautiful_wms",
    "version": "1.3.0"
  }
}
```

Once that's done and you've saved the file, inside the terminal, all we have left to do is to run the script to [update the layer tree](#updating-geomet-weather-layer-tree-names) and [run](#running) the application, it's that easy!
