const canvas = document.querySelector("#gl-canvas");
const gl = canvas.getContext("webgl2");
if (!gl) { 
  alert("Unable to initialise WebGL"); 
}
gl.getExtension('EXT_color_buffer_float');
gl.getExtension('EXT_float_blend');
gl.getExtension('OES_texture_float_linear');

function main(image) {
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;
  console.log("image dimensions", image.naturalWidth, "x", image.naturalHeight);

  console.log("creating set edges program");
  const setEdgesProgram = createProgram(gl, SET_EDGES_VS, FS, ["newX0", "newX1"]);
  const setEdgesLocations = createLocations(gl, setEdgesProgram, 
    ["prevX1", "y"], 
    ["image", "textureWidth", "threshold", "mode"]);

  console.log("creating set colour program");
  const setColourProgram = createProgram(gl, SET_COLOUR_VS, FS, ["colour"]);
  const setColourLocations = createLocations(gl, setColourProgram, 
    ["x0", "x1", "y"], 
    ["textureWidth", "image"]);

  console.log("creating compile coords program");
  const compileCoordsProgram = createProgram(gl, COMPILE_COORDS_VS, FS, ["v_x0", "v_y0", "v_x1", "v_y1"], gl.INTERLEAVED_ATTRIBS);
  const compileCoordsLocations = createLocations(gl, compileCoordsProgram, ["x0", "x1", "y"], []);

  console.log("creating duplicate colours program");
  const duplicateColourBufferProgram = createProgram(gl, DUPLICATE_COLOUR_BUFFER_VS, FS, ["v_colour", "v_copy"], gl.INTERLEAVED_ATTRIBS);
  const duplicateColourBufferLocations = createLocations(gl, duplicateColourBufferProgram, ["colour"], []);

  console.log("creating shade range program");
  const shadeRangeProgram = createProgram(gl, SHADE_RANGE_VS, SHADE_RANGE_FS);
  const shadeRangeLocations = createLocations(gl, shadeRangeProgram, 
    ["position", "colour"], 
    ["textureDimensions"]);

  console.log("creating display program");
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  const displayLocations = createLocations(gl, displayProgram, ["position"], ["image"]);
  
  const n = image.naturalHeight;
  const imageWidth = image.naturalWidth;

  const imageTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  const x0Buffer = gl.createBuffer();
  setupBuffer(gl, x0Buffer, n * 4, gl.DYNAMIC_DRAW);

  const x1Buffers = [gl.createBuffer(), gl.createBuffer()];
  const initialX = new Array(n).fill(-1);
  setupBuffer(gl, x1Buffers[0], new Float32Array(initialX), gl.DYNAMIC_DRAW);
  setupBuffer(gl, x1Buffers[1], n * 4, gl.DYNAMIC_DRAW);

  const yBuffer = gl.createBuffer();
  const yCoords = new Array(n).fill(0).map((n, i) => i);
  setupBuffer(gl, yBuffer, new Float32Array(yCoords), gl.DYNAMIC_DRAW);

  // set edges buffer arrays
  const setEdgesVertexArrayA = makeVertexArray(gl, [
    [x1Buffers[0], setEdgesLocations.prevX1, 1, gl.FLOAT], 
    [yBuffer, setEdgesLocations.y, 1, gl.FLOAT], 
  ]);
  const setEdgesVertexArrayB = makeVertexArray(gl, [
    [x1Buffers[1], setEdgesLocations.prevX1, 1, gl.FLOAT], 
    [yBuffer, setEdgesLocations.y, 1, gl.FLOAT], 
  ]);
  const setEdgesVertexArrays = [setEdgesVertexArrayA, setEdgesVertexArrayB];

  const setEdgesTransformFeedbackA = makeTransformFeedback(gl, [x0Buffer, x1Buffers[1]]);
  const setEdgesTransformFeedbackB = makeTransformFeedback(gl, [x0Buffer, x1Buffers[0]]);
  const setEdgesTransformFeedbacks = [setEdgesTransformFeedbackA, setEdgesTransformFeedbackB];

  // set colour buffer arrays
  const setColourVertexArrayA = makeVertexArray(gl, [
    [x0Buffer, setColourLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[1], setColourLocations.x1, 1, gl.FLOAT], 
    [yBuffer, setColourLocations.y, 1, gl.FLOAT], 
  ]);
  const setColourVertexArrayB = makeVertexArray(gl, [
    [x0Buffer, setColourLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[0], setColourLocations.x1, 1, gl.FLOAT], 
    [yBuffer, setColourLocations.y, 1, gl.FLOAT], 
  ]);
  const setColourVertexArrays = [setColourVertexArrayA, setColourVertexArrayB];

  const colourBuffer = makeBuffer(gl, n * 4 * 4, gl.DYNAMIC_DRAW);
  const setColourTransformFeedback = makeTransformFeedback(gl, [colourBuffer]);

  // 
  const texture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.naturalWidth, image.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const framebuffer = createFramebuffer(gl, texture);

  const positionBuffer = makeBuffer(gl, n * 2 * 2 * 4, gl.DYNAMIC_DRAW);
  const compileCoordsVertexArrayA = makeVertexArray(gl, [
    [x0Buffer, compileCoordsLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[1], compileCoordsLocations.x1, 1, gl.FLOAT], 
    [yBuffer, compileCoordsLocations.y, 1, gl.FLOAT], 
  ]);
  const compileCoordsVertexArrayB = makeVertexArray(gl, [
    [x0Buffer, compileCoordsLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[0], compileCoordsLocations.x1, 1, gl.FLOAT], 
    [yBuffer, compileCoordsLocations.y, 1, gl.FLOAT], 
  ]);
  const compileCoordsVertexArrays = [compileCoordsVertexArrayA, compileCoordsVertexArrayB];
  const compileCoordsTransformFeedback = makeTransformFeedback(gl, [positionBuffer]);
  
  const duplicateColourBuffer = makeBuffer(gl, n * 4 * 2 * 4, gl.DYNAMIC_DRAW);
  const duplicateColourBufferVertexArray = makeVertexArray(gl, [[colourBuffer, duplicateColourBufferProgram.colour, 4, gl.FLOAT]]);
  const duplicateColourBufferTransformFeedback = makeTransformFeedback(gl, [duplicateColourBuffer]);

  // shade range buffer arrays
  const shadeRangeVertexArray = makeVertexArray(gl, [
    [positionBuffer, shadeRangeLocations.position, 2, gl.FLOAT], 
    [duplicateColourBuffer, shadeRangeLocations.colour, 4, gl.FLOAT], 
  ]);

  const displayVertexBuffer = makeBuffer(gl, new Float32Array([
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1, 
  ]), gl.STATIC_DRAW);
  const displayVertexArray = makeVertexArray(gl, [[displayVertexBuffer, displayLocations.position, 2, gl.FLOAT]]);

  const LOCAL = 0;
  const AGGREGATE = 1;
  function step(step, threshold) {
    console.log("step()");
    gl.enable(gl.RASTERIZER_DISCARD);
    
    // set edges
    gl.useProgram(setEdgesProgram);
    gl.bindVertexArray(setEdgesVertexArrays[step % 2]);
    bindTextureToLocation(gl, setEdgesLocations.image, 0, imageTexture);
    gl.uniform1f(setEdgesLocations.textureWidth, imageWidth);
    gl.uniform1f(setEdgesLocations.threshold, threshold);
    gl.uniform1i(setEdgesLocations.mode, mode);
    drawWithTransformFeedback(gl, setEdgesTransformFeedbacks[step % 2], gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // set colours;
    gl.useProgram(setColourProgram);
    gl.bindVertexArray(setColourVertexArrays[step % 2]);
    gl.uniform1f(setColourLocations.textureWidth, imageWidth);
    bindTextureToLocation(gl, setColourLocations.image, 0, imageTexture);
    drawWithTransformFeedback(gl, setColourTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    // setup shade range buffers
    gl.useProgram(compileCoordsProgram);
    gl.bindVertexArray(compileCoordsVertexArrays[step % 2]);
    drawWithTransformFeedback(gl, compileCoordsTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });

    gl.useProgram(duplicateColourBufferProgram);
    gl.bindVertexArray(duplicateColourBufferVertexArray);
    drawWithTransformFeedback(gl, duplicateColourBufferTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    
    gl.disable(gl.RASTERIZER_DISCARD);

    // shade range
    gl.useProgram(shadeRangeProgram);
    setFramebuffer(gl, framebuffer, image.naturalWidth, image.naturalHeight);
    gl.bindVertexArray(shadeRangeVertexArray);
    gl.uniform2f(shadeRangeLocations.textureDimensions, image.naturalWidth, image.naturalHeight);
    gl.drawArrays(gl.LINES, 0, n * 2);
  }

  function display(print = false) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let imageAspect = image.naturalWidth / image.naturalHeight;
      let correctionFactor = clientAspect / imageAspect;
      if (clientAspect < imageAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(displayProgram);
    gl.bindVertexArray(displayVertexArray);
    bindTextureToLocation(gl, displayLocations.image, 0, texture);
    drawTexture(gl, null, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }

  function printBuffer(buffer, size, label) {
    let results = new Float32Array(n * size);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, results);
    console.log(label + ":", results);
  }

  let threshold = 0.2;
  let mode = AGGREGATE;

  let x0 = new Float32Array(n);
  function checkComplete() {
    gl.bindBuffer(gl.ARRAY_BUFFER, x0Buffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, x0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    complete = true;
    for (let n of x0) {
      if (n != image.naturalWidth) {
        return false;
      }
    }
    return true;
  }

  function full() {
    console.log("full() threshold =", threshold);
    setupBuffer(gl, x1Buffers[0], new Float32Array(initialX), gl.DYNAMIC_DRAW);
    for (let s = 0; s < image.naturalWidth; s++) {
      step(s, threshold);
      if (checkComplete()) {
        console.log("shading complete");
        break;
      }
    }
    display();
  }

  full();

  const thresholdInput = document.getElementById("threshold");
  thresholdInput.value = threshold;
  thresholdInput.oninput = () => {
    threshold = parseFloat(thresholdInput.value);
  };

  const modeToggle = document.getElementById("mode");
  modeToggle.onclick = () => {
    mode = mode == LOCAL ? AGGREGATE : LOCAL;
    modeToggle.textContent = "Mode: " + (mode == LOCAL ? "local" : "aggregate");
    full();
  };

  const renderButton = document.getElementById("render");
  renderButton.onclick = () => {
    console.log("renderButton.onclick()");
    full();
  };

  document.onkeydown = (event) => {
    if (event.key == "Shift") {
      thresholdInput.step = 0.01;
    }
  };

  document.onkeyup = (event) => {
    if (event.key == "Shift") {
      thresholdInput.step = 0.05;
    }
  };

  const downloadAnchor = document.getElementById("download");
  const nameInput = document.getElementById("name");
  function screenshot() {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    display(true);
    let url = canvas.toDataURL();
    downloadAnchor.href = url;
    downloadAnchor.download = "edgedetect_" + [image.naturalWidth, image.naturalHeight].join('x') + "_" + threshold + "_" + ["local", "aggregate"][mode] + "_" + nameInput.value + ".png";
    downloadAnchor.click();
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    display();
  }

  document.getElementById("screenshot").addEventListener('click', screenshot);

  document.defaultView.onresize = () => {
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    display(false);
  };
}

const image = new Image();
const file = document.getElementById("image-upload").files[0];
const reader = new FileReader();
reader.addEventListener("load", () => {
  image.src = reader.result;
}, false);

function loadImage() {
  const file = document.getElementById("image-upload").files[0];
  if (file) {
    reader.readAsDataURL(file);
    image.onload = () => main(image);
    console.log("loadImage() image at", image.src);
  }
}

if (file) {
  loadImage();
}

