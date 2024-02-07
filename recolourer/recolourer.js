function main() {
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");

  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  const previewCanvas = document.getElementById("colour-preview");
  const previewGL = previewCanvas.getContext("webgl2");

  const renderProgram = createProgram(gl, TEXTURE_VS, RENDER_FS);
  const renderLocations = createLocations(gl, renderProgram, ["position"], ["image", "preview", "mode", "rgb", "colours", "levels"])
  const texture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  const previewProgram = createProgram(previewGL, TEXTURE_VS, RENDER_FS);
  const previewLocations = createLocations(previewGL, previewProgram, ["position"], ["image", "preview", "mode", "rgb", "colours", "levels"]);
  
  const positionBuffer = makeBuffer(gl, new Float32Array([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1
  ]), gl.STATIC_DRAW);
  const renderVertexArray = makeVertexArray(gl, [[positionBuffer, renderLocations.position, 2, gl.FLOAT]]);

  const previewPositionBuffer = makeBuffer(previewGL, new Float32Array([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1
  ]), previewGL.STATIC_DRAW);
  const previewVertexArray = makeVertexArray(previewGL, [[previewPositionBuffer, previewLocations.position, 2, previewGL.FLOAT]]);
  
  let imageWidth, imageHeight;
  let imageName;
  let imageIsLoaded = false;
  function loadImage(filename) {
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;

    let image = new Image();
    image.src = filename;
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.naturalWidth, image.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      [imageWidth, imageHeight] = [image.naturalWidth, image.naturalHeight];

      imageName = filename;
      imageIsLoaded = true;

      render();
    }
  }

  const params = {
    mode: 0, 
    rgb: false, 
    colours: new Array(4).fill(0).map((v, i) => [0, 0, i / 3, 1]), 
    levels: new Array(4).fill(0).map((v, i) => i / 3), 
    invert: false, 
  }

  function render(print = false) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let imageAspect = imageWidth / imageHeight;
      let correctionFactor = clientAspect / imageAspect;
      if (clientAspect < imageAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(renderProgram);
    
    gl.bindVertexArray(renderVertexArray);
    gl.uniform1i(renderLocations.invert, true);
    bindTextureToLocation(gl, renderLocations.image, 0, texture);
    gl.uniform1i(renderLocations.preview, false);
    gl.uniform1i(renderLocations.mode, params.mode);
    gl.uniform1i(renderLocations.rgb, params.rgb);
    gl.uniformMatrix4fv(renderLocations.colours, false, params.invert ? params.colours.toReversed().flat() : params.colours.flat());
    gl.uniform4fv(renderLocations.levels, params.levels);

    drawTexture(gl, null, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }

  // setting up preview window
  previewCanvas.width = previewGL.canvas.clientWidth;
  previewCanvas.height = previewGL.canvas.clientHeight

  const blankTexture = createTexture(previewGL);
  previewGL.texImage2D(previewGL.TEXTURE_2D, 0, previewGL.RGBA, previewCanvas.width, previewCanvas.height, 0, previewGL.RGBA, previewGL.UNSIGNED_BYTE, null);
  const blankTextureFramebuffer = createFramebuffer(previewGL, blankTexture);
  
  setFramebuffer(previewGL, blankTextureFramebuffer, previewCanvas.width, previewCanvas.height);
  previewGL.clearColor(1, 1, 1, 1);
  previewGL.clear(previewGL.COLOR_BUFFER_BIT);

  function updatePreview() {
    previewGL.useProgram(previewProgram);
    previewGL.bindVertexArray(previewVertexArray);
    bindTextureToLocation(previewGL, previewLocations.image, 0, blankTexture);
    previewGL.uniform1i(previewLocations.preview, true);
    previewGL.uniform1i(previewLocations.mode, params.mode);
    previewGL.uniform1i(previewLocations.rgb, params.rgb);
    previewGL.uniformMatrix4fv(previewLocations.colours, false, params.invert ? params.colours.toReversed().flat() : params.colours.flat());
    previewGL.uniform4fv(previewLocations.levels, params.levels);
    drawTexture(previewGL, null, 0, 0, previewCanvas.width, previewCanvas.height);
  
    render();
  }

  // controls
  // presets
  const presetSelector = document.getElementById("preset");
  let currentPresetName;
  function applyPreset(id) {
    let preset = presets[id];
    console.log("applying preset", preset);
    presetNameInput.value = currentPresetName = preset.name;

    modeSelector.value = params.mode = preset.mode;

    rgbSelector.checked = params.rgb = preset.rgb;

    params.colours = new Array(4).fill(0).map((v, i) => new Array(...preset.colours[i]));
    params.levels = Array.of(...preset.levels);
    updateSliders();

    updateChannelOptions();

    updatePreview();
    // render();
  }

  for (let preset in presets) {
    let option = new Option();
    option.value = preset;
    option.textContent = presets[preset].name;
    presetSelector.appendChild(option);
    option.addEventListener('click', () => applyPreset(preset));
  }

  // colouring mode
  const modeSelector = document.getElementById("mode");
  modeSelector.addEventListener('change', () => {
    params.mode = parseInt(modeSelector.value);
    updateChannelOptions();
    updatePreview();
  });

  const rgbSelector = document.getElementById("rgb");
  rgbSelector.addEventListener('change', () => {
    if (!rgbSelector.checked) {
      params.rgb = false;
    } else {
      params.rgb = true;
    }
    updateChannelOptions();
    updatePreview();
  });

  // colour selector
  let selectedChannel = 0;
  const channelSelector = document.getElementById("channel");
  selectedChannel = parseInt(channelSelector.value);
  channelSelector.addEventListener('change', () => {
    selectedChannel = parseInt(channelSelector.value);
    updateSliders();
  });
  
  let channelOptions = new Array(4).fill(0).map((v, i) => document.getElementById("channel" + (i + 1)));
  const rgbChannelNames = ["Red", "Green", "Blue", "Position"];
  const hsvChannelNames = ["Hue", "Saturation", "Value", "Position"];
  function updateChannelOptions() {
    channelOptions.forEach((option, i) => {
      option.textContent = params.rgb ? rgbChannelNames[i] : hsvChannelNames[i];
    });
    channelOptions[3].disabled = params.mode != 0;
  }

  // sliders
  const sliders = [];
  const outputs = [];
  for (let i = 0; i < 4; i++) {
    let input = document.getElementById("input" + (i + 1));
    let output = document.getElementById("output" + (i + 1));
    sliders[i] = input;
    outputs[i] = output;
    input.addEventListener('input', () => {
      let value = parseFloat(input.value);
      if (selectedChannel == 3) {
        params.levels[i] = value;
      } else {
        params.colours[i][selectedChannel] = value;
      }
      output.textContent = value;
      updatePreview();
    });
  }

  function updateSliders() {
    sliders.forEach((slider, i) => {
      if (selectedChannel == 3) {
        slider.value = params.levels[i];
        outputs[i].textContent = params.levels[i];
      } else {
        slider.value = params.colours[i][selectedChannel];
        outputs[i].textContent = params.colours[i][selectedChannel];
      }
    });
  }

  const invertButton = document.getElementById("invert");
  invertButton.checked = false;
  invertButton.addEventListener('change', () => {
    if (invertButton.checked) {
      params.invert = true;
    } else {
      params.invert = false;
    }
    updatePreview();
    render();
  })

  // interactivity
  const filenameInput = document.getElementById("filename");
  const loadButton = document.getElementById("load");
  loadButton.addEventListener("click", () => {
    console.log("loading image");
    loadImage(filenameInput.value);
  });

  const revertButton = document.getElementById("revert");
  revertButton.addEventListener('click', () => {
    applyPreset(presetSelector.value);
  });

  const presetNameInput = document.getElementById("custom-name");
  function savePreset() {
    let preset = {};
    preset.name = presetNameInput.value;
    let key = "".concat(...preset.name.toLowerCase().split(' '));
    preset.mode = params.mode;
    preset.rgb = params.rgb;
    preset.colours = params.colours;
    preset.levels = params.levels;

    if (!presets.hasOwnProperty(key)) { // checks if preset with the same name exists
      let option = new Option(preset.name, key)
      presetSelector.appendChild(option);
      option.addEventListener('click', () => applyPreset(key));
    }
    presets[key] = preset; // updates or adds new preset
  }
  const savePresetButton = document.getElementById("save-preset");
  savePresetButton.addEventListener('click', savePreset);

  // initialise
  applyPreset("greyscale");

  const downloadAnchor = document.getElementById("download");
  function screenshot() {
    if (!imageIsLoaded) {
      alert("Image not loaded");
      return;
    }

    canvas.width = imageWidth;
    canvas.height = imageHeight;
    render(true);

    let url = canvas.toDataURL();
    downloadAnchor.href = url;
    downloadAnchor.download = imageName.slice(0, imageName.length - 4) + "_" + currentPresetName + ".png";
    downloadAnchor.click();

    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    render();
  }
  document.getElementById("screenshot").addEventListener('click', screenshot);
}

const presets = {
  greyscale: {
    name: "Greyscale", 
    mode: 0,
    rgb: false, 
    colours: [
      [0, 0, 0, 1], 
      [0, 0, 1, 1], 
      [0, 0, 0, 1], 
      [0, 0, 0, 1]
    ],
    levels: [0, 1, 0, 0]
  }, 
  magma: {
    name: "Magma", 
    mode: 0,
    rgb: false, 
    colours: [
      [2/3, 1, 0, 1], 
      [1, 2/3, 2/3, 1], 
      [0, 2/3, 2/3, 1], 
      [1/6, 0.3, 1, 1]
    ],
    levels: [0, 2/3, 2/3, 1]
  }, 
  viridis: {
    name: "Viridis", 
    mode: 0,
    rgb: false, 
    colours: [
      [0.8, 1, 0.25, 1], 
      [0.55, 0.7, 0.5, 1], 
      [5/12, 0.75, 0.65, 1], 
      [0.14, 0.9, 1, 1]
    ],
    levels: [0, 1/3, 2/3, 1]
  }, 
  plasma: {
    name: "Plasma", 
    mode: 0, 
    rgb: false, 
    colours: [
      [2/3, 1, 0.45, 1], 
      [1, 0.65, 0.85, 1], 
      [0, 0.65, 0.85, 1], 
      [1/6, 0.9, 1, 1]
    ], 
    levels: [0, 0.55, 0.55, 1]
  }, 
  spectral: {
    name: "Spectral", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0.75, 0.5, 0.63, 1],
      [0.25, 0.5, 0.7, 1], 
      [0.167,0.25, 1, 1], 
      [0, 1, 0.61, 1], 
    ], 
    levels: [0, 0.33, 0.5, 1]
  }, 
  bluetoyellow: {
    name: "Blue to Yellow", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0.625, 0.9, 0.34, 1],
      [0.556, 0.83, 0.72, 1], 
      [0.42, 0.3, 0.83, 1], 
      [0.167, 0.14, 1, 1], 
    ], 
    levels: [0, 0.333, 0.667, 1]
  }, 
  greentopurple: {
    name: "Purple to Green", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0.4, 1, 0.25, 1],
      [0.4, 0, 1, 1], 
      [0.8, 0, 1, 1], 
      [0.8, 1, 0.3, 1], 
    ], 
    levels: [0, 0.5, 0.5, 1]
  }, 
  bluetored: {
    name: "Blue to Red", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0.59, 1, 0.4, 1],
      [0.59, 0, 1, 1], 
      [0.95, 0, 1, 1], 
      [0.95, 1, 0.4, 1], 
    ], 
    levels: [0, 0.5, 0.5, 1]
  }, 
  hot: {
    name: "Hot", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0, 1, 0, 1],
      [0.083, 1, 1, 1], 
      [0.167, 0.48, 1, 1], 
      [0.167, 0, 1, 1], 
    ], 
    levels: [0, 0.504, 0.756, 1]
  }, 
  hsv: {
    name: "HSV", 
    mode: 0, 
    rgb: false, 
    colours: [
      [0, 1, 1, 1],
      [1, 1, 1, 1], 
      [1, 1, 1, 1], 
      [1, 1, 1, 1], 
    ], 
    levels: [0, 1, 1, 1]
  }, 
  redgreencoords: {
    name: "Red Green Coords", 
    mode: 1, 
    rgb: true, 
    colours: [
      [0, 0, 0.5, 1],
      [1, 0, 0.5, 1], 
      [1, 1, 0.5, 1], 
      [0, 1, 0.5, 1], 
    ], 
    levels: [0, 0, 0, 0]
  }, 
}

main();