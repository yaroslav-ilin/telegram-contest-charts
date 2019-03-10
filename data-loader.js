const DataLoader = {
  load (url) {
    return fetch(url).then(r => r.json());
  },
};
