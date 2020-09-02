import Origo from 'Origo';
import $ from 'jquery';
import dispatcher from './drawdispatcher';
import modal from './modal';
import defaultDrawStyle from './drawstyle';
import textForm from './textform';
import shapes from './shapes';

let map;
let drawSource;
let drawLayer;
let draw;
let activeTool;
let select;
let modify;
let annotationField;
let promptTitle;
let placeholderText;
let viewerId;
let Style;

function disableDoubleClickZoom(evt) {
  const featureType = evt.feature.getGeometry().getType();
  const interactionsToBeRemoved = [];

  if (featureType === 'Point') {
    return;
  }

  map.getInteractions().forEach((interaction) => {
    if (interaction instanceof Origo.ol.interaction.DoubleClickZoom) {
      interactionsToBeRemoved.push(interaction);
    }
  });
  if (interactionsToBeRemoved.length > 0) {
    map.removeInteraction(interactionsToBeRemoved[0]);
  }
}

function onDrawStart(evt) {
  if (evt.feature.getGeometry().getType() !== 'Point') {
    disableDoubleClickZoom(evt);
  }
}

function setActive(drawType) {
  switch (drawType) {
    case 'draw':
      select.getFeatures().clear();
      modify.setActive(true);
      select.setActive(false);
      break;
    default:
      activeTool = undefined;
      map.removeInteraction(draw);
      modify.setActive(true);
      select.setActive(true);
      break;
  }
}

function onTextEnd(feature, textVal) {
  // Remove the feature if no text is set
  if (textVal === '') {
    drawLayer.getFeatureStore().removeFeature(feature);
  } else {
    const text = defaultDrawStyle.text;
    text.text.text = textVal;
    const textStyle = Style.createStyleRule([text]);
    feature.setStyle(textStyle);
    feature.set(annotationField, textVal);
  }
  setActive();
  activeTool = undefined;
  dispatcher.emitChangeDraw('Text', false);
}

function promptText(feature) {
  const content = textForm.createForm({
    value: feature.get(annotationField) || '',
    placeHolder: placeholderText
  });
  modal.createModal(viewerId, {
    title: promptTitle,
    content
  });
  modal.showModal();
  const editableText = $('#o-draw-input-text').val();
  document.getElementById('o-draw-input-text').focus();
  $('#o-draw-input-text').on('keyup', (e) => {
    if (e.keyCode === 13) {
      $('#o-draw-save-text').trigger('click');
    }
  });
  $('#o-draw-save-text').on('click', (e) => {
    const textVal = $('#o-draw-input-text').val();
    modal.closeModal();
    $('#o-draw-save-text').blur();
    e.preventDefault();
    onTextEnd(feature, textVal);
  });
  $('.o-modal-screen, .o-close-button').on('click', (e) => {
    $('#o-draw-save-text').blur();
    e.preventDefault();
    onTextEnd(feature, editableText);
  });
}

function addDoubleClickZoomInteraction() {
  const allDoubleClickZoomInteractions = [];
  map.getInteractions().forEach((interaction) => {
    if (interaction instanceof Origo.ol.interaction.DoubleClickZoom) {
      allDoubleClickZoomInteractions.push(interaction);
    }
  });
  if (allDoubleClickZoomInteractions.length < 1) {
    map.addInteraction(new Origo.ol.interaction.DoubleClickZoom());
  }
}

function enableDoubleClickZoom() {
  setTimeout(() => {
    addDoubleClickZoomInteraction();
  }, 100);
}

function onDrawEnd(evt) {
  if (activeTool === 'Text') {
    promptText(evt.feature);
  } else {
    setActive();
    activeTool = undefined;
    dispatcher.emitChangeDraw(evt.feature.getGeometry().getType(), false);
  }
  enableDoubleClickZoom(evt);
}

function setDraw(tool, drawType) {
  let geometryType = tool;
  drawSource = drawLayer.getFeatureStore();
  activeTool = tool;

  if (activeTool === 'Text') {
    geometryType = 'Point';
  }

  const drawOptions = {
    source: drawSource,
    type: geometryType
  };

  if (drawType) {
    $.extend(drawOptions, shapes(drawType));
  }

  map.removeInteraction(draw);
  draw = new Origo.ol.interaction.Draw(drawOptions);
  map.addInteraction(draw);
  dispatcher.emitChangeDraw(tool, true);
  draw.on('drawend', onDrawEnd, this);
  draw.on('drawstart', onDrawStart, this);
}

function onDeleteSelected() {
  const features = select.getFeatures();
  let source;
  if (features.getLength()) {
    source = drawLayer.getFeatureStore();
    features.forEach((feature) => {
      source.removeFeature(feature);
    });
    select.getFeatures().clear();
  }
}

function onSelectAdd(e) {
  let feature;
  if (e.target) {
    feature = e.target.item(0);
    if (feature.get(annotationField)) {
      promptText(feature);
    }
  }
}

function cancelDraw(tool) {
  setActive();
  activeTool = undefined;
  dispatcher.emitChangeDraw(tool, false);
}

function onChangeDrawType(e) {
  activeTool = undefined;
  dispatcher.emitToggleDraw(e.tool, { drawType: e.drawType });
}

function isActive() {
  if (modify === undefined || select === undefined) {
    return false;
  }
  return true;
}

function removeInteractions() {
  if (isActive()) {
    map.removeInteraction(modify);
    map.removeInteraction(select);
    map.removeInteraction(draw);
    modify = undefined;
    select = undefined;
    draw = undefined;
  }
}

function getState() {
  if (drawLayer) {
    const source = drawLayer.getFeatureStore();
    const geojson = new Origo.ol.format.GeoJSON();
    const features = source.getFeatures();
    const json = geojson.writeFeatures(features);
    return {
      features: json
    };
  }

  return undefined;
}

function restoreState(state) {
  // TODO: Sanity/data check
  if (state.features && state.features.length > 0) {
    if (drawLayer === undefined) {
      drawLayer = Origo.featurelayer(null, map);
    }
    const source = drawLayer.getFeatureStore();
    source.addFeatures(state.features);
    source.getFeatures().forEach((feature) => {
      if (feature.get(annotationField)) {
        onTextEnd(feature, feature.get(annotationField));
      }
    });
  }
}

function toggleDraw(e) {
  e.stopPropagation();
  if (e.tool === 'delete') {
    onDeleteSelected();
  } else if (e.tool === 'cancel') {
    cancelDraw(e.tool);
    removeInteractions();
  } else if (e.tool === activeTool) {
    cancelDraw(e.tool);
  } else if (e.tool === 'Polygon' || e.tool === 'LineString' || e.tool === 'Point' || e.tool === 'Text') {
    if (activeTool) {
      cancelDraw(e.tool);
    }
    setActive('draw');
    setDraw(e.tool, e.drawType);
  }
}

function onEnableInteraction(e) {
  if (e.interaction === 'draw') {
    const drawStyle = Style.createStyleRule(defaultDrawStyle.draw);
    const selectStyle = Style.createStyleRule(defaultDrawStyle.select);

    if (drawLayer === undefined) {
      drawLayer = Origo.featurelayer(null, map);
      drawLayer.setStyle(drawStyle);
    }

    select = new Origo.ol.interaction.Select({
      layers: [drawLayer.getFeatureLayer()],
      style: selectStyle
    });
    modify = new Origo.ol.interaction.Modify({
      features: select.getFeatures()
    });

    map.addInteraction(select);
    map.addInteraction(modify);
    select.getFeatures().on('add', onSelectAdd, this);
    setActive();
  }
}

function runPolyFill() {
  // To support Function.name for browsers that don't support it. (IE)
  if (Function.prototype.name === undefined && Object.defineProperty !== undefined) {
    Object.defineProperty(Function.prototype, 'name', {
      get() {
        const funcNameRegex = /function\s([^(]{1,})\(/;
        const results = (funcNameRegex).exec((this).toString());
        return (results && results.length > 1) ? results[1].trim() : '';
      }
    });
  }
}

const getActiveTool = () => activeTool;

const init = function init(optOptions) {
  runPolyFill();

  const options = optOptions || {};
  Style = Origo.Style;

  map = options.viewer.getMap();
  viewerId = options.viewer.getMain().getId();

  annotationField = options.annonation || 'annonation';
  promptTitle = options.promptTitle || 'Ange text';
  placeholderText = options.placeholderText || 'Text som visas i kartan';
  activeTool = undefined;

  $(document).on('toggleDraw', toggleDraw);
  $(document).on('editorDrawTypes', onChangeDrawType);
  $(document).on('enableInteraction', onEnableInteraction);
};

export default {
  init,
  getState,
  restoreState,
  getActiveTool
};
