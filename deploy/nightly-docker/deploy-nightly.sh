# =================================================================
#
# Author: Kevin Ngai <kevin.ngai@ec.gc.ca>
#
# Copyright (c) 2022 Kevin Ngai
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation
# files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use,
# copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following
# conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
# OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
# WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
# OTHER DEALINGS IN THE SOFTWARE.
#
# =================================================================

BASEDIR=/data/web/animet-nightly
GITREPO=https://github.com/ECCC-MSC/msc-animet.git
DAYSTOKEEP=7

# you should be okay from here

DATETIME=`date +%Y%m%d`
TIMESTAMP=`date +%Y%m%d.%H%M`
NIGHTLYDIR=animet-$TIMESTAMP

echo "Deleting AniMet nightly builds > $DAYSTOKEEP days old"

cd $BASEDIR

for f in `find . -type d -name "animet-20*"`
do
    DATETIME2=`echo $f | awk -F- '{print $2}' | awk -F. '{print $1}'`
    let DIFF=(`date +%s -d $DATETIME`-`date +%s -d $DATETIME2`)/86400
    if [ $DIFF -gt $DAYSTOKEEP ]; then
        rm -fr $f
    fi
done

echo "Generating AniMet nightly build for $TIMESTAMP"
rm -fr latest
mkdir $NIGHTLYDIR && cd $NIGHTLYDIR
git clone $GITREPO . -b main --depth=1

# Check if WMS_SOURCES_FILE exists
WMS_SOURCES_FILE=scripts/wms_sources_configs.json
if [ ! -f "$WMS_SOURCES_FILE" ]; then
  echo "File $WMS_SOURCES_FILE does not exist."
  exit 1
fi

# point to GeoMet nightly WMS server
if [ -n $GEOMET_WEATHER_NIGHTLY_URL ] && [ -n $GEOMET_CLIMATE_NIGHTLY_URL ]
then
  echo "Replacing default GeoMet URLs with nightly URLs in $WMS_SOURCES_FILE"
  sed -i "s#https://geo.weather.gc.ca/geomet#$GEOMET_WEATHER_NIGHTLY_URL#g" $WMS_SOURCES_FILE
  sed -i "s#https://geo.weather.gc.ca/geomet-climate#$GEOMET_CLIMATE_NIGHTLY_URL#g" $WMS_SOURCES_FILE
fi

# add GeoMet Mapproxy nightly as a wms source for testing
MAPPROXY_SOURCE='  "Mapproxy": {
    "url": "'"$GEOMET_MAPPROXY_NIGHTLY_URL"'",
    "version": "1.3.0"
  }'

if [ -n $GEOMET_MAPPROXY_NIGHTLY_URL ]
then
  echo "Adding GeoMet Mapproxy nightly to $WMS_SOURCES_FILE"
  # Remove the last line; the last closing brace '}' from the original file
  sed -i '$d' "$WMS_SOURCES_FILE"
  # Add comma
  sed -i '$ s/$/,/' $WMS_SOURCES_FILE
  # Append the new data and close the JSON object with '}'
  echo "$MAPPROXY_SOURCE" >> "$WMS_SOURCES_FILE"
  echo "}" >> "$WMS_SOURCES_FILE"
fi

# US NWS / NOAA layers (nightly only for testing)
NWS_NOAA_LAYERS='  "NASA": {
    "url": "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    "version": "1.3.0"
  },
  "Gebco": {
    "url": "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    "version": "1.3.0"
  },
  "NOAA-Nowcoast": {
    "url": "https://nowcoast.noaa.gov/geoserver/ows",
    "version": "1.3.0",
    "query_pattern": "https://nowcoast.noaa.gov/geoserver{LAYER}/ows"
  },
  "NOAA-NCEP": {
    "url": "https://opengeo.ncep.noaa.gov/geoserver/ows",
    "version": "1.3.0",
    "query_pattern": "https://opengeo.ncep.noaa.gov/geoserver{LAYER}/ows"
  }'

if [ -n $GEOMET_MAPPROXY_NIGHTLY_URL ]
then
  echo "Adding US NWS / NOAA layers to scripts/wms_sources_configs.json"
  # Remove the last line; the last closing brace '}' from the original file
  sed -i '$d' "$WMS_SOURCES_FILE"
  # Add comma
  sed -i '$ s/$/,/' $WMS_SOURCES_FILE
  # Append the new data and close the JSON object with '}'
  echo "$NWS_NOAA_LAYERS" >> "$WMS_SOURCES_FILE"
  echo "}" >> "$WMS_SOURCES_FILE"
fi

echo "Stopping/building/starting Docker setup"
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml down
docker container rm -f msc-animet-nightly
docker compose -f docker-compose.yml up -d

cat > animet-nightly.conf <<EOF
<Location /animet>
  ProxyPass http://localhost:5090/
  ProxyPassReverse http://localhost:5090/
  Require all granted
</Location>
EOF

cd ..

ln -s $NIGHTLYDIR latest
chmod -R 775 $NIGHTLYDIR # ensure group writable