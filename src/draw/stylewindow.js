import Origo from 'Origo';
import styleTemplate from './styletemplate';
import drawHandler from './drawhandler';

let annotationField;
let swStyle = {};
const swDefaults = {
  fillColor: 'rgb(0,153,255)',
  fillOpacity: 0.75,
  strokeColor: 'rgb(0,153,255)',
  strokeOpacity: 1,
  strokeWidth: 2,
  strokeType: 'line',
  pointSize: 10,
  pointType: 'circle',
  textSize: 20,
  textString: 'Text',
  textFont: '"Helvetica Neue", Helvetica, Arial, sans-serif'
};

function rgbToArray(colorString, opacity = 1) {
  const colorArray = colorString.replace(/[^\d,.]/g, '').split(',');
  colorArray[3] = opacity;
  return colorArray;
}

swDefaults.fillColorArr = rgbToArray(swDefaults.fillColor, swDefaults.fillOpacity);
swDefaults.strokeColorArr = rgbToArray(swDefaults.strokeColor, swDefaults.strokeOpacity);

function createRegularShape(type, size, fill, stroke) {
  let style;
  switch (type) {
    case 'square':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.RegularShape({
          fill,
          stroke,
          points: 4,
          radius: size,
          angle: Math.PI / 4
        })
      });
      break;

    case 'triangle':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.RegularShape({
          fill,
          stroke,
          points: 3,
          radius: size,
          rotation: 0,
          angle: 0
        })
      });
      break;

    case 'star':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.RegularShape({
          fill,
          stroke,
          points: 5,
          radius: size,
          radius2: size / 2.5,
          angle: 0
        })
      });
      break;

    case 'cross':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.RegularShape({
          fill,
          stroke,
          points: 4,
          radius: size,
          radius2: 0,
          angle: 0
        })
      });
      break;

    case 'x':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.RegularShape({
          fill,
          stroke,
          points: 4,
          radius: size,
          radius2: 0,
          angle: Math.PI / 4
        })
      });
      break;

    case 'circle':
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.Circle({
          fill,
          stroke,
          radius: size
        })
      });
      break;

    default:
      style = new Origo.ol.style.Style({
        image: new Origo.ol.style.Circle({
          fill,
          stroke,
          radius: size
        })
      });
  }
  return style;
}

function setFillColor(color) {
  swStyle.fillColor = color;
  swStyle.fillColorArr = rgbToArray(swStyle.fillColor, swStyle.fillOpacity);
}

function setStrokeColor(color) {
  swStyle.strokeColor = color;
  swStyle.strokeColorArr = rgbToArray(swStyle.strokeColor, swStyle.strokeOpacity);
}

function getStyleObject() {
  return Object.assign({}, swStyle);
}

function restoreStylewindow() {
  document.getElementById('o-draw-style-fill').classList.remove('hidden');
  document.getElementById('o-draw-style-stroke').classList.remove('hidden');
  document.getElementById('o-draw-style-point').classList.remove('hidden');
  document.getElementById('o-draw-style-text').classList.remove('hidden');
}

function updateStylewindow(feature) {
  let geometryType = feature.getGeometry().getType();
  swStyle = Object.assign(swStyle, feature.get('style'));
  if (feature.get(annotationField)) {
    geometryType = 'TextPoint';
  }
  switch (geometryType) {
    case 'LineString':
    case 'MultiLineString':
      document.getElementById('o-draw-style-fill').classList.add('hidden');
      document.getElementById('o-draw-style-point').classList.add('hidden');
      document.getElementById('o-draw-style-text').classList.add('hidden');
      break;
    case 'Polygon':
    case 'MultiPolygon':
      document.getElementById('o-draw-style-point').classList.add('hidden');
      document.getElementById('o-draw-style-text').classList.add('hidden');
      break;
    case 'Point':
    case 'MultiPoint':
      document.getElementById('o-draw-style-text').classList.add('hidden');
      break;
    case 'TextPoint':
      document.getElementById('o-draw-style-stroke').classList.add('hidden');
      document.getElementById('o-draw-style-point').classList.add('hidden');
      break;
    default:
      break;
  }
  document.getElementById('o-draw-style-pointSizeSlider').value = swStyle.pointSize;
  document.getElementById('o-draw-style-pointType').value = swStyle.pointType;
  document.getElementById('o-draw-style-textSizeSlider').value = swStyle.textSize;
  document.getElementById('o-draw-style-textString').value = swStyle.textString;
  swStyle.strokeColor = swStyle.strokeColor.replace(/ /g, '');
  const strokeEl = document.getElementById('o-draw-style-strokeColor');
  const strokeInputEl = strokeEl.querySelector(`input[value = "${swStyle.strokeColor}"]`);
  if (strokeInputEl) {
    strokeInputEl.checked = true;
  } else {
    const checkedEl = document.querySelector('input[name = "strokeColorRadio"]:checked');
    if (checkedEl) {
      checkedEl.checked = false;
    }
  }
  document.getElementById('o-draw-style-strokeWidthSlider').value = swStyle.strokeWidth;
  document.getElementById('o-draw-style-strokeOpacitySlider').value = swStyle.strokeOpacity;
  document.getElementById('o-draw-style-strokeType').value = swStyle.strokeType;

  const fillEl = document.getElementById('o-draw-style-fillColor');
  swStyle.fillColor = swStyle.fillColor.replace(/ /g, '');
  const fillInputEl = fillEl.querySelector(`input[value = "${swStyle.fillColor}"]`);
  if (fillInputEl) {
    fillInputEl.checked = true;
  } else {
    const checkedEl = document.querySelector('input[name = "fillColorRadio"]:checked');
    if (checkedEl) {
      checkedEl.checked = false;
    }
  }
  document.getElementById('o-draw-style-fillOpacitySlider').value = swStyle.fillOpacity;
}

function getStylewindowStyle(feature, featureStyle) {
  const styleObj = Object.assign(swStyle, featureStyle);
  let geometryType = feature.getGeometry().getType();
  if (feature.get(annotationField)) {
    geometryType = 'TextPoint';
  }
  const style = [];
  let lineDash;
  if (styleObj.strokeType === 'dash') {
    lineDash = [3 * styleObj.strokeWidth, 3 * styleObj.strokeWidth];
  } else if (styleObj.strokeType === 'dash-point') {
    lineDash = [3 * styleObj.strokeWidth, 3 * styleObj.strokeWidth, 0.1, 3 * styleObj.strokeWidth];
  } else if (styleObj.strokeType === 'point') {
    lineDash = [0.1, 3 * styleObj.strokeWidth];
  } else {
    lineDash = false;
  }

  const stroke = new Origo.ol.style.Stroke({
    color: styleObj.strokeColorArr,
    width: styleObj.strokeWidth,
    lineDash
  });
  const fill = new Origo.ol.style.Fill({
    color: styleObj.fillColorArr
  });
  const font = `${styleObj.textSize}px ${styleObj.textFont}`;
  switch (geometryType) {
    case 'LineString':
    case 'MultiLineString':
      style[0] = new Origo.ol.style.Style({
        stroke
      });
      break;
    case 'Polygon':
    case 'MultiPolygon':
      style[0] = new Origo.ol.style.Style({
        fill,
        stroke
      });
      break;
    case 'Point':
    case 'MultiPoint':
      style[0] = createRegularShape(styleObj.pointType, styleObj.pointSize, fill, stroke);
      break;
    case 'TextPoint':
      style[0] = new Origo.ol.style.Style({
        text: new Origo.ol.style.Text({
          text: styleObj.textString || 'Text',
          font,
          fill
        })
      });
      feature.set(annotationField, styleObj.textString || 'Text');
      break;
    default:
      style[0] = createRegularShape(styleObj.pointType, styleObj.pointSize, fill, stroke);
      break;
  }
  return style;
}

function styleFeature() {
  drawHandler.getSelection().forEach((feature) => {
    const style = feature.getStyle();
    style[0] = getStylewindowStyle(feature)[0];
    feature.set('style', getStyleObject());
    feature.setStyle(style);
  });
}

function bindUIActions() {
  let matches;
  const fillColorEl = document.getElementById('o-draw-style-fillColor');
  const strokeColorEl = document.getElementById('o-draw-style-strokeColor');

  matches = fillColorEl.querySelectorAll('span');
  for (let i = 0; i < matches.length; i += 1) {
    matches[i].addEventListener('click', function e() {
      setFillColor(this.style.backgroundColor);
      styleFeature();
    });
  }

  matches = strokeColorEl.querySelectorAll('span');
  for (let i = 0; i < matches.length; i += 1) {
    matches[i].addEventListener('click', function e() {
      setStrokeColor(this.style.backgroundColor);
      styleFeature();
    });
  }

  document.getElementById('o-draw-style-fillOpacitySlider').addEventListener('input', function e() {
    swStyle.fillOpacity = this.value;
    setFillColor(swStyle.fillColor);
    styleFeature();
  });

  document.getElementById('o-draw-style-strokeOpacitySlider').addEventListener('input', function e() {
    swStyle.strokeOpacity = this.value;
    setStrokeColor(swStyle.strokeColor);
    styleFeature();
  });

  document.getElementById('o-draw-style-strokeWidthSlider').addEventListener('input', function e() {
    swStyle.strokeWidth = this.value;
    styleFeature();
  });

  document.getElementById('o-draw-style-strokeType').addEventListener('change', function e() {
    swStyle.strokeType = this.value;
    styleFeature();
  });

  document.getElementById('o-draw-style-pointType').addEventListener('change', function e() {
    swStyle.pointType = this.value;
    styleFeature();
  });

  document.getElementById('o-draw-style-pointSizeSlider').addEventListener('input', function e() {
    swStyle.pointSize = this.value;
    styleFeature();
  });

  document.getElementById('o-draw-style-textString').addEventListener('input', function e() {
    swStyle.textString = this.value;
    styleFeature();
  });

  document.getElementById('o-draw-style-textSizeSlider').addEventListener('input', function e() {
    swStyle.textSize = this.value;
    styleFeature();
  });
}

function Stylewindow(optOptions = {}) {
  const {
    title = 'Anpassa stil',
    cls = 'control overflow-hidden hidden',
    target,
    closeIcon = '#ic_close_24px',
    style = '',
    palette = ['rgb(240,179,50)','rgb(234,84,49)','rgb(166,66,121)','rgb(59,159,106)','rgb(44,88,141)','rgb(140,130,132)','rgb(239,200,121)','rgb(239,143,118)','rgb(154,116,142)','rgb(178,194,162)','rgb(143,168,200)','rgb(230,227,228)',     'rgb(255,230,50)','rgb(236,31,1)','rgb(178,223,138)','rgb(51,160,44)','rgb(0,0,0)']
  } = optOptions;

  annotationField = optOptions.annotation || 'annonation';
  swStyle = Object.assign(swDefaults, optOptions.swDefaults);

  let stylewindowEl;
  let titleEl;
  let headerEl;
  let contentEl;
  let closeButton;

  palette.forEach((item, index) => {
    const colorArr = rgbToArray(palette[index]);
    palette[index] = `rgb(${colorArr[0]},${colorArr[1]},${colorArr[2]})`;
  });

  const closeWindow = function closeWindow() {
    stylewindowEl.classList.toggle('hidden');
  };

  return Origo.ui.Component({
    closeWindow,
    onInit() {
      const headerCmps = [];

      titleEl = Origo.ui.Element({
        cls: 'flex row justify-start margin-y-small margin-left text-weight-bold',
        style: 'width: 100%;',
        innerHTML: `${title}`
      });
      headerCmps.push(titleEl);

      closeButton = Origo.ui.Button({
        cls: 'small round margin-top-small margin-right-small margin-bottom-auto margin-right icon-smaller grey-lightest no-shrink',
        icon: closeIcon,
        validStates: ['initial', 'hidden'],
        click() {
          closeWindow();
        }
      });
      headerCmps.push(closeButton);

      headerEl = Origo.ui.Element({
        cls: 'flex justify-end grey-lightest',
        components: headerCmps
      });

      contentEl = Origo.ui.Element({
        cls: 'o-draw-stylewindow-content overflow-auto',
        innerHTML: `${styleTemplate(palette, swStyle)}`
      });

      this.addComponent(headerEl);
      this.addComponent(contentEl);

      this.on('render', this.onRender);
      document.getElementById(target).appendChild(Origo.ui.dom.html(this.render()));
      this.dispatch('render');
      bindUIActions();
    },
    onRender() {
      stylewindowEl = document.getElementById('o-draw-stylewindow');
    },
    render() {
      let addStyle;
      if (style !== '') {
        addStyle = `style="${style}"`;
      } else {
        addStyle = '';
      }
      return `<div id="o-draw-stylewindow" class="${cls} flex">
                  <div class="absolute flex column no-margin width-full height-full" ${addStyle}>
                    ${headerEl.render()}
                    ${contentEl.render()}
                  </div>
                </div>`;
    }
  });
}

export {
  Stylewindow,
  restoreStylewindow,
  updateStylewindow,
  getStylewindowStyle
};
