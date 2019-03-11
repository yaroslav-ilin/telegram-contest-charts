const DataLoader = {
  load (url) {
    return fetch(url).then(function (r) {
      return r.json();
    });
  },
};
