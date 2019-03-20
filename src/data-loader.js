const DataLoader = {
  load (url) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    return new Promise((resolve, reject) => {
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(xhr.responseText);
          }
        }
      };

      xhr.send(null);
    });
  },
};
