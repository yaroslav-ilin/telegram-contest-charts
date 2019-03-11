function createSVGNode (tag, attrs) {
  const svgNS = 'http://www.w3.org/2000/svg';

  const node = document.createElementNS(svgNS, tag);
  Object.keys(attrs).forEach(function (k) {
    node.setAttributeNS(null, k, attrs[k]);
  });
  return node;
}

function template (template, obj) {
  return template.replace(/\{([^}]+)\}/g, function (interpolation, path) {
    return obj[path];
  });
}
