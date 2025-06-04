import os

wms_sources = {
    "Presets": {
        "url": os.environ.get("GEOMET_WEATHER_NIGHTLY_URL", default="https://geo.weather.gc.ca/geomet"),
        "version": "1.3.0",
        "display": True,
    },
    "Weather": {
        "url": "https://geo.weather.gc.ca/geomet",
        "version": "1.3.0",
        "display": not os.environ.get("ANIMET_NIGHTLY", default=False),
    },
    "Climate": {
        "url": "https://geo.weather.gc.ca/geomet-climate",
        "version": "1.3.0",
        "display": not os.environ.get("ANIMET_NIGHTLY", default=False),
    },
    "WeatherNightly": {
        "url": os.environ.get("GEOMET_WEATHER_NIGHTLY_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "ClimateNightly": {
        "url": os.environ.get("GEOMET_CLIMATE_NIGHTLY_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "WeatherDev": {
        "url": os.environ.get("GEOMET_WEATHER_DEV_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "ClimateDev": {
        "url": os.environ.get("GEOMET_CLIMATE_DEV_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "WeatherStage": {
        "url": os.environ.get("GEOMET_WEATHER_STAGE_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "ClimateStage": {
        "url": os.environ.get("GEOMET_CLIMATE_STAGE_URL", default=""),
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "MapProxy": {
        "url": os.environ.get("GEOMET_MAPPROXY_NIGHTLY_URL", default=""),
        "version": "1.3.0",
        "no_translations": True,
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "ECMWF": {
        "url": "https://eccharts.ecmwf.int/wms/?token=public",
        "version": "1.3.0",
        "display": True,
    },
    "NOAA - nowCOAST": {
        "url": "https://nowcoast.noaa.gov/geoserver/ows",
        "version": "1.3.0",
        "query_pattern": "https://nowcoast.noaa.gov/geoserver{LAYER}/ows",
        "no_translations": True,
        "display": True,
    },
    "NOAA - NCEP": {
        "url": "https://opengeo.ncep.noaa.gov/geoserver/ows",
        "version": "1.3.0",
        "query_pattern": "https://opengeo.ncep.noaa.gov/geoserver{LAYER}/ows",
        "no_translations": True,
        "display": True,
    },
    "NASA": {
        "url": "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
        "version": "1.3.0",
        "display": True,
    },
    "GEBCO": {
        "url": "https://wms.gebco.net/mapserv",
        "version": "1.3.0",
        "no_translations": True,
        "display": True,
    },
    "NRCan": {
        "url": "https://maps.geogratis.gc.ca/wms/canvec_en",
        "url_fr": "https://maps.geogratis.gc.ca/wms/canvec_fr",
        "version": "1.3.0",
        "display": True,
    },
    "MRNFTerritories": {
        "url": "https://servicescarto.mern.gouv.qc.ca/pes/services/Territoire/SDA_WMS/MapServer/WmsServer",
        "version": "1.3.0",
        "display": True,
    }
}
