# Deployment

The deployment instructions in this README is meant for internal use in ECCC-MSC servers.
## .env

This `.env` file is specific to the nightly server. This file will replace the default `.env` at the root application folder via the `deploy-nightly.sh` script.

## animet.conf

This is the `apache2` configuration. It enables the SPA fallback (for VueJS history mode) and ensures the path on disk is routed to the web sub-path. This apache2 configuration below seems to be the cleanest to serve the application from a `https://domain-name.ca/subpath` and to enable SPA fallback.

```conf
Alias /web/sub/path /path/on/disk/to/index.html

<Directory /path/on/disk/to/index.html/>
  Require all granted
  Options Indexes FollowSymLinks
  AllowOverride All
  FallbackResource /web/sub/path
</Directory>
```

## deploy-nightly.sh

This is the shell script to perform a nightly build. General steps are:
-  `git clone` the repository into a seperate timestamped folder name
-  Replace default `.env` with one specific to the nightly server
-  `npm install` and `npm run build`
-  Copy the `animet.conf` file into the resulting `/dist`
   - The nightly server's apache config (managed by the MSC GeoMet team) is preset to `include` the `animet.conf` from that `/dist` folder.
- Create a symlink called `latest` to the `/dist` from the timestamped app folder name
- Cron jobs on internal CMC servers is managed by the MSC GeoMet team, which will save the raw `deploy-nightly.sh` from git repo into a `/tmp` folder, execute the script and then delete it from `/tmp`

## Manual nightly deployment

This is essentially the cronjob execution:
```bash
# dev Ubuntu focal
curl https://raw.githubusercontent.com/ECCC-MSC/msc-animet/main/deploy/nightly-focal/deploy-nightly.sh -o /tmp/animet-deploy-nightly.sh && bash -f /tmp/animet-deploy-nightly.sh && rm -fr /tmp/animet-deploy-nightly.sh

# dev Ubuntu bionic (deprecated)
curl https://raw.githubusercontent.com/ECCC-MSC/msc-animet/main/deploy/nightly/deploy-nightly.sh && bash -f /tmp/animet-deploy-nightly.sh && rm -fr /tmp/animet-deploy-nightly.sh
```

## GitHub pages deployment

Ensure the following is done first:
```bash
# add remote to github repo, named "github"
git remote add github https://github.com/ECCC-MSC/msc-animet.git

# you are on main branch
git checkout main

# delete existing local branch called "gh-pages"
git branch -D gh-pages

# enable execution permission
chmod +x deploy/gh-pages/deploy.sh
```

Ensure you have `git push` access to https://github.com/ECCC-MSC/msc-animet.git
- You may need to set up a Personal Access Token from Github to `git push` via command line
- profile -> settings -> developer settings -> personal access tokens -> generate new token -> scope: repo

```bash
# if you haven't, enable the configuration for git credential.helper store
git config --global credential.helper store

# you'll be prompted to enter username and password for the first time you git push
```

### npm run deploy to GH pages

Once the above is setup, you can simply run:
```bash
npm run deploy
```

### Manual deploy to GH pages

Optionally if something goes wrong with `npm run deploy`, use these manual steps to deploy:
```bash
# clean new branch with no git history
git checkout --orphan gh-pages

# start build
npm run build
git --work-tree dist add --all
git --work-tree dist commit -m 'gh-pages deploy'

# push to gh-pages (deploy)
git push github HEAD:gh-pages --force

# delete production files
rm -r dist

# abandon gh-pages branch and checkout back to main branch
git checkout -f main

# delete the local gh-pages branch and leave no trace
git branch -D gh-pages
```