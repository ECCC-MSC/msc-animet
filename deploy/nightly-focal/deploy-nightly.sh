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
PYTHON_VENV=generate-tree-venv

echo "Deleting nightly builds > $DAYSTOKEEP days old"

cd $BASEDIR

for f in `find . -type d -name "animet-20*"`
do
    DATETIME2=`echo $f | awk -F- '{print $2}' | awk -F. '{print $1}'`
    let DIFF=(`date +%s -d $DATETIME`-`date +%s -d $DATETIME2`)/86400
    if [ $DIFF -gt $DAYSTOKEEP ]; then
        rm -fr $f
    fi
done

echo "Generating nightly build for $TIMESTAMP"
rm -fr latest
mkdir $NIGHTLYDIR && cd $NIGHTLYDIR
git clone $GITREPO . --depth=1
cp deploy/nightly-focal/.env .
echo "Setting up Python environment to generate latest layer names..."
python3 -m venv --system-site-packages $PYTHON_VENV
. $PYTHON_VENV/bin/activate
pip install owslib
cd ./scripts
echo "Generating latest layer tree_en|fr_weather|climate.js ..."
python3 generate_trees_layers_list.py
deactivate
cd ..
echo "Done. Clearing Python virtual environment..."
rm -rf $PYTHON_VENV
echo "Installing npm dependencies..."
npm install
echo "Building and bundling application files..."
npx vue-cli-service build
cp deploy/nightly-focal/animet.conf dist/
cd ..
ln -s $NIGHTLYDIR/dist latest
chmod -R 775 $NIGHTLYDIR # ensure group writable