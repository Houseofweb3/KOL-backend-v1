echo "==> git pull"
git pull

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

echo "==> pm2 restart kol-backend"
pm2 restart kol-backend

echo "==> done"
