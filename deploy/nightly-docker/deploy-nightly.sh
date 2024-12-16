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

# Certficate file needed for generate_trees_layers_list.py when building container
CERT_FILE=/usr/local/share/ca-certificates/_ICM_Root.crt
cp $CERT_FILE ./

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